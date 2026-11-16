import React from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Music,
  MousePointerClick,
  Sparkles,
  RotateCcw,
  KeyRound,
  BookOpen,
  Play,
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
  audioSettings,
  onUpdateVolume,
  onToggleMute,
  onToggleBgm,
  onApplyPreset,
  onResetAudio,
  inRoom,
  onOpenRoomInfo,
  onOpenHowToPlay,
  onClose,
}) {
  if (!open) return null;

  const { master, music, ui, sfx, muted, bgmOn } = audioSettings;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="kraft-card modal-card settings-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480 }}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">PENGATURAN SUARA</h2>
            <div className="modal-sub">Atur persentase volume musik, klik UI, dan efek game</div>
          </div>
          <button className="icon-close-btn" onClick={onClose} aria-label="Tutup">
            <X size={20} />
          </button>
        </div>

        {/* Quick Preset Strip */}
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

        {/* 4 Independent Volume Percentage Sliders */}
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

        {/* Footer Actions */}
        <div className="settings-footer-actions">
          <button type="button" className="btn-tan" onClick={onResetAudio}>
            <RotateCcw size={14} />
            <span>Reset Default</span>
          </button>

          {inRoom && onOpenRoomInfo && (
            <button
              type="button"
              className="btn-tan"
              onClick={() => {
                onClose();
                onOpenRoomInfo();
              }}
            >
              <KeyRound size={14} />
              <span>Info Room</span>
            </button>
          )}

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
        </div>

        <button type="button" className="btn-green full-width" onClick={onClose} style={{ marginTop: 10 }}>
          SIMPAN & TUTUP
        </button>
      </div>
    </div>
  );
}
