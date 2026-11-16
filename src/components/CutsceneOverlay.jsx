import React from 'react';
import {
  Crown,
  Flame,
  Siren,
  Coins,
  Building2,
  Home,
  Sparkles,
  Handshake,
  Skull,
  Dices,
} from 'lucide-react';
import AvatarIcon from './AvatarIcon.jsx';

const MAJOR_KINDS = new Set(['game_start', 'jail_ott', 'jackpot', 'bankrupt', 'victory']);

function CutsceneIcon({ kind }) {
  switch (kind) {
    case 'victory':
      return <Crown size={30} />;
    case 'jackpot':
      return <Coins size={30} />;
    case 'jail_ott':
      return <Siren size={30} />;
    case 'bankrupt':
      return <Skull size={30} />;
    case 'upgrade_property':
      return <Building2 size={24} />;
    case 'buy_property':
      return <Home size={24} />;
    case 'dice_double':
      return <Dices size={24} />;
    case 'trade_deal':
      return <Handshake size={24} />;
    case 'card_draw':
      return <Sparkles size={24} />;
    default:
      return <Flame size={30} />;
  }
}

export default function CutsceneOverlay({ cutscene, onDismiss }) {
  if (!cutscene) return null;

  const isMajor = MAJOR_KINDS.has(cutscene.kind);
  const accent = cutscene.accent || '#f59e0b';
  const durationMs = cutscene.duration || (isMajor ? 2100 : 1600);

  if (isMajor) {
    return (
      <div
        key={cutscene.id}
        className={`cutscene-major-root kind-${cutscene.kind}`}
        style={{ '--cs-accent': accent, '--cs-dur': `${durationMs}ms` }}
        onClick={onDismiss}
        role="presentation"
      >
        {/* Cinematic letterbox bars */}
        <div className="cutscene-letterbox top" />
        <div className="cutscene-letterbox bottom" />

        {/* Theme atmospheric FX layer */}
        {cutscene.kind === 'jail_ott' && <div className="cutscene-siren-flash" />}
        {(cutscene.kind === 'jackpot' || cutscene.kind === 'victory' || cutscene.kind === 'game_start') && (
          <div className="cutscene-sunburst" />
        )}
        <div className="cutscene-speedlines" />

        {/* Center dramatic banner */}
        <div className="cutscene-major-banner">
          <div className="cutscene-avatar-ring">
            {cutscene.characterId ? (
              <AvatarIcon characterId={cutscene.characterId} size={62} />
            ) : (
              <CutsceneIcon kind={cutscene.kind} />
            )}
          </div>

          <div className="cutscene-major-copy">
            <div className="cutscene-badge">
              <CutsceneIcon kind={cutscene.kind} />
              <span>{cutscene.badge || 'CUTSCENE'}</span>
            </div>
            <h2 className="cutscene-title">{cutscene.title}</h2>
            {cutscene.subtitle && <p className="cutscene-subtitle">{cutscene.subtitle}</p>}
          </div>

          <div className="cutscene-progress-track">
            <div className="cutscene-progress-fill" />
          </div>
          <div className="cutscene-skip-hint">Klik di mana saja untuk melewati</div>
        </div>
      </div>
    );
  }

  // Dynamic non-blocking lower-third cutscene banner (keeps 3D camera swoop visible!)
  return (
    <div
      key={cutscene.id}
      className={`cutscene-ribbon-wrap kind-${cutscene.kind}`}
      style={{ '--cs-accent': accent, '--cs-dur': `${durationMs}ms` }}
      onClick={onDismiss}
      role="presentation"
    >
      <div className="cutscene-ribbon-card">
        <div className="cutscene-ribbon-stripe" />
        <div className="cutscene-ribbon-avatar">
          {cutscene.characterId ? (
            <AvatarIcon characterId={cutscene.characterId} size={42} />
          ) : (
            <CutsceneIcon kind={cutscene.kind} />
          )}
        </div>
        <div className="cutscene-ribbon-text">
          <div className="cutscene-ribbon-badge">
            <CutsceneIcon kind={cutscene.kind} />
            <span>{cutscene.badge}</span>
          </div>
          <div className="cutscene-ribbon-title">{cutscene.title}</div>
          {cutscene.subtitle && <div className="cutscene-ribbon-sub">{cutscene.subtitle}</div>}
        </div>
        <div className="cutscene-ribbon-timer">
          <div className="cutscene-progress-fill" />
        </div>
      </div>
    </div>
  );
}
