import Peer from 'peerjs';
import { BOT_NAMES, CHARACTERS } from '../../shared/characters.js';
import { GameEngine } from '../../shared/gameEngine.js';
import {
  constantTimeEqual,
  createRateLimiter,
  cryptoRandomInt,
  cryptoRandomToken,
  sanitizePayload,
  sanitizeText,
} from '../../shared/security.js';

const PEER_PREFIX = 'monopoli-konoha-wni-v1-';
const BC_CHANNEL_NAME = 'monopoli-konoha-wni-local-v1';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PACKET_BYTES = 8192;
const MAX_PASSWORD_FAILS = 5;
const PASSWORD_LOCKOUT_MS = 30_000;
const CHAT_COOLDOWN_MS = 700;

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[cryptoRandomInt(CODE_CHARS.length)];
  }
  return code;
}

function sanitizeName(raw, fallback = 'Tamu') {
  return sanitizeText(raw, 18, fallback);
}

function isValidGuestId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{6,64}$/.test(id) && !id.startsWith('bot_');
}

function isOversizedPacket(msg) {
  try {
    return JSON.stringify(msg).length > MAX_PACKET_BYTES;
  } catch {
    return true;
  }
}

function makeRoomPreview(room) {
  return {
    code: room.code,
    name: room.name,
    playerCount: room.players.length,
    maxPlayers: room.maxPlayers,
    isPrivate: room.isPrivate,
    hasPassword: Boolean(room.password),
    status: room.status,
    hostName: room.players.find((p) => p.id === room.hostId)?.name || 'Host',
    settings: room.settings,
  };
}

/**
 * Vercel-Ready Universal Multiplayer RoomClient!
 * - Zero persistent backend server required (works 100% natively on Vercel Static + Serverless!).
 * - Cross-device online multiplayer: Host-authoritative WebRTC P2P via PeerJS Room Codes.
 * - Same-browser multi-tab multiplayer: Instant BroadcastChannel (<5ms, even offline).
 * - Public Room Directory: Syncs with Vercel Serverless /api/rooms + local BroadcastChannel.
 */
export class RoomClient {
  constructor({ guestId, onRoomUpdate, onChatMessage, onGameEvent, onKicked, onNetStatus }) {
    this.guestId = guestId;
    this.onRoomUpdate = onRoomUpdate;
    this.onChatMessage = onChatMessage;
    this.onGameEvent = onGameEvent;
    this.onKicked = onKicked;
    this.onNetStatus = onNetStatus;

    this.role = null; // 'host' | 'guest' | null
    this.room = null; // Authoritative room object when host
    this.peer = null;
    this.hostConn = null; // DataConnection when guest via PeerJS
    this.guestConns = new Map(); // guestId -> { via: 'peer'|'bc', conn?, tabId? }
    this.bcTabBindings = new Map(); // fromTab -> boundGuestId (blocks BroadcastChannel ID spoofing)
    this.rpcLimiter = createRateLimiter({ maxRequests: 14, windowMs: 3000, maxKeys: 200 });
    this.failedPasswords = new Map(); // connKey -> { count, lockedUntil }
    this.lastChatAt = new Map(); // senderId -> timestamp
    this.pendingReplies = new Map(); // reqId -> { resolve, timer }
    this.bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(BC_CHANNEL_NAME) : null;
    this.tabId = `tab_${Date.now().toString(36)}_${cryptoRandomToken(4)}`;
    this.guestVia = null; // 'bc' | 'peer'
    this.guestHostTabId = null;
    this.guestRoomCode = null;
    this.publicHeartbeat = null;
    this.netStatus = 'idle'; // 'idle' | 'connecting' | 'online' | 'local_only'

    if (this.bc) {
      this.bc.onmessage = (ev) => this.handleBroadcastMessage(ev.data);
    }

    this._beforeUnload = () => {
      if (this.role === 'host' && this.room) {
        this.unregisterPublicRoom(this.room.code, this.room.hostSecret);
        this.broadcastRaw({ type: 'host_closed', code: this.room.code });
      }
    };
    window.addEventListener('beforeunload', this._beforeUnload);
  }

  setNetStatus(status) {
    this.netStatus = status;
    this.onNetStatus?.(status);
  }

