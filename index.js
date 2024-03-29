import fs from 'fs'
import path from 'path'
import fetch from 'isomorphic-unfetch'
import { bytes } from 'multiformats'
import { sha256 } from 'multiformats/hashes/sha2'
import { CarReader } from '@ipld/car'
import { recursive } from 'ipfs-unixfs-exporter'
import toIterable from 'stream-to-it'
import { pipe } from 'it-pipe'

const { toHex } = bytes

const hashes = {
  [sha256.code]: sha256
}

export async function ipfsGet ({ ipfsPath, gateway, output, quiet }) {
  console.log = quiet ? () => {} : console.log
  const gatewayUrl = toUrl(gateway)
  let cid = ipfsPath
  if (ipfsPath.startsWith('/ipfs/')) {
    cid = ipfsPath.substring('/ipfs/'.length)
  }
  if (cid.match('/')) {
    // looks pathish, i.e CID/path! resolve to get the CID for the file in the path
    console.log(`📡 Resolving CID from ${gatewayUrl}`)
    cid = await resolveIpfsAddress(ipfsPath, gatewayUrl)
    console.log(`🎯 ${cid}`)
    // use the last chunk of the path as the output if not set
    output = output || path.basename(ipfsPath)
  }
  console.log(`📡 Fetching .car file from ${gatewayUrl}`)
  const carStream = await fetchCar(cid, gatewayUrl)
  const carReader = await CarReader.fromIterable(carStream)
  const { blockCount, filename } = await extractCar({ cid, carReader, output })
  console.log(`🔐 Verified ${blockCount}/${blockCount} block${blockCount === 1 ? '' : 's'}`)
  console.log(`✅ Wrote ${filename}`)
}

export async function extractCar ({ cid, carReader, output }) {
  let blockCount = 0
  const verifyingBlockService = {
    get: async (cid) => {
      const res = await carReader.get(cid)
      if (!isValid(res)) {
        throw new Error(`Bad block. Hash does not match CID ${cid}`)
      }
      blockCount++
      return res.bytes
    },
  }
  // magic extracted from js-ipfs:
  // https://github.com/ipfs/js-ipfs/blob/46618c795bf5363ba3186645640fb81349231db7/packages/ipfs-core/src/components/get.js#L20
  // https://github.com/ipfs/js-ipfs/blob/46618c795bf5363ba3186645640fb81349231db7/packages/ipfs-cli/src/commands/get.js#L56-L66
  for await (const file of recursive(cid, verifyingBlockService, { /* options */ })) {
    let filePath = file.path
    // output overrides the first part of the path.
    if (output) {
      const parts = file.path.split('/')
      parts[0] = output
      filePath = parts.join('/')
    }

    if (file.type === 'directory') {
      await fs.promises.mkdir(filePath, { recursive: true })
    } else {
      await pipe(
        file.content,
        toIterable.sink(fs.createWriteStream(filePath))
      )
    }
  }

  return { blockCount, filename: output || cid }
}

async function fetchCar(cid, gateway) {
  const url = `${gateway}/ipfs/${cid}`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.ipld.car',
    },
  })
  if (res.status > 400) {
    throw new Error(`${res.status} ${res.statusText} ${url}`)
  }
  return res.body
}

async function resolveIpfsAddress (ipfsPath, gateway) {
  // $ curl -X POST "http://127.0.0.1:5001/api/v0/resolve?arg=bafybeidd2gyhagleh47qeg77xqndy2qy3yzn4vkxmk775bg2t5lpuy7pcu/dr-is-tired.jpg"                                     11:45:26
  // {"Path":"/ipfs/bafkreiabltrd5zm73pvi7plq25pef3hm7jxhbi3kv4hapegrkfpkqtkbme"}
  const url = `${gateway}api/v0/resolve?arg=${ipfsPath}`
  const res = await fetch(url, { method: 'POST' })
  if (res.status > 400) {
    throw new Error(`${res.status} ${res.statusText} ${url}`)
  }
  const body = await res.json()
  if (!body.Path) {
    throw new Error(`Unexpected response from resolve ${JSON.stringify(body)}`)
  }
  if (!body.Path.startsWith('/ipfs/')) {
    throw new Error(`Expected ${ipfsPath} to resolve to a CID but found ${body.Path}`)
  }
  return body.Path.substring('/ipfs/'.length)
}

async function isValid ({ cid, bytes }) {
  const hashfn = hashes[cid.multihash.code]
  if (!hashfn) {
    throw new Error(`Missing hash function for ${cid.multihash.code}`)
  }
  const hash = await hashfn.digest(bytes)
  return toHex(hash.digest) === toHex(cid.multihash.digest)
}

function toUrl (str) {
  if (!str.match('://')) {
    const scheme = ['localhost', '127.0.0.1'].includes(str) ? 'http' : 'https'
    return toUrl(`${scheme}://${str}`)
  }
  return new URL(str)
}
