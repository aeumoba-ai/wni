// Vercel Serverless Function for Public Room Directory (/api/rooms)
// Uses Upstash Redis / Vercel KV automatically if configured via env vars,
// with zero-config in-memory TTL fallback so Vercel Hobby works out-of-the-box!

const TTL_MS = 90_000;
const memoryRooms = new Map();

async function kvCommand(args) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.result;
}

async function listRooms() {
  const now = Date.now();
  const hasKv = Boolean(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
      (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  );

  if (hasKv) {
    try {
      const hash = await kvCommand(['HGETALL', 'konoha_public_rooms']);
      const list = [];
      if (Array.isArray(hash)) {
        for (let i = 0; i < hash.length; i += 2) {
          try {
            const item = JSON.parse(hash[i + 1]);
            if (item && now - (item.updatedAt || 0) < TTL_MS) {
              list.push(item);
            }
          } catch {
            // ignore bad entry
          }
        }
      }
      return list;
    } catch {
      // fall through to memory
    }
  }

  const list = [];
  for (const [code, item] of memoryRooms.entries()) {
    if (now - item.updatedAt > TTL_MS) {
      memoryRooms.delete(code);
    } else {
      list.push(item);
    }
  }
  return list;
}

async function upsertRoom(payload) {
  const code = String(payload?.code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
  if (!code) return null;

  const entry = {
    code,
    name: String(payload.name || `Ruangan ${code}`).slice(0, 28),
    hostName: String(payload.hostName || 'Host').slice(0, 18),
    playerCount: Math.max(1, Number(payload.playerCount) || 1),
    maxPlayers: Math.min(6, Math.max(2, Number(payload.maxPlayers) || 4)),
    hasPassword: Boolean(payload.hasPassword),
    status: payload.status === 'playing' ? 'playing' : 'waiting',
    updatedAt: Date.now(),
  };

  const hasKv = Boolean(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
      (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  );

  if (hasKv) {
    try {
      await kvCommand(['HSET', 'konoha_public_rooms', code, JSON.stringify(entry)]);
      return entry;
    } catch {
      // fall through
    }
  }

  memoryRooms.set(code, entry);
  return entry;
}

async function deleteRoom(codeRaw) {
  const code = String(codeRaw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (!code) return;

  const hasKv = Boolean(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
      (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  );

  if (hasKv) {
    try {
      await kvCommand(['HDEL', 'konoha_public_rooms', code]);
    } catch {
      // ignore
    }
  }
  memoryRooms.delete(code);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    const rooms = (await listRooms()).filter((r) => r.status === 'waiting');
    return res.status(200).json({ rooms });
  }

  if (req.method === 'POST') {
    const entry = await upsertRoom(req.body || {});
    if (!entry) return res.status(400).json({ error: 'Invalid room code' });
    return res.status(200).json({ ok: true, room: entry });
  }

  if (req.method === 'DELETE') {
    const code = req.query?.code || req.body?.code;
    await deleteRoom(code);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
