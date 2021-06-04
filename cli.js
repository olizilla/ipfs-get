#!/usr/bin/env node
import meow from 'meow'
import { ipfsGet } from './index.js'

const options = {
  importMeta: import.meta,
  flags: {
    gateway: {
      type: 'string',
      alias: 'g',
      default: 'https://ipfs.io'
    },
    output: {
      type: 'string',
      alias: 'o'
    }
  }
}

const cli = meow(`
Usage
  $ ipfs-get <cid> [--gateway https://ipfs.io] [--output <path>]
Example
  $ ipfs-get bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy --output guardian.jpg
Options
  --gateway <URL> the ipfs gateway to fetch the cid from as a CAR.
  --output <path> where to write the output to
`, options)

if (!cli.input[0]) {
  cli.showHelp()
}

ipfsGet({
  cid: cli.input[0],
  gateway: cli.flags.gateway,
  output: cli.flags.output
})
