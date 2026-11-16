// Shared Anti-Exploit & Security Utilities (Browser + Node ESM compatible)

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
// Strips ASCII control chars, C1 control chars, zero-width & BiDi/RTL spoofing overrides
const UNSAFE_CHARS_RE = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/**
 * Cryptographically strong uniform integer in [0, maxExclusive).
 * Prevents predictable Math.random() dice / code / token prediction.
 */
export function cryptoRandomInt(maxExclusive) {
  const max = Math.floor(Number(maxExclusive));
  if (!Number.isSafeInteger(max) || max <= 1) return 0;

  const cryptoObj = globalThis?.crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const limit = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    for (let i = 0; i < 32; i++) {
      cryptoObj.getRandomValues(buf);
      if (buf[0] < limit) {
        return buf[0] % max;
      }
    }
  }
  return Math.floor(Math.random() * max);
}

/**
 * Generates an unguessable URL-safe hexadecimal secret token.
 */
export function cryptoRandomToken(byteLength = 16) {
  const bytes = new Uint8Array(byteLength);
  const cryptoObj = globalThis?.crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sanitizes display names, room titles, and chat messages against control chars,
 * BiDi/RTL override attacks, zero-width spoofing, and excessive lengths.
 */
export function sanitizeText(raw, maxLen = 40, fallback = '') {
  const cleaned = String(raw ?? '')
    .replace(UNSAFE_CHARS_RE, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
  return cleaned || fallback;
}

/**
 * Strictly validates a safe non-negative integer within bounds (blocks NaN, Infinity, floats, negatives).
 */
export function safeNonNegInt(value, maxValue = 1_000_000_000) {
  if (typeof value === 'boolean' || value === null || value === undefined || value === '') {
    return 0;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  const floored = Math.floor(num);
  if (!Number.isSafeInteger(floored)) return 0;
  return Math.min(floored, maxValue);
}

/**
 * Deeply validates and strips prototype-pollution keys and excessive depth/size from untrusted packets.
 */
export function sanitizePayload(input, maxDepth = 4) {
  if (input === null || input === undefined) return {};
  if (typeof input !== 'object' || Array.isArray(input)) return {};

  const walk = (val, depth) => {
    if (depth > maxDepth) return undefined;
    if (val === null || val === undefined) return val;
    const t = typeof val;
    if (t === 'string') return val.slice(0, 512);
    if (t === 'number') return Number.isFinite(val) ? val : 0;
    if (t === 'boolean') return val;
    if (Array.isArray(val)) {
      return val.slice(0, 50).map((item) => walk(item, depth + 1));
    }
    if (t === 'object') {
      const out = Object.create(null);
      const keys = Object.keys(val).slice(0, 40);
      for (const k of keys) {
        if (DANGEROUS_KEYS.has(k)) continue;
        out[k] = walk(val[k], depth + 1);
      }
      return out;
    }
    return undefined;
  };

  return walk(input, 0) || {};
}

/**
 * Constant-time string comparison (mitigates timing side-channels on passwords/tokens).
 */
export function constantTimeEqual(a, b) {
  const sa = String(a ?? '');
  const sb = String(b ?? '');
  const len = Math.max(sa.length, sb.length);
  let diff = sa.length ^ sb.length;
  for (let i = 0; i < len; i++) {
    diff |= (sa.charCodeAt(i) || 0) ^ (sb.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * Sliding-window in-memory rate limiter keyed by peer/tab/IP identifier.
 */
export function createRateLimiter({ maxRequests = 15, windowMs = 3000, maxKeys = 500 } = {}) {
  const buckets = new Map();

  return {
    allow(key) {
      const now = Date.now();
      let list = buckets.get(key);
      if (!list) {
        if (buckets.size >= maxKeys) {
          // Prune oldest key to prevent memory exhaustion
          const firstKey = buckets.keys().next().value;
          if (firstKey !== undefined) buckets.delete(firstKey);
        }
        list = [];
        buckets.set(key, list);
      }
      const cutoff = now - windowMs;
      while (list.length > 0 && list[0] <= cutoff) {
        list.shift();
      }
      if (list.length >= maxRequests) {
        return false;
      }
      list.push(now);
      return true;
    },
    clear(key) {
      buckets.delete(key);
    },
  };
}