  // ==================== PUBLIC ROOM DIRECTORY (VERCEL /api/rooms + LOCAL) ====================
  async registerPublicRoom(room) {
    if (!room || room.isPrivate || room.status !== 'waiting') return;
    try {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...makeRoomPreview(room),
          hostSecret: room.hostSecret,
        }),
      });
    } catch {
      // Optional directory - ignore if offline
    }
  }

  unregisterPublicRoom(code, hostSecret) {
    if (!code) return;
    try {
      const secretParam = hostSecret ? `&hostSecret=${encodeURIComponent(hostSecret)}` : '';
      fetch(`/api/rooms?code=${encodeURIComponent(code)}${secretParam}`, {
        method: 'DELETE',
        keepalive: true,
      }).catch(() => {});
    } catch {
      // ignore
    }
  }

  async listPublicRooms() {
    const map = new Map();

    // 1. Query local tabs over BroadcastChannel (180ms fast probe)
    if (this.bc) {
      const localList = await new Promise((resolve) => {
        const found = [];
        const probeId = `probe_${Date.now()}_${Math.random()}`;
        const onMsg = (ev) => {
          const d = ev.data;
          if (d?.type === 'public_room_pong' && d.probeId === probeId && d.room) {
            found.push(d.room);
          }
        };
        const tempBc = new BroadcastChannel(BC_CHANNEL_NAME);
        tempBc.onmessage = onMsg;
        tempBc.postMessage({ type: 'public_room_ping', probeId, fromTab: this.tabId });
        setTimeout(() => {
          tempBc.close();
          resolve(found);
        }, 180);
      });
      for (const r of localList) map.set(r.code, r);
    }

    // 2. Query Vercel Serverless /api/rooms
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        for (const r of data.rooms || []) {
          if (!map.has(r.code)) map.set(r.code, r);
        }
      }
    } catch {
      // ignore
    }

    return Array.from(map.values());
  }

  // ==================== ROOM PREVIEW BY CODE (FOR INVITE LINKS) ====================
  async previewRoom(codeRaw) {
    const code = String(codeRaw || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) return null;

    // 1. Check same-browser BroadcastChannel first (fast 180ms)
    if (this.bc) {
      const local = await new Promise((resolve) => {
        const reqId = `prev_${Date.now()}_${Math.random()}`;
        let done = false;
        const tempBc = new BroadcastChannel(BC_CHANNEL_NAME);
        tempBc.onmessage = (ev) => {
          const d = ev.data;
          if (d?.type === 'preview_reply' && d.reqId === reqId && !done) {
            done = true;
            tempBc.close();
            resolve(d.room || null);
          }
        };
        tempBc.postMessage({ type: 'preview_ping', reqId, code, fromTab: this.tabId });
        setTimeout(() => {
          if (!done) {
            done = true;
            tempBc.close();
            resolve(null);
          }
        }, 200);
      });
      if (local) return local;
    }

    // 2. Check PeerJS over internet (connect briefly and ask preview)
    try {
      return await this.peerPreview(code);
    } catch {
      return null;
    }
  }

  peerPreview(code) {
    return new Promise((resolve) => {
      let finished = false;
      let tempPeer = null;
      const finish = (val) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        try {
          tempPeer?.destroy();
        } catch {
          // ignore
        }
        resolve(val);
      };

      const timer = setTimeout(() => finish(null), 3500);
      try {
        tempPeer = new Peer(undefined, { config: { iceServers: ICE_SERVERS }, debug: 0 });
        tempPeer.on('open', () => {
          const conn = tempPeer.connect(`${PEER_PREFIX}${code}`, { reliable: true });
          conn.on('open', () => {
            conn.send({ type: 'preview_request' });
          });
          conn.on('data', (msg) => {
            if (msg?.type === 'preview_response') {
              finish(msg.room || null);
            }
          });
          conn.on('error', () => finish(null));
        });
        tempPeer.on('error', () => finish(null));
      } catch {
        finish(null);
      }
    });
  }

  // ==================== HOST: CREATE & RUN ROOM ====================
  serializeHostRoom() {
    const r = this.room;
    if (!r) return null;
    return {
      code: r.code,
      name: r.name,
      maxPlayers: r.maxPlayers,
      isPrivate: r.isPrivate,
      hasPassword: Boolean(r.password),
      hostId: r.hostId,
      status: r.status,
      settings: r.settings,
      players: r.players.map((p) => ({
        id: p.id,
        name: p.name,
        characterId: p.characterId,
        isBot: p.isBot,
        connected: p.isBot ? true : p.connected,
        isHost: p.id === r.hostId,
      })),
      chat: r.chat.slice(-50),
      game: r.game ? r.game.serialize() : null,
    };
  }

  pickUnusedCharacter(preferredId) {
    const used = new Set(this.room.players.map((p) => p.characterId));
    if (preferredId && CHARACTERS.some((c) => c.id === preferredId) && !used.has(preferredId)) {
      return preferredId;
    }
    const free = CHARACTERS.find((c) => !used.has(c.id));
    return free ? free.id : CHARACTERS[0].id;
  }

  emitHostRoom() {
    if (!this.room) return;
    const snap = this.serializeHostRoom();
    this.onRoomUpdate?.(snap);
    this.sendToAllGuests({ type: 'room_update', room: snap });
    if (!this.room.isPrivate && this.room.status === 'waiting') {
      this.registerPublicRoom(this.room);
    }
  }

  sendToAllGuests(packet) {
    for (const info of this.guestConns.values()) {
      if (info.via === 'peer' && info.conn?.open) {
        try {
          info.conn.send(packet);
        } catch {
          // ignore
        }
      } else if (info.via === 'bc' && this.bc) {
        this.bc.postMessage({ ...packet, toTab: info.tabId, fromTab: this.tabId, code: this.room?.code });
      }
    }
  }

  broadcastRaw(packet) {
    this.sendToAllGuests(packet);
  }

  async createRoom(payload) {
    this.leaveRoom();

    const playerName = sanitizeName(payload.playerName, 'Tamu');
    const roomName = sanitizeName(payload.roomName, `Ruangan ${playerName}`);
    const maxPlayers = Math.min(6, Math.max(2, Number(payload.maxPlayers) || 4));
    const isPrivate = payload.isPrivate !== false;
    const password = String(payload.password || '').trim().slice(0, 24);
    const characterId = CHARACTERS.some((c) => c.id === payload.characterId)
      ? payload.characterId
      : CHARACTERS[0].id;
    const code = generateRoomCode();

    this.role = 'host';
    this.room = {
      code,
      hostSecret: cryptoRandomToken(24), // Secret token for authenticated /api/rooms updates & deletion
      name: roomName,
      maxPlayers,
      isPrivate,
      password,
      hostId: this.guestId,
      kickedIds: new Set(),
      status: 'waiting',
      settings: { speed: 'normal', maxRounds: 25 },
      players: [
        {
          id: this.guestId,
          name: playerName,
          characterId,
          isBot: false,
          connected: true,
        },
      ],
      chat: [
        {
          id: `sys-${Date.now()}`,
          system: true,
          text: `Ruangan dibuat! Bagikan kode ${code} atau link invite ke teman untuk bergabung.`,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ],
      game: null,
    };

    // Start PeerJS Host signaling in background so online guests can connect by Room Code!
    this.initHostPeer(code);

    if (!isPrivate) {
      this.registerPublicRoom(this.room);
      this.publicHeartbeat = setInterval(() => {
        if (this.room && !this.room.isPrivate && this.room.status === 'waiting') {
          this.registerPublicRoom(this.room);
        }
      }, 25000);
    }

    const snap = this.serializeHostRoom();
    this.onRoomUpdate?.(snap);
    return { ok: true, room: snap };
  }

  initHostPeer(code) {
    this.setNetStatus('connecting');
    try {
      const peer = new Peer(`${PEER_PREFIX}${code}`, {
        config: { iceServers: ICE_SERVERS },
        debug: 0,
      });
      this.peer = peer;

      peer.on('open', () => {
        if (this.peer === peer) {
          this.setNetStatus('online');
        }
      });

      peer.on('connection', (conn) => {
        this.attachPeerGuest(conn);
      });

      peer.on('disconnected', () => {
        if (this.peer === peer && !peer.destroyed) {
          this.setNetStatus('connecting');
          setTimeout(() => {
            if (this.peer === peer && !peer.destroyed) {
              try {
                peer.reconnect();
              } catch {
                // ignore
              }
            }
          }, 1500);
        }
      });

      peer.on('error', () => {
        if (this.peer === peer) {
          this.setNetStatus('local_only');
        }
      });
    } catch {
      this.setNetStatus('local_only');
    }
  }

  checkPasswordLockout(connKey) {
    const rec = this.failedPasswords.get(connKey);
    if (!rec) return false;
    if (rec.lockedUntil && Date.now() < rec.lockedUntil) return true;
    if (rec.lockedUntil && Date.now() >= rec.lockedUntil) {
      this.failedPasswords.delete(connKey);
    }
    return false;
  }

  recordPasswordFailure(connKey) {
    const rec = this.failedPasswords.get(connKey) || { count: 0, lockedUntil: 0 };
    rec.count += 1;
    if (rec.count >= MAX_PASSWORD_FAILS) {
      rec.lockedUntil = Date.now() + PASSWORD_LOCKOUT_MS;
    }
    this.failedPasswords.set(connKey, rec);
    return rec.count >= MAX_PASSWORD_FAILS;
  }

  attachPeerGuest(conn) {
    let boundGuestId = null;
    const connKey = `peer_${conn.peer || 'anon'}_${Date.now()}`;

    conn.on('data', (msg) => {
      if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return;
      if (isOversizedPacket(msg)) {
        try {
          conn.close();
        } catch {
          // ignore
        }
        return;
      }

      if (!this.rpcLimiter.allow(connKey)) {
        if (msg.type === 'rpc' && conn.open) {
          conn.send({
            type: 'rpc_reply',
            reqId: msg.reqId,
            result: { error: 'Terlalu banyak permintaan! Pelan-pelan ya.' },
          });
        }
        return;
      }

      if (msg.type === 'preview_request') {
        conn.send({
          type: 'preview_response',
          room: this.room ? makeRoomPreview(this.room) : null,
        });
        return;
      }

      if (msg.type === 'rpc') {
        const reqId = typeof msg.reqId === 'string' ? msg.reqId.slice(0, 64) : '';
        const action = typeof msg.action === 'string' ? msg.action.slice(0, 48) : '';
        const safePayload = sanitizePayload(msg.payload);

        let senderId = boundGuestId;
        if (action === 'join_room') {
          if (boundGuestId) {
            if (conn.open) {
              conn.send({ type: 'rpc_reply', reqId, result: { error: 'Sudah bergabung di ruangan.' } });
            }
            return;
          }
          if (this.checkPasswordLockout(connKey)) {
            if (conn.open) {
              conn.send({
                type: 'rpc_reply',
                reqId,
                result: { error: 'Terlalu banyak percobaan password salah. Coba lagi 30 detik.' },
              });
            }
            return;
          }
          const requestedId = safePayload.guestId;
          if (!isValidGuestId(requestedId) || requestedId === this.room?.hostId) {
            if (conn.open) {
              conn.send({ type: 'rpc_reply', reqId, result: { error: 'ID sesi tamu tidak valid.' } });
            }
            return;
          }
          senderId = requestedId;
          this.guestConns.set(senderId, { via: 'peer', conn });
        } else if (!senderId) {
          // Strictly reject any unauthenticated RPC (prevents identity spoofing & host takeover!)
          if (conn.open) {
            conn.send({ type: 'rpc_reply', reqId, result: { error: 'Sesi belum terautentikasi.' } });
          }
          return;
        }

        const res = this.executeHostAction(senderId, action, safePayload, connKey);
        if (action === 'join_room') {
          if (res.ok) {
            boundGuestId = senderId;
            this.failedPasswords.delete(connKey);
          } else {
            this.guestConns.delete(senderId);
            if (res.needPassword && this.recordPasswordFailure(connKey)) {
              res.error = 'Terlalu banyak percobaan password salah. Koneksi diputus (tunggu 30 detik).';
              if (conn.open) conn.send({ type: 'rpc_reply', reqId, result: res });
              setTimeout(() => {
                try {
                  conn.close();
                } catch {
                  // ignore
                }
              }, 80);
              return;
            }
          }
        }
        if (conn.open) {
          conn.send({ type: 'rpc_reply', reqId, result: res });
        }
      }
    });

    conn.on('close', () => {
      this.rpcLimiter.clear(connKey);
      if (boundGuestId) {
        this.handleHostGuestDisconnect(boundGuestId);
      }
    });
  }

  handleHostGuestDisconnect(guestId) {
    if (!this.room || this.role !== 'host') return;
    if (guestId === this.room.hostId) return; // Host cannot be disconnected as a guest
    this.guestConns.delete(guestId);
    for (const [tab, gid] of this.bcTabBindings.entries()) {
      if (gid === guestId) this.bcTabBindings.delete(tab);
    }
    const idx = this.room.players.findIndex((p) => p.id === guestId && !p.isBot);
    if (idx === -1) return;
    const pl = this.room.players[idx];
    if (this.room.status === 'waiting') {
      this.room.players.splice(idx, 1);
      this.room.chat.push({
        id: `sys-${Date.now()}`,
        system: true,
        text: `${pl.name} keluar dari ruangan.`,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      });
    } else {
      pl.connected = false;
      if (this.room.game) {
        this.room.game.addLog(`${pl.name} terputus (diambil alih otomatis).`, 'system');
        this.room.game.setPlayerConnection(pl.id, false);
      }
    }
    this.emitHostRoom();
  }

  // ==================== BROADCAST CHANNEL (SAME-BROWSER MULTI-TAB) ====================
  handleBroadcastMessage(msg) {
    if (!msg || typeof msg !== 'object' || msg.fromTab === this.tabId) return;
    if (isOversizedPacket(msg)) return;

    // Host handling local probes & local guest RPCs
    if (this.role === 'host' && this.room) {
      const connKey = `bc_${String(msg.fromTab || 'unknown').slice(0, 48)}`;
      if (msg.type === 'public_room_ping' && !this.room.isPrivate && this.room.status === 'waiting') {
        this.bc.postMessage({
          type: 'public_room_pong',
          probeId: msg.probeId,
          room: makeRoomPreview(this.room),
          fromTab: this.tabId,
        });
        return;
      }
      if (msg.type === 'preview_ping' && msg.code === this.room.code) {
        this.bc.postMessage({
          type: 'preview_reply',
          reqId: msg.reqId,
          room: makeRoomPreview(this.room),
          hostTabId: this.tabId,
          fromTab: this.tabId,
        });
        return;
      }
      if (msg.type === 'rpc' && msg.code === this.room.code) {
        const reply = (result) =>
          this.bc.postMessage({
            type: 'rpc_reply',
            reqId: msg.reqId,
            toTab: msg.fromTab,
            fromTab: this.tabId,
            result,
          });

        if (!this.rpcLimiter.allow(connKey)) {
          reply({ error: 'Terlalu banyak permintaan! Pelan-pelan ya.' });
          return;
        }

        const action = typeof msg.action === 'string' ? msg.action.slice(0, 48) : '';
        const safePayload = sanitizePayload(msg.payload);
        let boundId = this.bcTabBindings.get(msg.fromTab) || null;

        if (action === 'join_room') {
          if (this.checkPasswordLockout(connKey)) {
            reply({ error: 'Terlalu banyak percobaan password salah. Coba lagi 30 detik.' });
            return;
          }
          const reqGuestId = safePayload.guestId || msg.guestId;
          if (!isValidGuestId(reqGuestId) || reqGuestId === this.room.hostId) {
            reply({ error: 'ID sesi tamu tidak valid.' });
            return;
          }
          boundId = reqGuestId;
          this.guestConns.set(boundId, { via: 'bc', tabId: msg.fromTab });
        } else if (!boundId) {
          reply({ error: 'Sesi tab belum terautentikasi.' });
          return;
        }

        const res = this.executeHostAction(boundId, action, safePayload, connKey);
        if (action === 'join_room') {
          if (res.ok) {
            this.bcTabBindings.set(msg.fromTab, boundId);
            this.failedPasswords.delete(connKey);
          } else {
            this.guestConns.delete(boundId);
            if (res.needPassword && this.recordPasswordFailure(connKey)) {
              res.error = 'Terlalu banyak percobaan password salah. Tunggu 30 detik.';
            }
          }
        }
        reply(res);
        return;
      }
      if (msg.type === 'guest_leave_bc' && msg.code === this.room.code) {
        const boundId = this.bcTabBindings.get(msg.fromTab);
        if (boundId) {
          this.handleHostGuestDisconnect(boundId);
        }
        return;
      }
    }

    // Guest handling messages directed to this tab
    if (this.role === 'guest' && msg.toTab === this.tabId) {
      if (msg.type === 'rpc_reply') {
        this.resolvePendingReply(msg.reqId, msg.result);
      } else if (msg.type === 'room_update') {
        this.onRoomUpdate?.(msg.room);
      } else if (msg.type === 'chat_message') {
        this.onChatMessage?.(msg.message);
      } else if (msg.type === 'game_event') {
        this.onGameEvent?.(msg.event, msg.data);
      } else if (msg.type === 'kicked') {
        this.leaveRoom();
        this.onKicked?.(msg.message);
      } else if (msg.type === 'host_closed') {
        this.leaveRoom();
        this.onKicked?.('Host telah menutup ruangan.');
      }
    }
  }

  // ==================== HOST AUTHORITATIVE ACTION ROUTER ====================
  executeHostAction(senderId, action, payload) {
    const room = this.room;
    if (!room) return { error: 'Ruangan sudah ditutup.' };

    if (action === 'join_room') {
      if (senderId === room.hostId) {
        return { error: 'Tidak bisa mengambil alih kursi Host.' };
      }
      if (room.kickedIds?.has(senderId)) {
        return { error: 'Kamu telah dikeluarkan dari ruangan ini oleh Host.' };
      }
      const existing = room.players.find((p) => p.id === senderId && !p.isBot);
      if (existing) {
        // Prevent active seat hijacking — require disconnected seat + valid cryptographic reconnectToken!
        if (existing.connected) {
          return { error: 'ID pemain ini sedang aktif bermain di ruangan.' };
        }
        if (!existing.reconnectToken || !constantTimeEqual(payload.reconnectToken, existing.reconnectToken)) {
          return { error: 'Token sesi tidak valid — tidak bisa mengambil alih kursi pemain lain.' };
        }
        existing.connected = true;
        if (payload.playerName && room.status === 'waiting') {
          existing.name = sanitizeName(payload.playerName, existing.name);
        }
        if (room.game) room.game.setPlayerConnection(senderId, true);
        this.emitHostRoom();
        return {
          ok: true,
          room: this.serializeHostRoom(),
          reconnectToken: existing.reconnectToken,
          reconnected: true,
        };
      }

      if (room.status !== 'waiting') {
        return { error: 'Permainan di ruangan ini sudah dimulai.' };
      }
      if (room.password && !constantTimeEqual(String(payload.password || '').trim(), room.password)) {
        return { error: 'Password ruangan salah.', needPassword: true };
      }
      if (room.players.length >= room.maxPlayers) {
        return { error: 'Ruangan sudah penuh.' };
      }

      const playerName = sanitizeName(payload.playerName, `Tamu ${room.players.length + 1}`);
      const characterId = this.pickUnusedCharacter(payload.characterId);
      const reconnectToken = cryptoRandomToken(16);
      room.players.push({
        id: senderId,
        name: playerName,
        characterId,
        isBot: false,
        connected: true,
        reconnectToken, // Secret token only returned to this guest, NEVER serialized to room state!
      });
      room.chat.push({
        id: `sys-${Date.now()}-${cryptoRandomToken(3)}`,
        system: true,
        text: `${playerName} bergabung ke ruangan!`,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      });
      this.emitHostRoom();
      return { ok: true, room: this.serializeHostRoom(), reconnectToken };
    }

    if (action === 'leave_room') {
      this.handleHostGuestDisconnect(senderId);
      return { ok: true };
    }

    if (action === 'update_profile') {
      if (room.status !== 'waiting') return { error: 'Hanya bisa diubah di lobi.' };
      const player = room.players.find((p) => p.id === senderId);
      if (!player) return { error: 'Pemain tidak ditemukan.' };
      if (payload.playerName) player.name = sanitizeName(payload.playerName, player.name);
      if (payload.characterId && CHARACTERS.some((c) => c.id === payload.characterId)) {
        const taken = room.players.some((p) => p.id !== senderId && p.characterId === payload.characterId);
        if (taken) return { error: 'Pion sudah dipakai pemain lain.' };
        player.characterId = payload.characterId;
      }
      this.emitHostRoom();
      return { ok: true };
    }

    if (action === 'update_settings') {
      if (room.hostId !== senderId || room.status !== 'waiting') return { error: 'Hanya host yang bisa mengubah.' };
      if (payload.speed === 'normal' || payload.speed === 'fast') room.settings.speed = payload.speed;
      if ([15, 25, 40].includes(Number(payload.maxRounds))) room.settings.maxRounds = Number(payload.maxRounds);
      this.emitHostRoom();
      return { ok: true };
    }

    if (action === 'add_bot') {
      if (room.hostId !== senderId || room.status !== 'waiting') return { error: 'Hanya host yang bisa menambah bot.' };
      if (room.players.length >= room.maxPlayers) return { error: 'Kursi ruangan sudah penuh.' };
      const usedNames = new Set(room.players.map((p) => p.name));
      const botName = BOT_NAMES.find((n) => !usedNames.has(n)) || `Bot #${room.players.length + 1}`;
      const characterId = this.pickUnusedCharacter(null);
      room.players.push({
        id: `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: botName,
        characterId,
        isBot: true,
        connected: true,
      });
      room.chat.push({
        id: `sys-${Date.now()}`,
        system: true,
        text: `${botName} ditambahkan ke ruangan.`,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      });
      this.emitHostRoom();
      return { ok: true };
    }

    if (action === 'remove_player') {
      if (room.hostId !== senderId || room.status !== 'waiting') return { error: 'Hanya host.' };
      const targetId = payload.targetId;
      if (targetId === room.hostId) return { error: 'Host tidak bisa mengeluarkan diri sendiri.' };
      const idx = room.players.findIndex((p) => p.id === targetId);
      if (idx === -1) return { error: 'Pemain tidak ditemukan.' };
      const [removed] = room.players.splice(idx, 1);
      if (!removed.isBot) {
        room.kickedIds?.add(removed.id);
      }
      const connInfo = this.guestConns.get(removed.id);
      if (connInfo) {
        const kickMsg = { type: 'kicked', message: 'Kamu dikeluarkan dari ruangan oleh Host.' };
        if (connInfo.via === 'peer' && connInfo.conn?.open) {
          connInfo.conn.send(kickMsg);
          setTimeout(() => connInfo.conn.close(), 100);
        } else if (connInfo.via === 'bc' && this.bc) {
          this.bc.postMessage({ ...kickMsg, toTab: connInfo.tabId, fromTab: this.tabId });
        }
        this.guestConns.delete(removed.id);
      }
      this.emitHostRoom();
      return { ok: true };
    }

    if (action === 'start_game') {
      if (room.hostId !== senderId || room.status !== 'waiting') return { error: 'Tidak bisa memulai.' };
      if (room.players.length < 2) {
        return { error: 'Minimal 2 pemain! Undang teman pakai kode room atau tambah Bot.' };
      }
      room.status = 'playing';
      this.unregisterPublicRoom(room.code, room.hostSecret);
      room.game = new GameEngine(
        room,
        () => this.emitHostRoom(),
        (eventName, data) => {
          this.onGameEvent?.(eventName, data);
          this.sendToAllGuests({ type: 'game_event', event: eventName, data });
        }
      );
      this.emitHostRoom();
      return { ok: true };
    }

    if (action === 'return_to_lobby') {
      if (room.hostId !== senderId) return { error: 'Hanya host.' };
      if (room.game) {
        room.game.destroy();
        room.game = null;
      }
      room.status = 'waiting';
      room.players = room.players.filter((p) => p.isBot || p.connected);
      this.emitHostRoom();
      return { ok: true };
    }

    if (action === 'send_chat') {
      const player = room.players.find((p) => p.id === senderId && !p.isBot);
      if (!player) return { error: 'Pemain tidak ditemukan.' };
      const now = Date.now();
      const prevTs = this.lastChatAt.get(senderId) || 0;
      if (now - prevTs < CHAT_COOLDOWN_MS) {
        return { error: 'Tunggu sebentar sebelum mengirim pesan lagi.' };
      }
      const text = sanitizeText(payload.text, 180);
      if (!text) return { error: 'Pesan kosong.' };
      this.lastChatAt.set(senderId, now);
      const msg = {
        id: `msg-${now}-${cryptoRandomToken(3)}`,
        playerId: player.id,
        playerName: player.name,
        characterId: player.characterId,
        text,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      room.chat.push(msg);
      if (room.chat.length > 60) room.chat.shift();
      this.onChatMessage?.(msg);
      this.sendToAllGuests({ type: 'chat_message', message: msg });
      return { ok: true };
    }

    // In-game actions delegated directly to GameEngine (strictly validated)
    if (!room.game) return { error: 'Permainan belum dimulai.' };
    switch (action) {
      case 'game_roll': {
        const mode = ['acak', 'ganjil', 'genap'].includes(payload.mode) ? payload.mode : 'acak';
        return room.game.handleRoll(senderId, mode);
      }
      case 'game_pay_bail':
        return room.game.handlePayBail(senderId);
      case 'game_use_jail_card':
        return room.game.handleUseJailCard(senderId);
      case 'game_buy_decision':
        return room.game.handleBuyDecision(senderId, !!payload.buy);
      case 'game_upgrade_decision':
        return room.game.handleUpgradeDecision(senderId, !!payload.upgrade);
      case 'game_ack_card':
        return room.game.handleAcknowledgeCard(senderId);
      case 'game_upgrade_property': {
        const tid = Number(payload.tileId);
        if (!Number.isInteger(tid)) return { error: 'ID petak tidak valid.' };
        return room.game.handleUpgradeProperty(senderId, tid);
      }
      case 'game_sell_property': {
        const tid = Number(payload.tileId);
        if (!Number.isInteger(tid)) return { error: 'ID petak tidak valid.' };
        return room.game.handleSellProperty(senderId, tid);
      }
      case 'game_declare_bankruptcy':
        return room.game.handleDeclareBankruptcy(senderId);
      case 'game_propose_trade':
        return room.game.handleProposeTrade(senderId, payload);
      case 'game_respond_trade':
        return room.game.handleRespondTrade(senderId, !!payload.accept);
      default:
        return { error: 'Aksi tidak dikenali.' };
    }
  }

  // ==================== GUEST: JOIN VIA ROOM CODE (LOCAL BC OR PEERJS WEBRTC) ====================
  async joinRoom(payload) {
    this.leaveRoom();

    const code = String(payload.code || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) {
      return { error: 'Masukkan kode ruangan yang valid (6 karakter).' };
    }

    // 1. Check same-browser BroadcastChannel first!
    if (this.bc) {
      const localFound = await new Promise((resolve) => {
        const reqId = `probe_join_${Date.now()}`;
        let done = false;
        const tempBc = new BroadcastChannel(BC_CHANNEL_NAME);
        tempBc.onmessage = (ev) => {
          const d = ev.data;
          if (d?.type === 'preview_reply' && d.reqId === reqId && !done) {
            done = true;
            tempBc.close();
            resolve(d.hostTabId || null);
          }
        };
        tempBc.postMessage({ type: 'preview_ping', reqId, code, fromTab: this.tabId });
        setTimeout(() => {
          if (!done) {
            done = true;
            tempBc.close();
            resolve(null);
          }
        }, 220);
      });

      if (localFound) {
        this.role = 'guest';
        this.guestVia = 'bc';
        this.guestHostTabId = localFound;
        this.guestRoomCode = code;
        this.setNetStatus('online');
        let storedToken = '';
        try {
          storedToken = sessionStorage.getItem(`konoha_reconn_${code}`) || '';
        } catch {
          // ignore
        }
        const res = await this.sendAction('join_room', {
          guestId: this.guestId,
          playerName: payload.playerName,
          characterId: payload.characterId,
          password: payload.password,
          reconnectToken: storedToken,
        });
        if (res.ok && res.reconnectToken) {
          try {
            sessionStorage.setItem(`konoha_reconn_${code}`, res.reconnectToken);
          } catch {
            // ignore
          }
        } else if (!res.ok) {
          this.leaveRoom();
        }
        return res;
      }
    }

    // 2. Connect across internet via PeerJS WebRTC DataChannel!
    this.setNetStatus('connecting');
    try {
      const conn = await this.connectToHostPeer(code);
      this.role = 'guest';
      this.guestVia = 'peer';
      this.hostConn = conn;
      this.guestRoomCode = code;
      this.setNetStatus('online');

      conn.on('data', (msg) => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'rpc_reply') {
          this.resolvePendingReply(msg.reqId, msg.result);
        } else if (msg.type === 'room_update') {
          this.onRoomUpdate?.(msg.room);
        } else if (msg.type === 'chat_message') {
          this.onChatMessage?.(msg.message);
        } else if (msg.type === 'game_event') {
          this.onGameEvent?.(msg.event, msg.data);
        } else if (msg.type === 'kicked') {
          this.leaveRoom();
          this.onKicked?.(msg.message);
        } else if (msg.type === 'host_closed') {
          this.leaveRoom();
          this.onKicked?.('Host telah menutup ruangan.');
        }
      });

      conn.on('close', () => {
        if (this.role === 'guest' && this.hostConn === conn) {
          this.leaveRoom();
          this.onKicked?.('Koneksi ke ruangan terputus.');
        }
      });

      let storedToken = '';
      try {
        storedToken = sessionStorage.getItem(`konoha_reconn_${code}`) || '';
      } catch {
        // ignore
      }
      const res = await this.sendAction('join_room', {
        guestId: this.guestId,
        playerName: payload.playerName,
        characterId: payload.characterId,
        password: payload.password,
        reconnectToken: storedToken,
      });
      if (res.ok && res.reconnectToken) {
        try {
          sessionStorage.setItem(`konoha_reconn_${code}`, res.reconnectToken);
        } catch {
          // ignore
        }
      } else if (!res.ok) {
        this.leaveRoom();
      }
      return res;
    } catch (err) {
      this.leaveRoom();
      return {
        error:
          err?.message ||
          `Ruangan "${code}" tidak ditemukan atau Host sedang offline. Pastikan kode benar dan Host masih membuka ruangan.`,
      };
    }
  }

  connectToHostPeer(code) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const peer = new Peer(undefined, {
        config: { iceServers: ICE_SERVERS },
        debug: 0,
      });
      this.peer = peer;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error(`Waktu habis mencari ruangan "${code}". Pastikan kode benar dan Host aktif.`));
        }
      }, 8500);

      peer.on('open', () => {
        const conn = peer.connect(`${PEER_PREFIX}${code}`, { reliable: true });
        conn.on('open', () => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(conn);
          }
        });
        conn.on('error', () => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(new Error(`Gagal terhubung ke ruangan "${code}".`));
          }
        });
      });

      peer.on('error', (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          if (err?.type === 'peer-unavailable') {
            reject(new Error(`Ruangan dengan kode "${code}" tidak ditemukan.`));
          } else {
            reject(new Error(`Tidak dapat tersambung ke ruangan "${code}" (${err?.type || 'jaringan'}).`));
          }
        }
      });
    });
  }

  // ==================== UNIVERSAL ACTION SENDER ====================
  sendAction(action, payload = {}) {
    if (this.role === 'host') {
      return Promise.resolve(this.executeHostAction(this.guestId, action, payload));
    }

    if (this.role === 'guest') {
      const reqId = `rpc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          this.pendingReplies.delete(reqId);
          resolve({ error: 'Host tidak merespons. Coba lagi.' });
        }, 7000);

        this.pendingReplies.set(reqId, { resolve, timer });

        if (this.guestVia === 'bc' && this.bc) {
          this.bc.postMessage({
            type: 'rpc',
            reqId,
            code: this.guestRoomCode,
            guestId: this.guestId,
            action,
            payload: { ...payload, guestId: this.guestId },
            fromTab: this.tabId,
          });
        } else if (this.guestVia === 'peer' && this.hostConn?.open) {
          this.hostConn.send({
            type: 'rpc',
            reqId,
            action,
            payload: { ...payload, guestId: this.guestId },
          });
        } else {
          clearTimeout(timer);
          this.pendingReplies.delete(reqId);
          resolve({ error: 'Koneksi ke Host terputus.' });
        }
      });
    }

    return Promise.resolve({ error: 'Belum bergabung di ruangan.' });
  }

  resolvePendingReply(reqId, result) {
    const item = this.pendingReplies.get(reqId);
    if (!item) return;
    clearTimeout(item.timer);
    this.pendingReplies.delete(reqId);
    item.resolve(result || { ok: true });
  }

  leaveRoom() {
    if (this.publicHeartbeat) {
      clearInterval(this.publicHeartbeat);
      this.publicHeartbeat = null;
    }

    if (this.role === 'host' && this.room) {
      this.unregisterPublicRoom(this.room.code, this.room.hostSecret);
      this.sendToAllGuests({ type: 'host_closed', code: this.room.code });
      if (this.room.game) {
        this.room.game.destroy();
      }
      for (const info of this.guestConns.values()) {
        try {
          info.conn?.close();
        } catch {
          // ignore
        }
      }
      this.guestConns.clear();
      this.bcTabBindings.clear();
      this.failedPasswords.clear();
      this.lastChatAt.clear();
      this.room = null;
    } else if (this.role === 'guest') {
      if (this.guestVia === 'bc' && this.bc && this.guestRoomCode) {
        this.bc.postMessage({
          type: 'guest_leave_bc',
          code: this.guestRoomCode,
          guestId: this.guestId,
          fromTab: this.tabId,
        });
      }
      try {
        this.hostConn?.close();
      } catch {
        // ignore
      }
    }

    for (const { resolve, timer } of this.pendingReplies.values()) {
      clearTimeout(timer);
      resolve({ error: 'Keluar dari ruangan.' });
    }
    this.pendingReplies.clear();

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // ignore
      }
      this.peer = null;
    }

    this.role = null;
    this.hostConn = null;
    this.guestVia = null;
    this.guestHostTabId = null;
    this.guestRoomCode = null;
    this.setNetStatus('idle');
  }

  destroy() {
    this.leaveRoom();
    window.removeEventListener('beforeunload', this._beforeUnload);
    if (this.bc) {
      this.bc.close();
      this.bc = null;
    }
  }
}
