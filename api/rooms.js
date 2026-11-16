// Vercel Serverless Function + Express Handler: Hardened Public Room Directory
// Protects against unauthorized room deletion/overwrite, flood DoS, and injection.

import crypto from 'node:crypto';
import { constantTimeEqual, createRateLimiter, sanitizePayload, sanitizeText } from '../shared/security.js';

const TTL_MS = 45_000;
const MAX_ROOMS = 200;
const ROOM_CODE_RE = /^[A-Z0-9]{6}$/;

const memoryRooms = globalThis.__KONOHA_ROOMS__ || new Map();
globalThis.__KONOHA_ROOMS__ = memoryRooms;

const writeLimiter =
  globalThis.__KONOHA_WRITE_LIMITER__ ||
  createRateLimiter({ maxRequests: 25, windowMs: 60_000, maxKeys: 1000 });
globalThis.__KONOHA_WRITE_LIMITER__ = writeLimiter;

const readLimiter =
  globalThis.__KONOHA_READ_LIMITER__ ||
  createRateLimiter({ maxRequests: 80, windowMs: 60_000, maxKeys: 1000 });
globalThis.__KONOHA_READ_LIMITER__ = readLimiter;

function getClientIp(req) {
  const fwd = req.headers?.['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim().slice(0, 64);
  }
  return String(req.socket?.remoteAddress || 'unknown').slice(0, 64);
}

function hashSecret(secret) {
  return crypto.createHash('sha256').update(String(secret || '')).digest('hex');
}

function toPublicEntry(entry) {
  return {
    code: entry.code,
    name: entry.name,
    hostName: entry.hostName,
    playerCount: entry.playerCount,
    maxPlayers: entry.maxPlayers,
    hasPassword: Boolean(entry.hasPassword),
    status: entry.status,
    updatedAt: entry.updatedAt,
  };
}

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) return { url: url.replace(/\/$/, ''), token };
  return null;
}

async function redisCmd(cfg, ...args) {
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  return res.json();
}

function pruneMemory() {
  const now = Date.now();
  for (const [code, data] of memoryRooms.entries()) {
    if (now - (data.updatedAt || 0) > TTL_MS) {
      memoryRooms.delete(code);
    }
  }
}

async function getRawRoom(code, cfg) {
  if (cfg) {
    try {
      const data = await redisCmd(cfg, 'HGET', 'konoha:public_rooms', code);
      if (data?.result) return JSON.parse(data.result);
    } catch {
      // fall through
    }
  }
  pruneMemory();
  return memoryRooms.get(code) || null;
}

