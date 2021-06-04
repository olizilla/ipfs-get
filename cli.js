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
    },
    quiet: {
      type: 'boolean',
      alias: 'q'
    }
  }
}

const cli = meow(`
Usage
  $ ipfs-get <cid> [--gateway https://ipfs.io] [--output <path>]
Example
  $ ipfs-get bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy --output guardian.jpg
Options
  --gateway <URL> the ipfs gateway to fetch the cid from as a CAR
  --output <path> where to write the output to
  --quiet say nothing
`, options)

if (!cli.input[0]) {
  cli.showHelp()
}

ipfsGet({
  ipfsPath: cli.input[0],
  ...cli.flags
})
