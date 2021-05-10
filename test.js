import fs from 'fs/promises'
import test from 'ava'
import { extractCar } from './index.js'
import CarIndexedReader from '@ipld/car/indexed-reader'

test('extract single raw unixfs block', async t => {
  // echo '🚘' | ipfs add --cid-version 1
  const cid = 'bafkreigk2mcysiwgmacvilb3q6lcdaq53zlwu3jn4pj6qev2lylyfbqfdm'
  // ipfs dag export bafkreigk2mcysiwgmacvilb3q6lcdaq53zlwu3jn4pj6qev2lylyfbqfdm > test/raw.car
  const testCar = 'test/raw.car'
  const carReader = await CarIndexedReader.fromFile(testCar)
  const { blockCount, filename } = await extractCar({ cid, carReader })
  t.is(blockCount, 1)
  t.is(filename, cid)

  const file = await fs.readFile(cid, { encoding: 'utf8' })
  t.is(file, '🚘\n')

  // tidy up the file we wrote.
  await fs.unlink(cid)
})

test('extract single old unixfs block', async t => {
  // echo '🚘' | ipfs add
  const cid = 'QmNgtkwDXAzHWrJYZaJh3wmSU6tHbLy9Q7SyBCuauMN7eu'
  // ipfs dag export QmNgtkwDXAzHWrJYZaJh3wmSU6tHbLy9Q7SyBCuauMN7eu > test/old.car
  const testCar = 'test/old.car'
  const carReader = await CarIndexedReader.fromFile(testCar)
  const { blockCount, filename } = await extractCar({ cid, carReader })
  t.is(blockCount, 1)
  t.is(filename, cid)

  const file = await fs.readFile(cid, { encoding: 'utf8' })
  t.is(file, '🚘\n')

  // tidy up the file we wrote.
  await fs.unlink(cid)
})

test('extract single raw unixfs block to chosen filename', async t => {
  const output = 'car.txt'
  // echo '🚘' | ipfs add --cid-version 1
  const cid = 'bafkreigk2mcysiwgmacvilb3q6lcdaq53zlwu3jn4pj6qev2lylyfbqfdm'
  // ipfs dag export bafkreigk2mcysiwgmacvilb3q6lcdaq53zlwu3jn4pj6qev2lylyfbqfdm > test/raw.car
  const testCar = 'test/raw.car'
  const carReader = await CarIndexedReader.fromFile(testCar)
  const { blockCount, filename } = await extractCar({ cid, carReader, output })
  t.is(blockCount, 1)
  t.is(filename, output)

  const file = await fs.readFile(output, { encoding: 'utf8' })
  t.is(file, '🚘\n')

  // tidy up the file we wrote.
  await fs.unlink(output)
})
