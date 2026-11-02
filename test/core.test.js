import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { hmacSha256, sha256, crashPoint, bustabitBust, uniform52, verify, fromHex, PRESETS } from '../src/index.js';

// RFC 4231 (HMAC-SHA256 published test vectors), cases 1, 2 and 6.
test('RFC 4231 HMAC-SHA256 vectors', async () => {
  assert.equal(await hmacSha256(fromHex('0b'.repeat(20)), 'Hi There'), 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7');
  assert.equal(await hmacSha256('Jefe', 'what do ya want for nothing?'), '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
  assert.equal(await hmacSha256(fromHex('aa'.repeat(131)), 'Test Using Larger Than Block-Size Key - Hash Key First'), '60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54');
});

// FIPS 180-2 SHA-256 vector.
test('SHA-256 "abc"', async () => {
  assert.equal(await sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('crash distribution edges', () => {
  assert.equal(uniform52('0000000000000'), 0);
  assert.equal(crashPoint('0000000000000', 0.01), 1); // floor(99) / 100 → max(1, 0.99) = 1.00x instant crash
  assert.equal(crashPoint('8000000000000', 0.01), 1.98); // U = 0.5 → 99 / 0.5 = 198
  assert.equal(bustabitBust('8000000000000'), 1.98);
  assert.equal(crashPoint('c000000000000', 0.03), 3.88); // U = 0.75 → 97 / 0.25 = 388
});

test('generic verify matches node:crypto', async () => {
  const r = await verify({ serverSeed: 'server', clientSeed: 'client', nonce: 7, edge: 0.01 });
  const h = createHmac('sha256', 'server').update('client:7').digest('hex');
  assert.equal(r.hmac, h);
  assert.equal(r.crash, crashPoint(h, 0.01));
});

test('bustabit preset uses the published salt and formula', async () => {
  const game = 'ab'.repeat(32);
  const r = await verify({ serverSeed: game, preset: 'bustabit' });
  const h = createHmac('sha256', PRESETS.bustabit.salt).update(Buffer.from(game, 'hex')).digest('hex');
  assert.equal(r.hmac, h);
  assert.equal(r.crash, bustabitBust(h));
  await assert.rejects(verify({ serverSeed: 'xyz', preset: 'bustabit' }));
});

test('empirical P(crash ≥ 2x) ≈ 0.99 / 2', async () => {
  let hits = 0;
  const n = 20000;
  for (let i = 0; i < n; i++) if (crashPoint(await hmacSha256('seed', `c:${i}`), 0.01) >= 2) hits++;
  assert.ok(Math.abs(hits / n - 0.495) < 0.015, `got ${hits / n}`);
});

test('CLI', () => {
  const out = execFileSync(process.execPath, ['bin/crash-verify.js', '--server-seed', 'server', '--client-seed', 'client', '--nonce', '7', '--json']);
  assert.equal(JSON.parse(out).hmac, createHmac('sha256', 'server').update('client:7').digest('hex'));
});
