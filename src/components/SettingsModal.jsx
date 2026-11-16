import React, { useEffect, useState } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Music,
  MousePointerClick,
  Sparkles,
  RotateCcw,
  BookOpen,
  Play,
  Copy,
  Check,
  Link2,
  LogOut,
  ShieldCheck,
  Home,
  Clapperboard,
} from 'lucide-react';
import { soundEngine } from '../game/SoundEngine.js';

function VolumeSliderRow({
  icon,
  label,
  description,
  value,
  disabled,
  accentColor,
  onChange,
  onRelease,
  rightControl,
}) {
  return (
    <div className={`settings-row ${disabled ? 'is-muted' : ''}`}>
      <div className="settings-row-top">
        <div className="settings-row-title">
          <span className="settings-row-ic" style={{ background: accentColor }}>
            {icon}
          </span>
          <div>
            <div className="settings-label">{label}</div>
            <div className="settings-desc">{description}</div>
          </div>
        </div>
        <div className="settings-row-right">
          {rightControl}
          <span className="settings-pct-badge">{value}%</span>
        </div>
      </div>

      <div className="settings-slider-wrap">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onMouseUp={onRelease}
          onTouchEnd={onRelease}
          className="settings-range"
          style={{
            background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor} ${value}%, rgba(42, 29, 20, 0.2) ${value}%, rgba(42, 29, 20, 0.2) 100%)`,
          }}
          aria-label={label}
        />
      </div>
    </div>
  );
}

export default function SettingsModal({
  open,
  room,
  audioSettings,
  smoothAnimation,
  onToggleSmoothAnimation,
  onPreviewCutscene,
  onUpdateVolume,
  onToggleMute,
  onToggleBgm,
  onApplyPreset,
  onResetAudio,
  onOpenHowToPlay,
  onLeaveRoom,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState(room ? 'room' : 'audio');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveTab(room ? 'room' : 'audio');
    }
  }, [open, room]);

  if (!open) return null;

  const { master, music, ui, sfx, muted, bgmOn } = audioSettings;
  const inviteUrl = room ? `${window.location.origin}${window.location.pathname}?room=${room.code}` : '';
  const showRoomTab = Boolean(room) && activeTab === 'room';
  const showAudioTab = activeTab === 'audio';
  const showAnimTab = activeTab === 'anim';

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
    setTimeout(() => setter(false), 1600);
  };

  return (
    <div className="modal-backdrop settings-modal-backdrop" onClick={onClose}>
      <div
        className="kraft-card modal-card settings-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 496 }}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">PENGATURAN</h2>
            <div className="modal-sub">
              {room
                ? 'Info ruangan, audio (%) & mode animasi sinematik'
                : 'Pengaturan audio (%) & mode animasi sinematik'}
            </div>
          </div>
          <button className="icon-close-btn" onClick={onClose} aria-label="Tutup">
            <X size={20} />
          </button>
        </div>

        {/* Unified segmented tabs inside Settings: RUANGAN (in room) | AUDIO | ANIMASI */}
        <div className="tab-bar settings-tab-bar">
          {room && (
            <button
              type="button"
              className={`tab-btn ${activeTab === 'room' ? 'active' : ''}`}
              onClick={() => setActiveTab('room')}
            >
              <Home size={14} />
              <span>RUANGAN</span>
            </button>
          )}
          <button
            type="button"
            className={`tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
            onClick={() => setActiveTab('audio')}
          >
            <Volume2 size={14} />
            <span>AUDIO ({muted ? '0%' : `${master}%`})</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'anim' ? 'active' : ''}`}
            onClick={() => setActiveTab('anim')}
          >
            <Clapperboard size={14} />
            <span>ANIMASI</span>
            <span className={`settings-tab-pill ${smoothAnimation ? 'on' : ''}`}>
              {smoothAnimation ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        <div className="settings-scroll-body">
          {/* TAB 1: RUANGAN & KEAMANAN (only when in a room) */}
          {showRoomTab && (
            <div className="settings-room-panel">
              <div className="invite-code-banner compact">
                <div>
                  <div className="invite-banner-label">KODE ROOM ({room.name})</div>
                  <div className="invite-code-value">{room.code}</div>
                </div>
                <div className="invite-actions">
                  <button
                    type="button"
                    className="btn-invite-primary"
                    onClick={() => copyText(room.code, setCopiedCode)}
                  >
                    {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedCode ? 'Disalin' : 'Kode'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-invite-secondary"
                    onClick={() => copyText(inviteUrl, setCopiedLink)}
                  >
                    {copiedLink ? <Check size={14} /> : <Link2 size={14} />}
                    <span>{copiedLink ? 'Disalin' : 'Link'}</span>
                  </button>
                </div>
              </div>

              <div className="info-stats-note" style={{ marginTop: 10 }}>
                Mode: <strong>Guest / Anonim</strong> &bull; Kecepatan:{' '}
                <strong>{room.settings?.speed === 'fast' ? 'Cepat' : 'Normal'}</strong> &bull; Batas:{' '}
                <strong>{room.settings?.maxRounds || 25} ronde</strong>
              </div>

              <div className="shield-status-card">
                <div className="shield-status-head">
                  <ShieldCheck size={16} />
                  <span>PERISAI ANTI-EKSPLOIT AKTIF</span>
                </div>
                <p className="shield-status-desc">
                  Verifikasi identitas per-koneksi, anti-spoof Host, CSPRNG dadu, validasi transaksi dagang atomik, dan
                  pembatas spam RPC aktif menjaga permainan tetap adil.
                </p>
              </div>

              <div className="settings-footer-actions" style={{ marginTop: 10 }}>
                <button type="button" className="btn-tan" onClick={() => setActiveTab('anim')}>
                  <Clapperboard size={14} />
                  <span>Smooth: {smoothAnimation ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              {onLeaveRoom && (
                <button
                  type="button"
                  className="btn-danger-full"
                  style={{ marginTop: 10 }}
                  onClick={() => {
                    onClose();
                    onLeaveRoom();
                  }}
                >
                  <LogOut size={15} />
                  <span>KELUAR DARI RUANGAN</span>
                </button>
              )}
            </div>
          )}

          {/* TAB 2: AUDIO CONTROLS */}
          {showAudioTab && (
            <div className="settings-audio-panel">
              <div className="settings-preset-bar">
                <button
                  type="button"
                  className={`settings-preset-btn ${muted || master === 0 ? 'active' : ''}`}
                  onClick={onToggleMute}
                >
                  {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  <span>{muted ? 'Dibisukan' : 'Bisukan'}</span>
                </button>
                <button
                  type="button"
                  className={`settings-preset-btn ${!muted && master === 35 ? 'active' : ''}`}
                  onClick={() => onApplyPreset(35)}
                >
                  Pelan 35%
                </button>
                <button
                  type="button"
                  className={`settings-preset-btn ${!muted && master === 75 ? 'active' : ''}`}
                  onClick={() => onApplyPreset(75)}
                >
                  Sedang 75%
                </button>
                <button
                  type="button"
                  className={`settings-preset-btn ${!muted && master === 100 ? 'active' : ''}`}
                  onClick={() => onApplyPreset(100)}
                >
                  Penuh 100%
                </button>
              </div>

              <div className="settings-sliders-list">
                <VolumeSliderRow
                  icon={muted || master === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  label="Volume Utama (Master)"
                  description="Mengatur keseluruhan tingkat suara permainan"
                  value={muted ? 0 : master}
                  disabled={muted}
                  accentColor="#16a34a"
                  onChange={(val) => onUpdateVolume('master', val)}
                  onRelease={() => soundEngine.playTurnChime()}
                />

                <VolumeSliderRow
                  icon={<Music size={15} />}
                  label="Suara Musik Latar"
                  description="Iringan musik marimba ceria Nusantara"
                  value={music}
                  disabled={muted || !bgmOn || music === 0}
                  accentColor="#2563eb"
                  onChange={(val) => onUpdateVolume('music', val)}
                  rightControl={
                    <button
                      type="button"
                      className={`settings-mini-toggle ${bgmOn ? 'on' : ''}`}
                      onClick={onToggleBgm}
                    >
                      {bgmOn ? 'ON' : 'OFF'}
                    </button>
                  }
                />

                <VolumeSliderRow
                  icon={<MousePointerClick size={15} />}
                  label="Suara Klik & UI"
                  description="Suara tombol, tab menu, dan notifikasi giliran"
                  value={ui}
                  disabled={muted || ui === 0}
                  accentColor="#d97706"
                  onChange={(val) => onUpdateVolume('ui', val)}
                  onRelease={() => soundEngine.playClick()}
                  rightControl={
                    <button
                      type="button"
                      className="settings-test-btn"
                      onClick={() => soundEngine.playClick()}
                      title="Tes suara klik"
                    >
                      <Play size={11} />
                      <span>Tes</span>
                    </button>
                  }
                />

                <VolumeSliderRow
                  icon={<Sparkles size={15} />}
                  label="Efek Permainan (SFX)"
                  description="Dadu, langkah pion, beli properti, jackpot & sirine KPK"
                  value={sfx}
                  disabled={muted || sfx === 0}
                  accentColor="#dc2626"
                  onChange={(val) => onUpdateVolume('sfx', val)}
                  onRelease={() => soundEngine.playBuy()}
                  rightControl={
                    <button
                      type="button"
                      className="settings-test-btn"
                      onClick={() => soundEngine.playBuy()}
                      title="Tes efek permainan"
                    >
                      <Play size={11} />
                      <span>Tes</span>
                    </button>
                  }
                />
              </div>

              {!room && (
                <div className="shield-status-card" style={{ marginTop: 10 }}>
                  <div className="shield-status-head">
                    <ShieldCheck size={15} />
                    <span>PERISAI ANTI-EKSPLOIT AKTIF</span>
                  </div>
                  <p className="shield-status-desc">
                    Sesi tamu terenkripsi, dadu CSPRNG, proteksi anti-spoof Host, dan validasi transaksi atomik aktif.
                  </p>
                </div>
              )}

              <div className="settings-footer-actions">
                <button type="button" className="btn-tan" onClick={onResetAudio}>
                  <RotateCcw size={14} />
                  <span>Reset Suara</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SMOOTH ANIMATION & CUTSCENE */}
          {showAnimTab && (
            <div className="settings-anim-panel">
              <div className={`smooth-toggle-card ${smoothAnimation ? 'is-on' : ''}`}>
                <div className="smooth-toggle-head">
                  <div className="settings-row-title">
                    <span
                      className="settings-row-ic"
                      style={{ background: smoothAnimation ? '#16a34a' : '#64748b' }}
                    >
                      <Clapperboard size={16} />
                    </span>
                    <div>
                      <div className="settings-label">Smooth Animation &amp; Cutscene</div>
                      <div className="settings-desc">
                        {smoothAnimation
                          ? 'AKTIF — Semua animasi super mulus + cutscene sinematik aktif'
                          : 'NONAKTIF (Default) — Animasi standar & ringan tanpa cutscene'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={smoothAnimation}
                    className={`kraft-switch ${smoothAnimation ? 'on' : ''}`}
                    onClick={() => onToggleSmoothAnimation(!smoothAnimation)}
                  >
                    <span className="kraft-switch-thumb" />
                    <span className="kraft-switch-label">{smoothAnimation ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                <div className="smooth-mode-pills">
                  <button
                    type="button"
                    className={`smooth-mode-pill ${!smoothAnimation ? 'active' : ''}`}
                    onClick={() => onToggleSmoothAnimation(false)}
                  >
                    Standar / Biasa (OFF)
                  </button>
                  <button
                    type="button"
                    className={`smooth-mode-pill ${smoothAnimation ? 'active on' : ''}`}
                    onClick={() => onToggleSmoothAnimation(true)}
                  >
                    Smooth + Cutscene (ON)
                  </button>
                </div>
              </div>

              <div className="smooth-features-box">
                <div className="smooth-features-title">Yang Aktif Saat Mode Smooth ON:</div>
                <ul className="smooth-features-list">
                  <li>
                    <strong>Animasi 3D Super Halus:</strong> Pion melompat lentur (<em>squash &amp; stretch</em>),
                    konstruksi Ruko/Gedung/Landmark memantul elastis, &amp; partikel koin/konfeti 3D.
                  </li>
                  <li>
                    <strong>Kamera Sinematik Otomatis:</strong> Kamera 3D meluncur halus mengikuti langkah pion,
                    mendekat ke dadu, hingga <em>fly-in</em> papan Nusantara.
                  </li>
                  <li>
                    <strong>Cutscene Penuh Momen Penting:</strong> Mulai Game, Dadu Double, Beli &amp; Upgrade Aset,
                    OTT KPK (sirine), Jackpot Kas Negara, Kartu Kebijakan/Lobi, Bangkrut, &amp; Juara.
                  </li>
                  <li>
                    <strong>UI &amp; Kartu 3D Spring:</strong> Transisi modal, HUD, laci Chat/Log, &amp; flip kartu 3D
                    yang mulus menyeluruh.
                  </li>
                </ul>
              </div>

              <div className="settings-footer-actions" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className={`btn-tan ${!smoothAnimation ? 'is-dimmed' : ''}`}
                  onClick={() => {
                    if (!smoothAnimation) {
                      onToggleSmoothAnimation(true);
                    }
                    onClose();
                    onPreviewCutscene?.();
                  }}
                >
                  <Play size={14} />
                  <span>Tes Cutscene Sinematik</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Semua kendali & bantuan terkumpul di satu modal — tidak ada tombol terpisah di luar Setting */}
        <div className="settings-modal-footer">
          {onOpenHowToPlay && (
            <button
              type="button"
              className="btn-tan"
              onClick={() => {
                onClose();
                onOpenHowToPlay();
              }}
            >
              <BookOpen size={14} />
              <span>Cara Main</span>
            </button>
          )}
          <button type="button" className="btn-green flex-1" onClick={onClose}>
            SIMPAN &amp; TUTUP
          </button>
        </div>
      </div>
    </div>
  );
}