async function listRooms() {
  const now = Date.now();
  const cfg = getRedisConfig();
  if (cfg) {
    try {
      const data = await redisCmd(cfg, 'HGETALL', 'konoha:public_rooms');
      const arr = data?.result;
      if (Array.isArray(arr)) {
        const rooms = [];
        for (let i = 0; i < arr.length; i += 2) {
          const code = arr[i];
          const raw = arr[i + 1];
          try {
            const parsed = JSON.parse(raw);
            if (now - (parsed.updatedAt || 0) <= TTL_MS) {
              rooms.push(toPublicEntry(parsed));
            } else {
              redisCmd(cfg, 'HDEL', 'konoha:public_rooms', code).catch(() => {});
            }
          } catch {
            // ignore malformed
          }
        }
        return rooms.sort((a, b) => b.updatedAt - a.updatedAt);
      }
    } catch {
      // Fall back to memory map
    }
  }

  pruneMemory();
  return Array.from(memoryRooms.values())
    .map(toPublicEntry)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

async function upsertRoom(entry) {
  const cfg = getRedisConfig();
  if (cfg) {
    try {
      await redisCmd(cfg, 'HSET', 'konoha:public_rooms', entry.code, JSON.stringify(entry));
      await redisCmd(cfg, 'EXPIRE', 'konoha:public_rooms', 120);
      return;
    } catch {
      // fallback
    }
  }
  pruneMemory();
  memoryRooms.set(entry.code, entry);
}

async function deleteRoom(code) {
  const cfg = getRedisConfig();
  if (cfg) {
    try {
      await redisCmd(cfg, 'HDEL', 'konoha:public_rooms', code);
    } catch {
      // ignore
    }
  }
  memoryRooms.delete(code);
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const clientIp = getClientIp(req);

  try {
    if (req.method === 'GET') {
      if (!readLimiter.allow(clientIp)) {
        res.status(429).json({ error: 'Terlalu banyak permintaan. Coba lagi sebentar.' });
        return;
      }
      const rooms = await listRooms();
      res.status(200).json({ rooms });
      return;
    }

    if (req.method === 'POST') {
      if (!writeLimiter.allow(clientIp)) {
        res.status(429).json({ error: 'Terlalu banyak permintaan. Coba lagi sebentar.' });
        return;
      }

      let rawBody = req.body;
      if (typeof rawBody === 'string') {
        if (rawBody.length > 4096) {
          res.status(413).json({ error: 'Payload terlalu besar.' });
          return;
        }
        try {
          rawBody = JSON.parse(rawBody);
        } catch {
          res.status(400).json({ error: 'JSON tidak valid.' });
          return;
        }
      }
      const body = sanitizePayload(rawBody);

      const code = String(body.code || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      if (!ROOM_CODE_RE.test(code)) {
        res.status(400).json({ error: 'Kode ruangan harus 6 karakter alfanumerik.' });
        return;
      }

      const hostSecret = String(body.hostSecret || '').trim();
      if (hostSecret.length < 16 || hostSecret.length > 128) {
        res.status(400).json({ error: 'Token otorisasi Host tidak valid.' });
        return;
      }
      const secretHash = hashSecret(hostSecret);

      const cfg = getRedisConfig();
      const existing = await getRawRoom(code, cfg);
      const isActiveExisting = existing && Date.now() - (existing.updatedAt || 0) <= TTL_MS;

      if (isActiveExisting) {
        if (!constantTimeEqual(existing.hostSecretHash, secretHash)) {
          res.status(403).json({ error: 'Tidak berhak mengubah ruangan milik Host lain.' });
          return;
        }
      } else {
        pruneMemory();
        if (!cfg && memoryRooms.size >= MAX_ROOMS) {
          res.status(429).json({ error: 'Direktori ruangan publik sedang penuh.' });
          return;
        }
      }

      const maxPlayers = Math.min(6, Math.max(2, Math.floor(Number(body.maxPlayers) || 4)));
      const playerCount = Math.min(maxPlayers, Math.max(1, Math.floor(Number(body.playerCount) || 1)));

      const entry = {
        code,
        hostSecretHash: secretHash,
        name: sanitizeText(body.name, 26, `Ruangan ${code}`),
        hostName: sanitizeText(body.hostName, 18, 'Host'),
        playerCount,
        maxPlayers,
        hasPassword: Boolean(body.hasPassword),
        status: 'waiting',
        updatedAt: Date.now(),
      };
      await upsertRoom(entry);
      res.status(200).json({ ok: true, room: toPublicEntry(entry) });
      return;
    }

    if (req.method === 'DELETE') {
      if (!writeLimiter.allow(clientIp)) {
        res.status(429).json({ error: 'Terlalu banyak permintaan.' });
        return;
      }

      const code = String(req.query?.code || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      const hostSecret = String(req.query?.hostSecret || req.body?.hostSecret || '').trim();

      if (!ROOM_CODE_RE.test(code)) {
        res.status(400).json({ error: 'Kode ruangan tidak valid.' });
        return;
      }
      if (hostSecret.length < 16) {
        res.status(403).json({ error: 'Token otorisasi Host diperlukan untuk menghapus ruangan.' });
        return;
      }

      const cfg = getRedisConfig();
      const existing = await getRawRoom(code, cfg);
      if (existing) {
        if (!constantTimeEqual(existing.hostSecretHash, hashSecret(hostSecret))) {
          res.status(403).json({ error: 'Tidak berhak menghapus ruangan milik Host lain.' });
          return;
        }
        await deleteRoom(code);
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Internal error' });
  }
}
