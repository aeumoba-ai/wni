import React, { useEffect, useState } from 'react';
import {
  Users,
  KeyRound,
  Search,
  Lock,
  Globe,
  Shuffle,
  RefreshCw,
  ArrowRight,
  Settings,
  SlidersHorizontal,
  ChevronRight,
  Volume2,
  Clapperboard,
  BookOpen,
} from 'lucide-react';
import { CHARACTERS, RANDOM_GUEST_NAMES, getCharacterById } from '../../shared/characters.js';
import AvatarIcon from './AvatarIcon.jsx';

export default function LobbyModal({
  playerName,
  setPlayerName,
  characterId,
  setCharacterId,
  initialInviteCode,
  onCreateRoom,
  onJoinRoom,
  onPreviewRoom,
  onListPublicRooms,
  onOpenSettings,
  smoothAnimation = false,
  audioMaster = 0,
  busy,
  error,
}) {
  const [tab, setTab] = useState(initialInviteCode ? 'kode' : 'buat');
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPrivate, setIsPrivate] = useState(true);
  const [createPassword, setCreatePassword] = useState('');

  const [joinCode, setJoinCode] = useState(initialInviteCode || '');
  const [joinPassword, setJoinPassword] = useState('');
  const [invitePreview, setInvitePreview] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);

  const [publicRooms, setPublicRooms] = useState([]);
  const [loadingPublic, setLoadingPublic] = useState(false);

  const selectedChar = getCharacterById(characterId);

  useEffect(() => {
    if (initialInviteCode) {
      setTab('kode');
      setJoinCode(initialInviteCode);
    }
  }, [initialInviteCode]);

  useEffect(() => {
    const clean = joinCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (tab !== 'kode' || clean.length < 6) {
      setInvitePreview(null);
      setLookingUp(false);
      return;
    }
    let cancelled = false;
    setLookingUp(true);
    const t = setTimeout(async () => {
      try {
        const preview = await onPreviewRoom(clean);
        if (!cancelled) {
          setInvitePreview(preview || null);
          setLookingUp(false);
        }
      } catch {
        if (!cancelled) {
          setInvitePreview(null);
          setLookingUp(false);
        }
      }
    }, 320);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [joinCode, tab, onPreviewRoom]);

  const fetchPublicRooms = async () => {
    setLoadingPublic(true);
    try {
      const list = await onListPublicRooms();
      setPublicRooms(list || []);
    } catch {
      setPublicRooms([]);
    } finally {
      setLoadingPublic(false);
    }
  };

  useEffect(() => {
    if (tab === 'cari') {
      fetchPublicRooms();
    }
  }, [tab]);

  const randomizeName = () => {
    const pick = RANDOM_GUEST_NAMES[Math.floor(Math.random() * RANDOM_GUEST_NAMES.length)];
    setPlayerName(pick);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    onCreateRoom({
      playerName: playerName.trim() || 'Tamu',
      characterId,
      roomName: roomName.trim() || `Ruangan ${playerName.trim() || 'Tamu'}`,
      maxPlayers,
      isPrivate,
      password: createPassword.trim(),
    });
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    onJoinRoom({
      playerName: playerName.trim() || 'Tamu',
      characterId,
      code: joinCode.trim().toUpperCase(),
      password: joinPassword.trim(),
    });
  };

  return (
    <div className="lobby-overlay">
      <div className="kraft-card lobby-card">
        <div className="lobby-top-bar">
          <h1 className="game-logo" style={{ margin: 0 }}>MONOPOLI NEGERI KONOHA</h1>
        </div>
        <p className="lobby-subtitle">
          Main online bareng teman atau orang asing. Setiap pemain mulai dengan Rp15.000.000.
        </p>

        {/* SATU-SATUNYA TOMBOL PENGATURAN DI MENU UTAMA: semua pengaturan ada di sini */}
        <button
          type="button"
          className="main-settings-btn"
          onClick={onOpenSettings}
          title="Buka semua pengaturan: suara, animasi, cutscene, ruangan & cara main"
          aria-label="Buka Pengaturan (semua pengaturan)"
        >
          <span className="main-settings-ic">
            <SlidersHorizontal size={20} />
          </span>
          <span className="main-settings-copy">
            <span className="main-settings-title">
              <Settings size={15} />
              PENGATURAN
            </span>
            <span className="main-settings-sub">
              Semua pengaturan ada di sini — suara, animasi &amp; cutscene, info ruangan, cara main
            </span>
            <span className="main-settings-chips">
              <span className="main-settings-chip">
                <Volume2 size={11} /> Suara {audioMaster}%
              </span>
              <span className={`main-settings-chip ${smoothAnimation ? 'on' : ''}`}>
                <Clapperboard size={11} /> Animasi {smoothAnimation ? 'ON' : 'OFF'}
              </span>
              <span className="main-settings-chip">
                <BookOpen size={11} /> Cara Main
              </span>
            </span>
          </span>
          <ChevronRight size={20} className="main-settings-chevron" />
        </button>

        {/* Nama Pemain (Guest Only / Anonim) */}
        <div className="field-block">
          <div className="label-row">
            <label className="field-label" style={{ marginBottom: 0 }}>Nama pemain</label>
            <span className="guest-inline-tag">Guest / Anonim · Tanpa Login</span>
          </div>
          <div className="input-with-btn">
            <input
              type="text"
              className="kraft-input"
              maxLength={18}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Ketik nama panggilanmu..."
            />
            <button
              type="button"
              className="btn-dice-mini"
              onClick={randomizeName}
              title="Acak nama WNI"
            >
              <Shuffle size={16} />
            </button>
          </div>
        </div>

        {/* 2x5 Pion Picker matching gameplay-1.jpg */}
        <div className="field-block">
          <label className="field-label">Pion</label>
          <div className="pion-grid">
            {CHARACTERS.map((char) => {
              const active = char.id === characterId;
              return (
                <button
                  key={char.id}
                  type="button"
                  className={`pion-btn ${active ? 'active' : ''}`}
                  onClick={() => setCharacterId(char.id)}
                  title={`${char.name} — ${char.quote}`}
                >
                  <AvatarIcon characterId={char.id} size={34} />
                </button>
              );
            })}
          </div>
          <div className="pion-quote">
            {selectedChar.name}: &ldquo;{selectedChar.quote}&rdquo;
          </div>
        </div>

        {/* Segmented Tabs: BUAT | KODE | CARI */}
        <div className="tab-bar">
          <button
            type="button"
            className={`tab-btn ${tab === 'buat' ? 'active' : ''}`}
            onClick={() => setTab('buat')}
          >
            <Users size={15} />
            <span>BUAT</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${tab === 'kode' ? 'active' : ''}`}
            onClick={() => setTab('kode')}
          >
            <KeyRound size={15} />
            <span>KODE</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${tab === 'cari' ? 'active' : ''}`}
            onClick={() => setTab('cari')}
          >
            <Search size={15} />
            <span>CARI</span>
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* TAB 1: BUAT */}
        {tab === 'buat' && (
          <form onSubmit={handleCreateSubmit} className="tab-panel">
            <div className="field-block">
              <label className="field-label">Nama ruangan</label>
              <input
                type="text"
                className="kraft-input"
                maxLength={24}
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder={`Ruangan ${playerName.trim() || 'Miko'}`}
              />
            </div>

            <div className="field-block">
              <label className="field-label">Jumlah pemain</label>
              <div className="count-row">
                {[2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`count-btn ${maxPlayers === n ? 'active' : ''}`}
                    onClick={() => setMaxPlayers(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="field-hint">Kursi kosong bisa diisi bot di lobi.</div>
            </div>

            <div className="visibility-row">
              <button
                type="button"
                className={`vis-btn ${isPrivate ? 'active' : ''}`}
                onClick={() => setIsPrivate(true)}
              >
                <Lock size={14} />
                <span>Privat (lewat kode)</span>
              </button>
              <button
                type="button"
                className={`vis-btn ${!isPrivate ? 'active' : ''}`}
                onClick={() => setIsPrivate(false)}
              >
                <Globe size={14} />
                <span>Publik (terdaftar)</span>
              </button>
            </div>

            <div className="field-block">
              <label className="field-label">Password (opsional)</label>
              <input
                type="text"
                className="kraft-input"
                maxLength={24}
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Kosongkan kalau tanpa password"
              />
            </div>

            <button type="submit" className="btn-green full-width" disabled={busy}>
              {busy ? 'MEMBUAT RUANGAN...' : 'BUAT RUANGAN'}
            </button>
          </form>
        )}

        {/* TAB 2: KODE */}
        {tab === 'kode' && (
          <form onSubmit={handleJoinSubmit} className="tab-panel">
            {invitePreview && (
              <div className="invite-preview-box">
                <div className="invite-preview-title">
                  Ruangan ditemukan: <strong>{invitePreview.name}</strong>
                </div>
                <div className="invite-preview-meta">
                  Host: {invitePreview.hostName} &bull; {invitePreview.playerCount}/{invitePreview.maxPlayers} pemain
                  {invitePreview.hasPassword ? ' • Pakai Password' : ' • Tanpa Password'}
                </div>
              </div>
            )}

            <div className="field-block">
              <label className="field-label">Kode Ruangan (6 karakter dari teman)</label>
              <input
                type="text"
                className="kraft-input code-input"
                maxLength={8}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="CONTOH: KNH482"
              />
              {lookingUp && <div className="field-hint">Mencari ruangan {joinCode}...</div>}
            </div>

            {(!invitePreview || invitePreview.hasPassword) && (
              <div className="field-block">
                <label className="field-label">Password ruangan (opsional)</label>
                <input
                  type="text"
                  className="kraft-input"
                  maxLength={24}
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  placeholder="Kosongkan kalau tanpa password"
                />
              </div>
            )}

            <button
              type="submit"
              className="btn-green full-width"
              disabled={busy || joinCode.trim().length < 4}
            >
              {busy ? 'MENGHUBUNGKAN...' : 'GABUNG RUANGAN'}
            </button>
          </form>
        )}

        {/* TAB 3: CARI */}
        {tab === 'cari' && (
          <div className="tab-panel">
            <div className="public-header">
              <span className="field-label" style={{ marginBottom: 0 }}>
                Daftar Ruangan Publik ({publicRooms.length})
              </span>
              <button type="button" className="btn-small-tan" onClick={fetchPublicRooms} disabled={loadingPublic}>
                <RefreshCw size={13} className={loadingPublic ? 'spin' : ''} />
                <span>Segarkan</span>
              </button>
            </div>

            {publicRooms.length === 0 ? (
              <div className="empty-rooms">
                Belum ada ruangan publik yang aktif. Buat ruangan baru atau gabung lewat kode teman di tab <strong>KODE</strong>!
              </div>
            ) : (
              <div className="public-list">
                {publicRooms.map((r) => (
                  <div key={r.code} className="public-room-row">
                    <div>
                      <div className="public-room-name">
                        {r.name} {r.hasPassword && <Lock size={13} style={{ display: 'inline' }} />}
                      </div>
                      <div className="public-room-meta">
                        Kode: <strong>{r.code}</strong> &bull; Host: {r.hostName} &bull; {r.playerCount}/{r.maxPlayers}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-green-sm"
                      onClick={() => {
                        if (r.hasPassword) {
                          setJoinCode(r.code);
                          setTab('kode');
                        } else {
                          onJoinRoom({
                            playerName: playerName.trim() || 'Tamu',
                            characterId,
                            code: r.code,
                            password: '',
                          });
                        }
                      }}
                    >
                      <span>Gabung</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
