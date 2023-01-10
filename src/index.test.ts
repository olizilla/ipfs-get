import test from 'ava'
import path from 'path'
import { createReadStream, ReadStream } from 'fs'
import fs from 'fs/promises'
import { extractCar } from './index.js'
import { CarReader } from '@ipld/car/reader'
import { importer } from 'ipfs-unixfs-importer'
import { CID } from 'multiformats/cid'

test('extract single raw unix-fs block', async (t) => {
  // echo '🚘' | ipfs add --cid-version 1
  const cid = 'bafkreigk2mcysiwgmacvilb3q6lcdaq53zlwu3jn4pj6qev2lylyfbqfdm'
  // ipfs dag export bafkreigk2mcysiwgmacvilb3q6lcdaq53zlwu3jn4pj6qev2lylyfbqfdm > test/raw.car
  const testCarFile = createReadStream('test/raw.car')
  const carReader = await CarReader.fromIterable(testCarFile)
  // const carReader = await CarIndexedReader.fromFile(testCar) as unknown as CarReader
  const { blockCount, filename } = await extractCar({ cid, carReader })
  t.is(blockCount, 1)
  t.is(filename, cid)

  const file = await fs.readFile(cid, { encoding: 'utf8' })
  t.is(file, '🚘\n')

  // tidy up the file we wrote.
  await fs.unlink(cid)
})

test('extract single dag-pb unix-fs block', async (t) => {
  // echo '🚘' | ipfs add
  const cid = 'QmNgtkwDXAzHWrJYZaJh3wmSU6tHbLy9Q7SyBCuauMN7eu'
  // ipfs dag export QmNgtkwDXAzHWrJYZaJh3wmSU6tHbLy9Q7SyBCuauMN7eu > test/old.car
  const testCarFile = createReadStream('test/old.car')
  const carReader = await CarReader.fromIterable(testCarFile)
  const { blockCount, filename } = await extractCar({ cid, carReader })
  t.is(blockCount, 1)
  t.is(filename, cid)

  const file = await fs.readFile(cid, { encoding: 'utf8' })
  t.is(file, '🚘\n')

  // tidy up the file we wrote.
  await fs.unlink(cid)
})

test('extract single raw unix-fs block to chosen filename', async (t) => {
  const output = 'car.txt'
  // echo '🚘' | ipfs add --cid-version 1
  const cid = 'bafkreigk2mcysiwgmacvilb3q6lcdaq53zlwu3jn4pj6qev2lylyfbqfdm'
  // ipfs dag export bafkreigk2mcysiwgmacvilb3q6lcdaq53zlwu3jn4pj6qev2lylyfbqfdm > test/raw.car
  const testCarFile = createReadStream('test/raw.car')
  const carReader = await CarReader.fromIterable(testCarFile)
  const { blockCount, filename } = await extractCar({ cid, carReader, output })
  t.is(blockCount, 1)
  t.is(filename, output)

  const file = await fs.readFile(output, { encoding: 'utf8' })
  t.is(file, '🚘\n')

  // tidy up the file we wrote.
  await fs.unlink(output)
})

test('extract unix-fs dir to chosen filename', async (t) => {
  const output = 'pics'
  // ipfs-car --list-roots ./test/fixtures/dir.car
  const cid = 'bafybeidd2gyhagleh47qeg77xqndy2qy3yzn4vkxmk775bg2t5lpuy7pcu'
  const testCarFile = await createReadStream('test/dir.car')
  const carReader = await CarReader.fromIterable(testCarFile)
  const { blockCount, filename } = await extractCar({ cid, carReader, output })
  t.is(blockCount, 6)
  t.is(filename, output)

  const fileNames = await fs.readdir(output)
  fileNames.sort()
  t.is(fileNames[0], 'dr-is-tired.jpg')
  t.is(fileNames[1], 'not-distributed.jpg')
  t.is(fileNames[2], 'youareanonsense.jpg')

  const fileEntries = fileNames.map((name) => ({
    path: `${name}`,
    content: createReadStream(path.join(output, name)),
  }))
  const rehash = await ipfsHash(fileEntries)
  t.is(rehash, cid, 'it round trips!')

  // tidy up the file we wrote.
  await fs.rm(output, { recursive: true })
})

// extrapolated from https://github.com/alanshaw/ipfs-only-hash
// Just enough code to calculate the IPFS hash for some data
async function ipfsHash(fileEntries: { path: string; content: ReadStream }[]) {
  const options = {
    onlyHash: true, // means it won't try and store the chunk in the blockService
    rawLeaves: true,
    cidVersion: 1,
    wrapWithDirectory: true,
  }
  const noBlockService = {
    get: async (cid: CID) => {
      throw new Error(`unexpected block API get for ${cid}`)
    },
    put: async () => {
      throw new Error('unexpected block API put')
    },
    open: async () => {
      throw new Error('unexpected block API open')
    },
    close: async () => {
      throw new Error('unexpected block API close')
    },
    has: async () => {
      throw new Error('unexpected block API has')
    },
    delete: async () => {
      throw new Error('unexpected block API delete')
    },
    putMany: async () => {
      throw new Error('unexpected block API putMany')
    },
    getMany: async () => {
      throw new Error('unexpected block API getMany')
    },
    deleteMany: async () => {
      throw new Error('unexpected block API deleteMany')
    },
    batch: async () => {
      throw new Error('unexpected block API batch')
    },
    query: async () => {
      throw new Error('unexpected block API query')
    },
    queryKeys: async () => {
      throw new Error('unexpected block API querykeys')
    },
  }
  let lastCid
  // @ts-ignore
  for await (const { cid } of importer(fileEntries, noBlockService, options)) {
    lastCid = cid
  }
  return lastCid?.toString()
}
