# ipfs-get 📡✨⬢

> Get and verify a file by CID from an IPFS gateway over http.

```console
$ ipfs-get bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy
📡 Fetching .car file from https://ipfs.io
🔐 Verified 3/3 blocks
✅ Wrote ./bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy
```

A thin wrapper over [@ipld/car](https://github.com/ipld/js-car) and [unix-fs-exporter](https://github.com/ipfs/js-ipfs-unixfs/tree/master/packages/ipfs-unixfs-exporter). It fetches the content by CID over HTTP from the IPFS gateway as a Content-addressed Archive (CAR), extacts the cids and blocks, verifying them as it goes, and writes the files to disk.

In [go-ipfs v0.9.0](https://github.com/ipfs/go-ipfs/issues/8058), the `/api/v0/dag/export` endpoint is available to the public gateway api, allowing us to fetch content as CAR file.

Before that API was available folks just did an http get to /ipfs/<CID>, and either trusted the gateway, or optimistically tried to re-add the response to a local ipfs node to check it hashed to the same CID, which is error prone; if any non-default flags were used when adding the content, then the CID you get when adding locally would not match unless you knew ahead of time to use the same flags. By using car files, the CIDs for the blocks travel with the data, so `ipfs-get` is able to verify them, regardless of how the DAG was created (_well, it only supports sha256 verification currently, for dag-pb and dag-cbor, but that covers the vast majority of existing DAGs created via IPFS._)

## Usage

Install `ipfs-get` globally with `npm i -g ipfs-get` or run it via npx `npx ipfs-get <cid>`

```sh
# fetch and verify a file by cid from you local gateway
ipfs-get bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy

# try it out with a local gateway (using go-ipfs v0.9.0)
ipfs-get bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy --gateway http://127.0.0.1:5001

# pick the output filename
ipfs-get bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy --output room-guardian.jpg
```

## How

- Fetch a .car file for the root CID from `/api/v0/dag/export`. This could fail if the full dag is unavailable. it's ok.
- Index the cid and block postions in the car file
- Start at the root as defined by the car file header
- Verify each block by hashing the block as you pull it from the car, and compare the hash with the CID. Fail if not matched.
- Assemble the blocks into the files and write it to disk.
