import React, { useEffect, useRef, useState } from 'react';
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
  Monitor,
  Building2,
  Sun,
  SlidersHorizontal,
  Grid3X3,
  Gauge,
} from 'lucide-react';
import { soundEngine } from '../game/SoundEngine.js';
import { GRAPHICS_PRESETS, getEffectiveGraphicsSettings } from '../game/GraphicsSettings.js';

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
  graphicsSettings,
  onSetVisualStyle,
  onSetGraphicsPreset,
  onUpdateGraphicsCustom,
  onResetGraphics,
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

  // The room object is replaced on every network update (chat, timer, dice...).
  // Resetting the tab on those updates used to bounce the player straight back to
  // RUANGAN, making the GRAFIK/AUDIO tabs impossible to stay on during a match.
  // Only reset when the modal is (re)opened or the joined room actually changes.
  const wasOpenRef = useRef(false);
  const roomCodeRef = useRef(room?.code || null);

  useEffect(() => {
    const roomCode = room?.code || null;
    const justOpened = open && !wasOpenRef.current;
    const roomChanged = open && roomCode !== roomCodeRef.current;
    if (justOpened || roomChanged) {
      setActiveTab(room ? 'room' : 'audio');
    }
    wasOpenRef.current = open;
    roomCodeRef.current = roomCode;
  }, [open, room]);

  if (!open) return null;

  const { master, music, ui, sfx, muted, bgmOn } = audioSettings;
  const inviteUrl = room ? `${window.location.origin}${window.location.pathname}?room=${room.code}` : '';
  // Never leave the body empty if the RUANGAN tab is selected while no room exists.
  const currentTab = !room && activeTab === 'room' ? 'audio' : activeTab;
  const showRoomTab = Boolean(room) && currentTab === 'room';
  const showAudioTab = currentTab === 'audio';
  const showAnimTab = currentTab === 'anim';
  const showGraphicsTab = currentTab === 'graphics';
  const effectiveGraphics = getEffectiveGraphicsSettings(graphicsSettings);

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
        style={{ maxWidth: currentTab === 'graphics' || room ? 590 : 496 }}
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

        {/* Unified settings tabs: RUANGAN (in room) | AUDIO | ANIMASI | GRAFIK */}
        <div className={`tab-bar settings-tab-bar ${room ? 'has-room' : ''}`}>
          {room && (
            <button
              type="button"
              className={`tab-btn ${currentTab === 'room' ? 'active' : ''}`}
              onClick={() => setActiveTab('room')}
            >
              <Home size={14} />
              <span>RUANGAN</span>
            </button>
          )}
          <button
            type="button"
            className={`tab-btn ${currentTab === 'audio' ? 'active' : ''}`}
            onClick={() => setActiveTab('audio')}
          >
            <Volume2 size={14} />
            <span>AUDIO ({muted ? '0%' : `${master}%`})</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${currentTab === 'anim' ? 'active' : ''}`}
            onClick={() => setActiveTab('anim')}
          >
            <Clapperboard size={14} />
            <span>ANIMASI</span>
            <span className={`settings-tab-pill ${smoothAnimation ? 'on' : ''}`}>
              {smoothAnimation ? 'ON' : 'OFF'}
            </span>
          </button>
          <button
            type="button"
            className={`tab-btn ${currentTab === 'graphics' ? 'active' : ''}`}
            onClick={() => setActiveTab('graphics')}
            aria-label="Pengaturan grafik game"
          >
            <Monitor size={14} />
            <span>GRAFIK</span>
            <span className={`settings-tab-pill ${graphicsSettings?.preset === 'high' ? 'on' : ''}`}>
              {effectiveGraphics.label}
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

          {/* TAB 4: GAME GRAPHICS PRESETS + OPTIONAL ADVANCED CUSTOMIZATION */}
          {showGraphicsTab && (
            <div className="settings-graphics-panel">
              <div className="graphics-intro-card">
                <div className="graphics-intro-icon"><Monitor size={19} /></div>
                <div>
                  <div className="graphics-intro-title">KUALITAS GRAFIK GAME</div>
                  <div className="graphics-intro-desc">
                    Atur kejernihan render 3D, bayangan, detail bangunan dan kepadatan efek. Pilihan ini hanya berlaku di perangkat Anda.
                  </div>
                </div>
              </div>

              <div className="visual-style-section">
                <div className="visual-style-heading">
                  <div>
                    <div className="smooth-features-title">GAYA VISUAL PETA &amp; KARAKTER</div>
                    <div className="settings-desc">Bisa diganti kapan saja tanpa mengubah progres, room, atau aturan permainan.</div>
                  </div>
                  <span className={`visual-style-status ${graphicsSettings?.visualStyle === 'pixel' ? 'pixel' : ''}`}>
                    {graphicsSettings?.visualStyle === 'pixel' ? 'PIXEL AKTIF' : 'BIASA AKTIF'}
                  </span>
                </div>
                <div className="visual-style-grid">
                  <button
                    type="button"
                    className={`visual-style-card ${graphicsSettings?.visualStyle !== 'pixel' ? 'active' : ''}`}
                    onClick={() => onSetVisualStyle?.('standard')}
                    aria-pressed={graphicsSettings?.visualStyle !== 'pixel'}
                  >
                    <span className="visual-style-art standard-art"><Monitor size={27} /><span>3D</span></span>
                    <span className="visual-style-copy">
                      <strong>BIASA · 3D HALUS</strong>
                      <small>Gaya visual Monopoli Konoha saat ini, dengan model 3D dan gerakan normal/smooth mengikuti pilihan Animasi.</small>
                    </span>
                    <span className="visual-style-select">{graphicsSettings?.visualStyle !== 'pixel' ? 'AKTIF' : 'PILIH'}</span>
                  </button>
                  <button
                    type="button"
                    className={`visual-style-card pixel ${graphicsSettings?.visualStyle === 'pixel' ? 'active' : ''}`}
                    onClick={() => onSetVisualStyle?.('pixel')}
                    aria-pressed={graphicsSettings?.visualStyle === 'pixel'}
                  >
                    <span className="visual-style-art pixel-art"><Grid3X3 size={26} /><span>8-BIT</span></span>
                    <span className="visual-style-copy">
                      <strong>PIXEL · RETRO 8-BIT</strong>
                      <small>Papan/kota dan pion dirender low-resolution pixelated, material lebih faceted, UI judul memakai Pixelify Sans.</small>
                    </span>
                    <span className="visual-style-select">{graphicsSettings?.visualStyle === 'pixel' ? 'AKTIF' : 'PILIH'}</span>
                  </button>
                </div>
                {graphicsSettings?.visualStyle === 'pixel' && (
                  <div className="pixel-animation-note">
                    <Clapperboard size={15} /> <span><strong>Animasi Pixel aktif:</strong> langkah pion, lempar dadu, pantulan bangunan dan efek partikel memakai timing bertahap/blocky agar selaras dengan gaya retro. Jika Smooth Animation OFF, versi pixel tampil sederhana dan ringan.</span>
                  </div>
                )}
              </div>

              <div className="graphics-preset-grid">
                {Object.entries(GRAPHICS_PRESETS).map(([key, profile]) => (
                  <button
                    key={key}
                    type="button"
                    className={`graphics-preset-card ${graphicsSettings?.preset === key ? 'active' : ''} ${key}`}
                    onClick={() => onSetGraphicsPreset?.(key)}
                    aria-pressed={graphicsSettings?.preset === key}
                  >
                    <span className="graphics-preset-icon">
                      {key === 'low' ? <Gauge size={19} /> : key === 'high' ? <Sparkles size={19} /> : <Monitor size={19} />}
                    </span>
                    <span className="graphics-preset-name">{profile.label}</span>
                    <span className="graphics-preset-desc">{profile.description}</span>
                    <span className="graphics-preset-check">{graphicsSettings?.preset === key ? 'TERPILIH' : 'PILIH'}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className={`graphics-preset-card custom ${graphicsSettings?.preset === 'custom' ? 'active' : ''}`}
                  onClick={() => onSetGraphicsPreset?.('custom')}
                  aria-pressed={graphicsSettings?.preset === 'custom'}
                >
                  <span className="graphics-preset-icon"><SlidersHorizontal size={19} /></span>
                  <span className="graphics-preset-name">KUSTOM</span>
                  <span className="graphics-preset-desc">Atur sendiri detail grafik sesuai perangkat & selera.</span>
                  <span className="graphics-preset-check">{graphicsSettings?.preset === 'custom' ? 'TERPILIH' : 'OPSIONAL'}</span>
                </button>
              </div>

              {graphicsSettings?.preset === 'custom' && (
                <div className="graphics-custom-box">
                  <div className="graphics-custom-heading">
                    <div>
                      <div className="smooth-features-title"><SlidersHorizontal size={15} /> ADVANCED OPTION · GRAFIK KUSTOM</div>
                      <div className="settings-desc">Kustomisasi bersifat opsional dan langsung diterapkan. Skala perangkat mobile otomatis dibatasi agar tidak terlalu berat.</div>
                    </div>
                    <button type="button" className="settings-mini-toggle" onClick={onResetGraphics} title="Kembalikan pengaturan grafik seimbang">Reset</button>
                  </div>

                  <div className="graphics-custom-sliders">
                    <label className="graphics-slider-row">
                      <span><span className="graphics-slider-label"><Monitor size={14} /> Resolusi render</span><strong>{Math.round(effectiveGraphics.resolution * 100)}%</strong></span>
                      <input type="range" min="65" max="200" step="5" value={Math.round(effectiveGraphics.resolution * 100)} onChange={(e) => onUpdateGraphicsCustom?.({ resolution: Number(e.target.value) / 100 })} />
                      <small>Kejernihan 3D / pixel ratio. Lebih tinggi memakai GPU lebih banyak.</small>
                    </label>
                    <label className="graphics-slider-row">
                      <span><span className="graphics-slider-label"><Sparkles size={14} /> Kepadatan efek</span><strong>{Math.round(effectiveGraphics.effects * 100)}%</strong></span>
                      <input type="range" min="25" max="250" step="5" value={Math.round(effectiveGraphics.effects * 100)} onChange={(e) => onUpdateGraphicsCustom?.({ effects: Number(e.target.value) / 100 })} />
                      <small>Jumlah koin, konfeti, kilau, dan partikel pada momen animasi.</small>
                    </label>
                    <label className="graphics-slider-row">
                      <span><span className="graphics-slider-label"><Building2 size={14} /> Tinggi bangunan</span><strong>{Math.round(effectiveGraphics.buildingHeight * 100)}%</strong></span>
                      <input type="range" min="85" max="180" step="5" value={Math.round(effectiveGraphics.buildingHeight * 100)} onChange={(e) => onUpdateGraphicsCustom?.({ buildingHeight: Number(e.target.value) / 100 })} />
                      <small>Ruko, gedung dan menara landmark upgrade jadi lebih menjulang.</small>
                    </label>
                    <label className="graphics-slider-row">
                      <span><span className="graphics-slider-label"><Sun size={14} /> Detail dekorasi</span><strong>{Math.round(effectiveGraphics.detail * 100)}%</strong></span>
                      <input type="range" min="50" max="180" step="5" value={Math.round(effectiveGraphics.detail * 100)} onChange={(e) => onUpdateGraphicsCustom?.({ detail: Number(e.target.value) / 100 })} />
                      <small>Kaca fasad, lis atap, detail ornamen, dan geometri partikel.</small>
                    </label>
                  </div>

                  <label className="graphics-shadow-toggle">
                    <span className="graphics-shadow-icon"><Sun size={16} /></span>
                    <span><strong>Bayangan 3D lembut</strong><small>Bayangan bangunan dan objek pada papan/kota.</small></span>
                    <input type="checkbox" checked={Boolean(effectiveGraphics.shadows)} onChange={(e) => onUpdateGraphicsCustom?.({ shadows: e.target.checked })} />
                  </label>
                  <div className="graphics-mobile-note">Di HP, resolusi puncak tetap dibatasi otomatis berdasarkan ukuran layar untuk membantu menjaga performa dan suhu perangkat.</div>
                </div>
              )}

              <div className="graphics-quality-note">
                <ShieldCheck size={14} /> Grafik hanya mengubah tampilan lokal — tidak memengaruhi aturan, keadilan, atau sinkronisasi multiplayer.
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
