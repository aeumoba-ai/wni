import React, { useState } from 'react';
import {
  Copy,
  Check,
  Link2,
  Bot,
  Crown,
  Trash2,
  Play,
  LogOut,
  Send,
  Share2,
  Gauge,
  Flag,
  Lock,
  Globe,
  Wifi,
} from 'lucide-react';
import { CHARACTERS, getCharacterById } from '../../shared/characters.js';
import AvatarIcon from './AvatarIcon.jsx';

export default function RoomWaitingModal({
  room,
  myId,
  netStatus,
  onAddBot,
  onRemovePlayer,
  onUpdateProfile,
  onUpdateSettings,
  onStartGame,
  onLeaveRoom,
  onSendChat,
  error,
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [chatText, setChatText] = useState('');
  const [showPionPicker, setShowPionPicker] = useState(false);

  const isHost = room.hostId === myId;
  const me = room.players.find((p) => p.id === myId);
  const usedPions = new Set(room.players.filter((p) => p.id !== myId).map((p) => p.characterId));
  const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${room.code}`;

  const copyText = async (text, setter) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setter(true);
    setTimeout(() => setter(false), 1800);
  };

  const shareWhatsApp = () => {
    const msg = `Ayo main Monopoli Negeri Konoha bareng! Guest-only tanpa login, cukup isi nama.\n\nKode Room: ${room.code}\nLink langsung: ${inviteUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const handleChat = (e) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    onSendChat(chatText);
    setChatText('');
  };

  const emptySlots = Math.max(0, room.maxPlayers - room.players.length);

  return (
    <div className="lobby-overlay">
      <div className="kraft-card waiting-card">
        <div className="waiting-header">
          <div>
            <div className="waiting-tag">
              {room.isPrivate ? <Lock size={12} /> : <Globe size={12} />}
              <span>{room.isPrivate ? 'Ruangan Privat (Kode Invite)' : 'Ruangan Publik'}</span>
              <span className={`net-dot ${netStatus}`}>
                <Wifi size={11} />
                {netStatus === 'online'
                  ? 'Online Siap Invite'
                  : netStatus === 'connecting'
                    ? 'Menyambung P2P...'
                    : 'Lokal / Bot'}
              </span>
            </div>
            <h2 className="waiting-title">{room.name}</h2>
          </div>
          <button className="btn-danger-sm" onClick={onLeaveRoom}>
            <LogOut size={15} />
            <span>Keluar</span>
          </button>
        </div>

        {/* PROMINENT ROOM CODE INVITE BANNER */}
        <div className="invite-code-banner">
          <div>
            <div className="invite-banner-label">KODE ROOM UNTUK INVITE TEMAN</div>
            <div className="invite-code-value">{room.code}</div>
          </div>
          <div className="invite-actions">
            <button
              type="button"
              className="btn-invite-primary"
              onClick={() => copyText(room.code, setCopiedCode)}
            >
              {copiedCode ? <Check size={15} /> : <Copy size={15} />}
              <span>{copiedCode ? 'Kode Disalin!' : 'Salin Kode'}</span>
            </button>
            <button
              type="button"
              className="btn-invite-secondary"
              onClick={() => copyText(inviteUrl, setCopiedLink)}
            >
              {copiedLink ? <Check size={15} /> : <Link2 size={15} />}
              <span>{copiedLink ? 'Link Disalin!' : 'Salin Link'}</span>
            </button>
            <button
              type="button"
              className="btn-invite-wa"
              onClick={shareWhatsApp}
              title="Bagikan via WhatsApp"
            >
              <Share2 size={15} />
              <span>WA</span>
            </button>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="waiting-grid">
          <div>
            <div className="section-row">
              <span className="field-label" style={{ marginBottom: 0 }}>
                Pemain ({room.players.length}/{room.maxPlayers})
              </span>
              {isHost && room.players.length < room.maxPlayers && (
                <button type="button" className="btn-small-navy" onClick={onAddBot}>
                  <Bot size={14} />
                  <span>+ Tambah Bot</span>
                </button>
              )}
            </div>

            <div className="seat-list">
              {room.players.map((p) => {
                const char = getCharacterById(p.characterId);
                const isMe = p.id === myId;
                return (
                  <div key={p.id} className={`seat-row ${isMe ? 'me' : ''}`}>
                    <AvatarIcon characterId={p.characterId} size={38} />
                    <div className="seat-info">
                      <div className="seat-name">
                        <span>{p.name}</span>
                        {p.isHost && (
                          <span className="badge-host">
                            <Crown size={11} /> Host
                          </span>
                        )}
                        {isMe && <span className="badge-you">Anda</span>}
                        {p.isBot && <span className="badge-bot">BOT</span>}
                      </div>
                      <div className="seat-char">{char.name}</div>
                    </div>
                    <div className="seat-actions">
                      {isMe && (
                        <button
                          type="button"
                          className="btn-small-tan"
                          onClick={() => setShowPionPicker((v) => !v)}
                        >
                          Ganti Pion
                        </button>
                      )}
                      {isHost && !p.isHost && (
                        <button
                          type="button"
                          className="btn-icon-danger"
                          onClick={() => onRemovePlayer(p.id)}
                          title="Keluarkan"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {Array.from({ length: emptySlots }).map((_, idx) => (
                <div key={`empty-${idx}`} className="seat-row empty">
                  <div className="empty-avatar">?</div>
                  <div className="seat-info">
                    <div className="seat-name muted">Kursi kosong</div>
                    <div className="seat-char">Kirim kode {room.code} ke teman atau tambah Bot</div>
                  </div>
                </div>
              ))}
            </div>

            {showPionPicker && me && (
              <div className="inline-pion-box">
                <div className="field-label">Pilih Pion Baru</div>
                <div className="pion-grid">
                  {CHARACTERS.map((c) => {
                    const taken = usedPions.has(c.id);
                    const active = me.characterId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        disabled={taken}
                        className={`pion-btn ${active ? 'active' : ''} ${taken ? 'taken' : ''}`}
                        onClick={() => {
                          onUpdateProfile({ characterId: c.id });
                          setShowPionPicker(false);
                        }}
                        title={taken ? `${c.name} (sudah dipakai)` : c.name}
                      >
                        <AvatarIcon characterId={c.id} size={30} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="settings-box">
              <div className="setting-item">
                <span className="setting-lbl">
                  <Gauge size={14} /> Kecepatan
                </span>
                <div className="pill-group">
                  {['normal', 'fast'].map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      disabled={!isHost}
                      className={`mini-pill ${room.settings.speed === sp ? 'active' : ''}`}
                      onClick={() => onUpdateSettings({ speed: sp })}
                    >
                      {sp === 'normal' ? 'Normal' : 'Cepat'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-item">
                <span className="setting-lbl">
                  <Flag size={14} /> Batas Ronde
                </span>
                <div className="pill-group">
                  {[15, 25, 40].map((r) => (
                    <button
                      key={r}
                      type="button"
                      disabled={!isHost}
                      className={`mini-pill ${room.settings.maxRounds === r ? 'active' : ''}`}
                      onClick={() => onUpdateSettings({ maxRounds: r })}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="lobby-chat-box">
            <div className="field-label" style={{ marginBottom: 6 }}>Obrolan Lobi</div>
            <div className="lobby-chat-messages">
              {room.chat.map((m) => (
                <div key={m.id} className={`chat-line ${m.system ? 'sys' : ''}`}>
                  {m.system ? (
                    <span>{m.text}</span>
                  ) : (
                    <>
                      <strong>{m.playerName}: </strong>
                      <span>{m.text}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
            <form onSubmit={handleChat} className="chat-input-row">
              <input
                type="text"
                className="kraft-input sm"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Sapa teman di lobi..."
                maxLength={140}
              />
              <button type="submit" className="btn-small-navy" aria-label="Kirim">
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>

        <div className="waiting-footer">
          {isHost ? (
            <button
              type="button"
              className="btn-green full-width"
              disabled={room.players.length < 2}
              onClick={onStartGame}
            >
              <Play size={18} />
              <span>
                {room.players.length < 2
                  ? 'BUTUH MINIMAL 2 PEMAIN (UNDANG TEMAN / TAMBAH BOT)'
                  : 'MULAI PERMAINAN'}
              </span>
            </button>
          ) : (
            <div className="waiting-guest-note">
              Menunggu Host memulai permainan...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
