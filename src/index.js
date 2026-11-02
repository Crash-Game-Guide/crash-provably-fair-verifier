// crash-provably-fair-verifier: dependency-free core. Works in browsers (Web Crypto) and Node 18+ (Web Crypto, or node:crypto as fallback).
// Maintained by Crash Game Guide: https://crashgameguide.com/tools/provably-fair-verifier/

const enc = new TextEncoder();

/** @param {string} h */
export const fromHex = (h) => new Uint8Array((h.match(/[0-9a-f]{2}/gi) ?? []).map((b) => parseInt(b, 16)));
/** @param {ArrayBuffer | Uint8Array} buf */
export const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
/** @param {string | Uint8Array} v */
const bytes = (v) => (typeof v === 'string' ? enc.encode(v) : v);


/** HMAC-SHA256 as lowercase hex. Strings are UTF-8 encoded; pass a Uint8Array for raw bytes. */
export async function hmacSha256(key, message) {
  const s = globalThis.crypto?.subtle;
  if (s) {
    const k = await s.importKey('raw', bytes(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return toHex(await s.sign('HMAC', k, bytes(message)));
  }
  const { createHmac } = await import(/* @vite-ignore */ 'node:' + 'crypto'); // Node < 19 without global Web Crypto
  return createHmac('sha256', bytes(key)).update(bytes(message)).digest('hex');
}

/** SHA-256 as lowercase hex. */
export async function sha256(data) {
  const s = globalThis.crypto?.subtle;
  if (s) return toHex(await s.digest('SHA-256', bytes(data)));
  const { createHash } = await import(/* @vite-ignore */ 'node:' + 'crypto'); // Node < 19 without global Web Crypto
  return createHash('sha256').update(bytes(data)).digest('hex');
}

/** First 52 bits of a hex hash as a uniform number in [0, 1). */
export const uniform52 = (hex) => parseInt(hex.slice(0, 13), 16) / 2 ** 52;

/** Standard crash distribution: max(1, floor(100 × (1 − edge) / (1 − U)) / 100). `edge` is a fraction (0.01 = 1%). */
export function crashPoint(hex, edge = 0.01) {
  return Math.max(1, Math.floor((100 * (1 - edge)) / (1 - uniform52(hex))) / 100);
}

/** Bustabit's published formula (github.com/bustabit/verifier, src/utils/math.ts): 99 / (1 − X), 1% edge. */
export function bustabitBust(hex) {
  return Math.max(1, Math.floor(99 / (1 - uniform52(hex))) / 100);
}

/**
 * Presets exist only where the operator publishes its algorithm. Anything else: use `generic`
 * and compare with the operator's own documentation.
 */
export const PRESETS = {
  generic: {
    name: 'Generic HMAC-SHA256',
    doc: 'https://crashgameguide.com/guides/provably-fair/',
    description: 'key = server seed, message = "clientSeed:nonce", first 52 bits → standard crash distribution with your house edge.',
  },
  bustabit: {
    name: 'Bustabit (classic scheme)',
    doc: 'https://github.com/bustabit/verifier',
    // From bustabit's current seeding event: https://bitcointalk.org/index.php?topic=5560454
    salt: '00000000000000000001e08b7fd44f95e3e950ac65650a8031a6d5e1750e34be',
    description: 'key = game salt (text), message = game hash (bytes), 1% edge. SHA-256 of a game hash is the previous game hash.',
  },
};

/**
 * Verify one round.
 * @param {{ serverSeed: string, clientSeed?: string, nonce?: number, edge?: number, preset?: 'generic' | 'bustabit' }} input
 *   generic: serverSeed + clientSeed + nonce (+ edge, default 0.01).
 *   bustabit: serverSeed = the game hash (hex); clientSeed defaults to the published salt.
 * @returns {Promise<{ preset: string, serverSeedHash: string, hmac: string, crash: number }>}
 */
export async function verify({ serverSeed, clientSeed = '', nonce = 0, edge = 0.01, preset = 'generic' }) {
  if (!serverSeed) throw new Error('serverSeed is required');
  if (preset === 'bustabit') {
    const hash = fromHex(serverSeed.trim());
    if (hash.length !== 32) throw new Error('bustabit: serverSeed must be a 64-character hex game hash');
    const h = await hmacSha256(clientSeed || PRESETS.bustabit.salt, hash);
    return { preset, serverSeedHash: await sha256(hash), hmac: h, crash: bustabitBust(h) };
  }
  if (preset !== 'generic') throw new Error(`unknown preset: ${preset}`);
  if (!(edge >= 0 && edge < 1)) throw new Error('edge must be a fraction in [0, 1)');
  const n = Math.max(0, Math.floor(Number(nonce) || 0));
  const h = await hmacSha256(serverSeed, `${clientSeed}:${n}`);
  return { preset, serverSeedHash: await sha256(serverSeed), hmac: h, crash: crashPoint(h, edge) };
}
