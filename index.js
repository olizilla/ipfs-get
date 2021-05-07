#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import meow from 'meow'
import fetch from 'isomorphic-unfetch'
import { bytes, CID } from 'multiformats'
import * as dagPb from '@ipld/dag-pb'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import { CarReader } from '@ipld/car'
import exporter from 'ipfs-unixfs-exporter'
import toIterable from 'stream-to-it'
import { pipe } from 'it-pipe'
import { map } from 'streaming-iterables'

const { toHex } = bytes

const codecs = {
  [dagPb.code]: dagPb,
  [raw.code]: raw
}

const hashes = {
  [sha256.code]: sha256
}

const options = {
  importMeta: import.meta,
  flags: {
    gateway: {
      type: 'string',
      alias: 'g',
      default: 'http://127.0.0.1:5001'
    }
  }
}

const cli = meow(`
  Usage
  $ ipfs-get <cid>
`, options)

ipfsGet({cid: cli.input[0], gateway: new URL(cli.flags.gateway)})

async function ipfsGet ({cid, gateway}) {
  console.log(`📡 Fetching .car file from ${gateway}`)
  const carStream = await fetchCar(cid, gateway)
  const carReader = await CarReader.fromIterable(carStream)

  let count = 0
  const verifyingIpldAdaptor = {
    get: async (cid) => {
      const res = await carReader.get(cid)
      if (!isValid(res)) {
        throw new Error(`Bad block. Hash does not match CID ${cid}`)
      }
      const obj = decode(res)
      count++
      return obj
    }
  }

  await extractCar({cid, ipld: verifyingIpldAdaptor, output: process.cwd()})
  console.log(`🔐 Verified ${count}/${count} block${count === 1 ? '': 's'}`)
  console.log(`✅ Wrote ${cid}`)
}

async function extractCar ({cid, ipld, output}) {
  // magic extracted from js-ipfs:
  // https://github.com/ipfs/js-ipfs/blob/46618c795bf5363ba3186645640fb81349231db7/packages/ipfs-core/src/components/get.js#L20
  // https://github.com/ipfs/js-ipfs/blob/46618c795bf5363ba3186645640fb81349231db7/packages/ipfs-cli/src/commands/get.js#L56-L66
  for await (const file of exporter.recursive(cid, ipld, { /* options */ })) {
    const fullFilePath = path.join(output, file.path)
    if (file.type === 'file' || file.type === 'raw') {
      await fs.promises.mkdir(path.join(output, path.dirname(file.path)), { recursive: true })
      await pipe(
        file.content,
        toIterable.sink(fs.createWriteStream(fullFilePath))
      )
    } else {
      // this is a dir
      await fs.promises.mkdir(fullFilePath, { recursive: true })
    }
  } 
}

async function fetchCar (cid, gateway) {
  const url = `${gateway}api/v0/dag/export?arg=${cid}`
  const res = await fetch(url, { method: 'POST'})
  if (res.status > 400) {
    throw new Error(`${res.status} ${res.statusText} ${url}`)
  }
  return res.body
}

async function isValid ({cid, bytes}) {
  const hashfn = hashes[cid.multihash.code]
  if (!hashfn) {
    throw new Error(`Missing hash function for ${cid.multihash.code}`)
  }
  const hash = await hashfn.digest(bytes)
  return toHex(hash.digest) === toHex(cid.multihash.digest)
}

async function decode ({cid, bytes}) {
  const codec = codecs[cid.code]
  if (!codec) {
    throw new Error(`Missing codec for ${cid.code}`)
  }
  return codec.decode(bytes)
}