import React, { useState } from 'react';
import { X, Send, Copy, Check, Link2, LogOut, BookOpen } from 'lucide-react';

export function ChatDrawer({ open, messages, onSend, onClose }) {
  const [text, setText] = useState('');
  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <div className="side-drawer">
      <div className="drawer-head">
        <h3>Obrolan Ruangan</h3>
        <button className="icon-close-btn" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="drawer-body">
        {messages.map((m) => (
          <div key={m.id} className={`chat-line ${m.system ? 'sys' : ''}`}>
            {m.system ? (
              <span>{m.text}</span>
            ) : (
              <>
                <span className="chat-time">{m.time}</span> <strong>{m.playerName}:</strong> {m.text}
              </>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="drawer-foot">
        <input
          type="text"
          className="kraft-input sm"
          placeholder="Tulis pesan..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={150}
        />
        <button type="submit" className="btn-small-navy">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}

export function LogDrawer({ open, logs, onClose }) {
  if (!open) return null;
  return (
    <div className="side-drawer">
      <div className="drawer-head">
        <h3>Riwayat Permainan</h3>
        <button className="icon-close-btn" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="drawer-body">
        {(logs || []).map((l) => (
          <div key={l.id} className={`log-line ${l.type || ''}`}>
            <span className="chat-time">{l.time}</span> {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export function RoomInfoModal({ open, room, onClose, onLeave, onOpenHowToPlay }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!open || !room) return null;
  const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${room.code}`;

  const copy = async (val, setter) => {
    try {
      await navigator.clipboard.writeText(val);
    } catch {
      // fallback
    }
    setter(true);
    setTimeout(() => setter(false), 1600);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="kraft-card modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2 className="modal-title">INFO RUANGAN</h2>
          <button className="icon-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="invite-code-banner compact">
          <div>
            <div className="invite-banner-label">KODE ROOM ({room.name})</div>
            <div className="invite-code-value">{room.code}</div>
          </div>
          <div className="invite-actions">
            <button className="btn-invite-primary" onClick={() => copy(room.code, setCopiedCode)}>
              {copiedCode ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedCode ? 'Disalin' : 'Kode'}</span>
            </button>
            <button className="btn-invite-secondary" onClick={() => copy(inviteUrl, setCopiedLink)}>
              {copiedLink ? <Check size={14} /> : <Link2 size={14} />}
              <span>{copiedLink ? 'Disalin' : 'Link'}</span>
            </button>
          </div>
        </div>

        <div className="info-stats-note">
          Mode: <strong>Guest / Anonim</strong> &bull; Kecepatan:{' '}
          <strong>{room.settings.speed === 'fast' ? 'Cepat' : 'Normal'}</strong> &bull; Batas:{' '}
          <strong>{room.settings.maxRounds} ronde</strong>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          <button
            className="btn-tan full-width"
            onClick={() => {
              onClose();
              onOpenHowToPlay();
            }}
          >
            <BookOpen size={16} />
            <span>CARA MAIN</span>
          </button>
          <button className="btn-danger-full" onClick={onLeave}>
            <LogOut size={16} />
            <span>KELUAR DARI RUANGAN</span>
          </button>
        </div>
      </div>
    </div>
  );
}
