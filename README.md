# ipfs-get 📡✨⬢

> Get and verify a file by CID from an IPFS gateway over http.

```console
$ ipfs-get bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy
📡 Fetching .car file from https://ipfs.io
🔐 Verified 3/3 blocks
✅ Wrote ./bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy
```

A thin wrapper over [@ipld/car](https://github.com/ipld/js-car) and [unix-fs-exporter](https://github.com/ipfs/js-ipfs-unixfs/tree/master/packages/ipfs-unixfs-exporter). It fetches the data by from the IPFS gateway api as a .car file, extacts the cids and blocks, verifying them as it goes, and writes the reassembled data to disk.

⚠️ **This is a proof-of-concept and should not be consumed without consulting your doctor first.**

## How

- Fetch a .car file for the root CID from `/api/v0/dag/export`.
  - this could fail if the full dag is unavailable. it's ok.
- Index the cid and block postions in the car file
- Start at the root as defined by the car file header
  - ? verify it matches the cid the user provided
- verify each block by rehashing the data as you pull it from the car as per https://github.com/ipld/js-car/blob/master/examples/verify-car.js
- re-assemble the blocks into the thing and write it to disk.

## Limitations

Lot's! But only while we get a first pass working.

- only dag-pb unixfs for now. cbor/json next.
- node / cli only. browser next.
