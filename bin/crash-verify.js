#!/usr/bin/env node
// npx crash-verify --server-seed … --client-seed … --nonce … [--edge 1] [--preset generic|bustabit] [--json]
import { parseArgs } from 'node:util';
import { verify } from '../src/index.js';

const { values: v } = parseArgs({
  options: {
    'server-seed': { type: 'string' }, 'client-seed': { type: 'string', default: '' }, nonce: { type: 'string', default: '0' },
    edge: { type: 'string', default: '1' }, preset: { type: 'string', default: 'generic' }, json: { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
  },
});
if (v.help || !v['server-seed']) {
  console.log(`Usage: crash-verify --server-seed <seed> --client-seed <seed> --nonce <n> [--edge <percent, default 1>] [--preset generic|bustabit] [--json]
Live tool: https://crashgameguide.com/tools/provably-fair-verifier/`);
  process.exit(v.help ? 0 : 1);
}
try {
  const r = await verify({ serverSeed: v['server-seed'], clientSeed: v['client-seed'], nonce: Number(v.nonce), edge: Number(v.edge) / 100, preset: v.preset });
  if (v.json) console.log(JSON.stringify(r));
  else console.log(`preset           ${r.preset}\nserver seed hash ${r.serverSeedHash}\nhmac-sha256      ${r.hmac}\ncrash point      ${r.crash.toFixed(2)}x`);
} catch (e) {
  console.error(`crash-verify: ${e.message}`);
  process.exit(1);
}
