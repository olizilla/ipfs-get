#!/usr/bin/env node
import meow from 'meow'
import { ipfsGet } from './index.js'

const options = {
  importMeta: import.meta,
  flags: {
    gateway: {
      type: 'string',
      alias: 'g',
      default: 'http://127.0.0.1:5001'
    },
    output: {
      type: 'string',
      alias: 'o'
    }
  }
}

const cli = meow(`
  Usage
  $ ipfs-get <cid>
`, options)

ipfsGet({
  cid: cli.input[0],
  gateway: new URL(cli.flags.gateway),
  output: cli.flags.output
})
