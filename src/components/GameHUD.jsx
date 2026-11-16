import React, { useEffect, useRef, useState } from 'react';
import {
  MessageCircle,
  ScrollText,
  Volume2,
  VolumeX,
  Settings,
  Briefcase,
  ArrowLeftRight,
  Landmark,
  Dices,
  Crown,
  Bot,
  Camera,
  KeyRound,
  ShieldAlert,
  Music,
} from 'lucide-react';
import { formatRupiah, formatShortRupiah, JAIL_BAIL_AMOUNT } from '../../shared/boardData.js';
import { getCharacterById } from '../../shared/characters.js';
import AvatarIcon from './AvatarIcon.jsx';

export default function GameHUD({
  room,
  game,
  myId,
  dialogues,
  moneyDeltas,
  unreadChat,
  muted,
  bgmOn,
  onToggleMute,
  onToggleBgm,
  onResetCamera,
  onOpenChat,
  onOpenLog,
  onOpenRoomInfo,
  onOpenPorto,
  onOpenTrade,
  onRollDice,
  onPayBail,
  onUseJailCard,
}) {
  const [holding, setHolding] = useState(false);
  const [gaugePos, setGaugePos] = useState(25);
  const [localCountdown, setLocalCountdown] = useState(game.timeLeft || 0);
  const holdRef = useRef({ active: false, pos: 8, dir: 1, raf: null, lastTs: 0 });

  const me = game.players.find((p) => p.id === myId);
  const currentPlayer = game.players.find((p) => p.id === game.currentPlayerId);
  const isMyTurn = game.currentPlayerId === myId && !me?.bankrupt;
  const canRoll = isMyTurn && game.phase === 'WAITING_ROLL';

  useEffect(() => {
    setLocalCountdown(game.timeLeft || 0);
    if (!game.timeLeft || game.phase === 'MOVING' || game.phase === 'GAME_OVER') return;
    const id = setInterval(() => {
      setLocalCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [game.timeLeft, game.currentPlayerId, game.phase]);

  useEffect(() => {
    if (!canRoll && holdRef.current.active) {
      holdRef.current.active = false;
      cancelAnimationFrame(holdRef.current.raf);
      setHolding(false);
    }
  }, [canRoll]);

  const getModeFromPos = (pos) => {
    if (pos >= 82) return 'genap';
    if (pos >= 65) return 'ganjil';
    return 'acak';
  };

  const startHold = (e) => {
    if (!canRoll) return;
    e.preventDefault();
    holdRef.current.active = true;
    holdRef.current.pos = 6;
    holdRef.current.dir = 1;
    holdRef.current.lastTs = performance.now();
    setHolding(true);
    setGaugePos(6);

    const step = (ts) => {
      if (!holdRef.current.active) return;
      const dt = Math.min(0.05, (ts - holdRef.current.lastTs) / 1000);
      holdRef.current.lastTs = ts;
      let next = holdRef.current.pos + holdRef.current.dir * dt * 110;
      if (next >= 98) {
        next = 98;
        holdRef.current.dir = -1;
      } else if (next <= 2) {
        next = 2;
        holdRef.current.dir = 1;
      }
      holdRef.current.pos = next;
      setGaugePos(next);
      holdRef.current.raf = requestAnimationFrame(step);
    };
    holdRef.current.raf = requestAnimationFrame(step);
  };

  const releaseHold = () => {
    if (!holdRef.current.active) return;
    holdRef.current.active = false;
    cancelAnimationFrame(holdRef.current.raf);
    setHolding(false);
    const mode = getModeFromPos(holdRef.current.pos);
    onRollDice(mode);
  };

  const myPropertyCount = Object.values(game.properties || {}).filter((p) => p.ownerId === myId).length;
  const activeMode = getModeFromPos(gaugePos);
  const showLowTimeWarning = canRoll && localCountdown > 0 && localCountdown <= 10;

  return (
    <div className="hud-layer">
      {/* TOP BAR */}
      <div className="hud-top">
        {/* Top-left Round & Status */}
        <div className="hud-round-pill">
          <div className="hud-round-label">
            Ronde {game.round} dari {game.maxRounds}
          </div>
          <div className="hud-status-line">{game.statusText}</div>
        </div>

        {/* Top-center Tinted Player Cards (matching gameplay-2 & gameplay-3!) */}
        <div className="hud-players-row">
          {game.players.map((pl, idx) => {
            const char = getCharacterById(pl.characterId);
            const active = game.currentPlayerId === pl.id && !pl.bankrupt;
            const isMe = pl.id === myId;
            const speech = dialogues[pl.id];
            const delta = moneyDeltas[pl.id];
            return (
              <div key={pl.id} className="hud-player-wrap">
                <div
                  className={`hud-player-pill ${active ? 'active' : ''} ${pl.bankrupt ? 'bankrupt' : ''}`}
                  style={{
                    borderColor: char.color,
                    background: `linear-gradient(180deg, ${char.color}d8 0%, #17222ee6 100%)`,
                  }}
                >
                  <div className="hud-avatar-wrap">
                    <AvatarIcon characterId={pl.characterId} size={36} />
                    <span className="hud-seat-badge" style={{ background: char.color }}>
                      {idx === 0 ? <Crown size={10} /> : idx + 1}
                    </span>
                  </div>
                  <div className="hud-player-meta">
                    <div className="hud-player-name-row">
                      <span className="hud-player-name">{pl.name.toUpperCase()}</span>
                      {isMe && <span className="tag-anda">ANDA</span>}
                      {pl.isBot && <Bot size={12} className="bot-ic" />}
                      {pl.inJail && <span className="tag-jail">KPK</span>}
                    </div>
                    <div className="hud-player-money">
                      {pl.bankrupt ? 'BANGKRUT' : formatRupiah(pl.money).toUpperCase()}
                    </div>
                  </div>
                </div>

                {delta && (
                  <div key={delta.ts} className={`money-float ${delta.delta >= 0 ? 'pos' : 'neg'}`}>
                    {delta.label}
                  </div>
                )}

                {speech && (
                  <div key={speech.ts} className="speech-bubble">
                    &ldquo;{speech.text}&rdquo;
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Top-right Kas Negara & Controls */}
        <div className="hud-right-group">
          <div className="kas-pill" title="Total pajak terkumpul. Berhenti di petak Kas Negara untuk jackpot!">
            <Landmark size={18} />
            <div>
              <div className="kas-label">Kas Negara</div>
              <div className="kas-val">{formatShortRupiah(game.kasNegara).toUpperCase()}</div>
            </div>
          </div>

          <button className="room-code-chip" onClick={onOpenRoomInfo} title="Kode Room & Link Invite">
            <KeyRound size={13} />
            <span>{room.code}</span>
          </button>

          <div className="hud-icon-cluster">
            <button className="hud-circle-btn" onClick={onOpenChat} title="Obrolan">
              <MessageCircle size={17} />
              {unreadChat > 0 && <span className="unread-dot">{unreadChat}</span>}
            </button>
            <button className="hud-circle-btn" onClick={onOpenLog} title="Riwayat Permainan">
              <ScrollText size={17} />
            </button>
            <button
              className={`hud-circle-btn ${bgmOn ? 'on' : ''}`}
              onClick={onToggleBgm}
              title={bgmOn ? 'Matikan Musik Latar' : 'Nyalakan Musik Latar'}
            >
              <Music size={17} />
            </button>
            <button className="hud-circle-btn" onClick={onToggleMute} title={muted ? 'Nyalakan Suara' : 'Bisukan'}>
              {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
            <button className="hud-circle-btn" onClick={onResetCamera} title="Reset Kamera">
              <Camera size={17} />
            </button>
            <button className="hud-circle-btn" onClick={onOpenRoomInfo} title="Info Ruangan">
              <Settings size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* COUNTDOWN WARNING BANNER (matching gameplay-3.jpg!) */}
      {showLowTimeWarning && (
        <div className="countdown-toast">
          Sisa {localCountdown} detik! Setelah itu dadu dilempar otomatis.
        </div>
      )}

      {/* BOTTOM CONTROL DOCK (matching gameplay-2 & gameplay-3!) */}
      <div className="hud-bottom">
        <div className="kraft-card dock-card">
          <div className="dock-prompt-row">
            <span className="dock-prompt">
              {canRoll
                ? me?.inJail
                  ? 'Anda di Rutan KPK! Bayar tebusan atau lempar dadu kembar.'
                  : 'Giliran Anda. Lempar dadu.'
                : game.phase === 'GAME_OVER'
                  ? 'Permainan selesai!'
                  : `Giliran ${currentPlayer?.name || '...'}${game.phase === 'MOVING' ? ' sedang melangkah...' : ''}`}
            </span>
            {game.lastDice && (
              <span className="last-dice-badge">
                Dadu: {game.lastDice[0]} + {game.lastDice[1]} = {game.lastDice[0] + game.lastDice[1]}
              </span>
            )}
          </div>

          {canRoll && me?.inJail && (
            <div className="jail-quick-row">
              <button
                type="button"
                className="btn-jail-bail"
                disabled={me.money < JAIL_BAIL_AMOUNT}
                onClick={onPayBail}
              >
                <ShieldAlert size={15} />
                <span>Bayar Tebusan ({formatShortRupiah(JAIL_BAIL_AMOUNT)})</span>
              </button>
              {me.jailFreeCards > 0 && (
                <button type="button" className="btn-jail-card" onClick={onUseJailCard}>
                  Pakai Kartu Orang Dalam ({me.jailFreeCards})
                </button>
              )}
            </div>
          )}

          {/* Segmented ACAK | GANJIL | GENAP Meter (exact proportions of gameplay-2 & gameplay-3!) */}
          <div className={`dice-gauge ${holding ? 'active' : ''}`}>
            <div className={`gauge-seg acak ${holding && activeMode === 'acak' ? 'lit' : ''}`}>
              <span className="acak-card-icon">?</span>
              <span>ACAK</span>
            </div>
            <div className={`gauge-seg ganjil ${holding && activeMode === 'ganjil' ? 'lit' : ''}`}>
              <span>GANJIL</span>
            </div>
            <div className={`gauge-seg genap ${holding && activeMode === 'genap' ? 'lit' : ''}`}>
              <span>GENAP</span>
            </div>
            <div
              className="gauge-needle"
              style={{ left: `${gaugePos}%`, opacity: holding ? 1 : canRoll ? 0.55 : 0.15 }}
            />
          </div>

          {/* Primary Hold-to-Roll Green Button with Bottom Golden Charge Bar */}
          <button
            type="button"
            className={`btn-roll ${holding ? 'holding' : ''}`}
            disabled={!canRoll}
            onPointerDown={startHold}
            onPointerUp={releaseHold}
            onPointerLeave={() => {
              if (holdRef.current.active) releaseHold();
            }}
            onPointerCancel={() => {
              if (holdRef.current.active) releaseHold();
            }}
          >
            <div className="btn-roll-inner">
              <Dices size={19} />
              <span>
                {holding
                  ? `LEPAS (${activeMode.toUpperCase()})!`
                  : canRoll
                    ? 'TAHAN UNTUK MELEMPAR'
                    : 'MENUNGGU GILIRAN...'}
              </span>
              {canRoll && localCountdown > 0 && (
                <span className="roll-timer-circle">{localCountdown}</span>
              )}
            </div>
            <div
              className="roll-charge-bar"
              style={{ width: holding ? `${gaugePos}%` : '0%' }}
            />
          </button>

          <div className="dock-sub-row">
            <button type="button" className="btn-tan dock-sub-btn" onClick={onOpenPorto}>
              <Briefcase size={15} />
              <span>PORTO{myPropertyCount > 0 ? ` (${myPropertyCount})` : ''}</span>
            </button>
            <button
              type="button"
              className="btn-tan dock-sub-btn"
              onClick={onOpenTrade}
              disabled={!isMyTurn || game.phase !== 'WAITING_ROLL'}
              title={
                !isMyTurn || game.phase !== 'WAITING_ROLL'
                  ? 'Dagang tersedia sebelum lempar dadu saat giliran Anda'
                  : 'Ajukan penawaran dagang dengan pemain lain'
              }
            >
              <ArrowLeftRight size={15} />
              <span>DAGANG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
