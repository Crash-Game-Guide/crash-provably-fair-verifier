# crash-provably-fair-verifier

[![test](https://github.com/tomer-rizz-gaming/crash-provably-fair-verifier/actions/workflows/test.yml/badge.svg)](https://github.com/tomer-rizz-gaming/crash-provably-fair-verifier/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
![dependencies: 0](https://img.shields.io/badge/dependencies-0-brightgreen.svg)
[![demo](https://img.shields.io/badge/demo-GitHub%20Pages-blue.svg)](https://tomer-rizz-gaming.github.io/crash-provably-fair-verifier/)

**Live tool: https://crashgameguide.com/tools/provably-fair-verifier/** · Demo: https://tomer-rizz-gaming.github.io/crash-provably-fair-verifier/
Maintained by [Crash Game Guide](https://crashgameguide.com).

Check a crash game round yourself: give it the server seed, client seed and nonce, and it recomputes the HMAC-SHA256 hash and the crash point. Zero dependencies, runs in the browser (Web Crypto) and in Node 18+ (Web Crypto, with `node:crypto` as fallback).

## What "provably fair" means

Before a round, the casino commits to a secret **server seed** by showing you its SHA-256 hash. You add a **client seed**, and each bet has a **nonce** (a counter). The crash point is derived from `HMAC-SHA256(serverSeed, clientSeed:nonce)`. Once the casino reveals the server seed, anyone can check that (1) it hashes to the commitment you saw, and (2) it produces the crash point you got. The casino cannot change the result after you bet without the hash failing to match.

Full explainer: [Provably fair explained](https://crashgameguide.com/guides/provably-fair/).

## Usage

### CLI

```bash
npx crash-verify --server-seed <seed> --client-seed <seed> --nonce 1
npx crash-verify --server-seed <seed> --client-seed <seed> --nonce 1 --edge 3 --json
npx crash-verify --preset bustabit --server-seed <64-hex game hash>
```

Until the package is on npm, run it straight from GitHub with `npx github:tomer-rizz-gaming/crash-provably-fair-verifier --server-seed … --client-seed … --nonce 1`, or from a clone with `node bin/crash-verify.js …`.

### Library

```js
import { verify } from 'crash-provably-fair-verifier';

const r = await verify({ serverSeed: 'b6a3…', clientSeed: 'my-lucky-seed', nonce: 1, edge: 0.01 });
// { preset: 'generic', serverSeedHash: '…', hmac: '…', crash: 1.87 }
```

Lower-level helpers: `hmacSha256`, `sha256`, `uniform52`, `crashPoint(hex, edge)`, `bustabitBust(hex)`, `PRESETS`.

## Modes and presets

Every operator derives crash points a little differently. We only ship a preset when the operator **publishes** its algorithm, with a link to that documentation.

| Preset | Algorithm | Source |
|---|---|---|
| `generic` | key = server seed, message = `clientSeed:nonce`, first 52 bits → `max(1, floor(100(1 − edge) / (1 − U)) / 100)` | standard crash distribution |
| `bustabit` | key = published game salt (text), message = game hash (bytes), `max(1, floor(99 / (1 − X)) / 100)` | [bustabit/verifier](https://github.com/bustabit/verifier) · [seeding event](https://bitcointalk.org/index.php?topic=5560454) |

If your game isn't listed, `generic` shows the hash; compare it with the operator's own verification page. Want a preset added? See [CONTRIBUTING.md](CONTRIBUTING.md).

## Tests

```bash
npm test
```

Covers RFC 4231 HMAC-SHA256 vectors, the FIPS 180-2 SHA-256 vector, exact crash-formula edge cases, the Bustabit preset against `node:crypto`, the empirical P(≥ 2x) and the CLI.

## License

MIT © Crash Game Guide. Play responsibly, 18+.
