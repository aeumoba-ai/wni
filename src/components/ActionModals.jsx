import React from 'react';
import { Building2, ShoppingBag, Sparkles, AlertTriangle, Trophy, RotateCcw, LogOut } from 'lucide-react';
import {
  COLOR_GROUPS,
  formatRupiah,
  formatShortRupiah,
  getTileById,
} from '../../shared/boardData.js';
import AvatarIcon from './AvatarIcon.jsx';

export default function ActionModals({
  game,
  room,
  myId,
  onBuyDecision,
  onUpgradeDecision,
  onAckCard,
  onOpenPorto,
  onDeclareBankruptcy,
  onReturnToLobby,
  onLeaveRoom,
}) {
  const pending = game.pendingAction;
  const isMyPending = pending && pending.playerId === myId;
  const isHost = room.hostId === myId;

  // 1. GAME OVER PODIUM
  if (game.phase === 'GAME_OVER') {
    return (
      <div className="modal-backdrop">
        <div className="kraft-card modal-card" style={{ maxWidth: 520 }}>
          <div className="victory-banner">
            <Trophy size={42} className="trophy-icon" />
            <h2 className="victory-title">PERMAINAN SELESAI!</h2>
            {game.winner && (
              <p className="victory-sub">
                Juragan Terkaya Konoha: <strong>{game.winner.name}</strong> ({formatRupiah(game.winner.netWorth)})
              </p>
            )}
          </div>

          <div className="ranking-list">
            {(game.rankings || []).map((r, idx) => (
              <div key={r.id} className={`ranking-row ${idx === 0 ? 'first' : ''}`}>
                <div className="rank-num">#{idx + 1}</div>
                <AvatarIcon characterId={r.characterId} size={36} />
                <div className="rank-info">
                  <div className="rank-name">
                    {r.name} {r.id === myId ? '(Anda)' : ''}
                  </div>
                  <div className="rank-meta">
                    {r.bankrupt
                      ? 'Bangkrut / Disita Bank'
                      : `${r.propertyCount} properti • Tunai ${formatShortRupiah(r.money)}`}
                  </div>
                </div>
                <div className="rank-worth">{r.bankrupt ? 'Rp0' : formatShortRupiah(r.netWorth)}</div>
              </div>
            ))}
          </div>

          <div className="modal-btn-row" style={{ marginTop: 16 }}>
            {isHost ? (
              <button className="btn-green flex-1" onClick={onReturnToLobby}>
                <RotateCcw size={16} />
                <span>MAIN LAGI (KEMBALI KE LOBI)</span>
              </button>
            ) : (
              <div className="waiting-guest-note flex-1">Menunggu Host untuk rematch...</div>
            )}
            <button className="btn-danger-sm" onClick={onLeaveRoom}>
              <LogOut size={16} />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE CARD POPUP (Visible to everyone, dismissible by active player)
  if (game.activeCard) {
    const card = game.activeCard;
    const isPolicy = card.deck === 'policy';
    return (
      <div className="modal-backdrop light">
        <div className={`kraft-card modal-card card-popup ${isPolicy ? 'policy' : 'lobby-deck'}`}>
          <div className="card-deck-badge">
            <Sparkles size={14} />
            <span>{isPolicy ? 'KARTU KEBIJAKAN PEMERINTAH' : 'KARTU LOBI ORANG DALAM'}</span>
          </div>
          <div className="card-drawer-name">Dibuka oleh {card.playerName}</div>
          <h3 className="card-title">{card.title}</h3>
          <p className="card-desc">{card.description}</p>
          {isMyPending ? (
            <button className="btn-green full-width" onClick={onAckCard}>
              TERIMA EFEK KARTU
            </button>
          ) : (
            <div className="waiting-guest-note">Menunggu {card.playerName} melanjutkan...</div>
          )}
        </div>
      </div>
    );
  }

  // 3. BUY PROPERTY MODAL (only for active human player)
  if (isMyPending && pending.type === 'buy_property') {
    const tile = getTileById(pending.tileId, game.board);
    const groupMeta = COLOR_GROUPS[tile.group] || { label: 'Aset', color: tile.color };
    return (
      <div className="modal-backdrop light">
        <div className="kraft-card modal-card" style={{ maxWidth: 420 }}>
          <div className="deed-header" style={{ background: tile.color || '#334155' }}>
            <span className="deed-group">
              {groupMeta.label}{tile.province ? ` · ${tile.province}` : ''}
            </span>
            <h3 className="deed-name">{tile.name}</h3>
          </div>

          <div className="deed-body">
            {tile.flavor && (
              <p style={{ margin: '0 0 10px', fontSize: 12.5, opacity: 0.85, lineHeight: 1.4 }}>
                {tile.flavor}
              </p>
            )}
            <div className="deed-price-row">
              <span>Harga Beli</span>
              <strong>{formatRupiah(tile.price)}</strong>
            </div>

            {tile.type === 'property' && (
              <div className="rent-table">
                <div><span>Sewa Dasar</span><strong>{formatShortRupiah(tile.rents[0])}</strong></div>
                <div><span>Level 1 (Ruko)</span><strong>{formatShortRupiah(tile.rents[1])}</strong></div>
                <div><span>Level 2 (Gedung)</span><strong>{formatShortRupiah(tile.rents[2])}</strong></div>
                <div><span>Level 3 (Landmark)</span><strong>{formatShortRupiah(tile.rents[3])}</strong></div>
                <div className="rent-note">Biaya bangun: {formatShortRupiah(tile.upgradeCost)} / level</div>
              </div>
            )}

            {tile.type === 'transport' && (
              <div className="rent-table">
                <div><span>Punya 1 Transportasi</span><strong>{formatShortRupiah(tile.rents[0])}</strong></div>
                <div><span>Punya 2 Transportasi</span><strong>{formatShortRupiah(tile.rents[1])}</strong></div>
                <div><span>Punya 3 Transportasi</span><strong>{formatShortRupiah(tile.rents[2])}</strong></div>
                <div><span>Punya 4 Transportasi</span><strong>{formatShortRupiah(tile.rents[3])}</strong></div>
              </div>
            )}

            {tile.type === 'utility' && (
              <div className="rent-table">
                <div><span>1 Utilitas BUMN</span><strong>120 rb × angka dadu</strong></div>
                <div><span>2 Utilitas BUMN</span><strong>250 rb × angka dadu</strong></div>
              </div>
            )}
          </div>

          <div className="modal-btn-row">
            <button className="btn-tan flex-1" onClick={() => onBuyDecision(false)}>
              LEWATI
            </button>
            <button className="btn-green flex-1" onClick={() => onBuyDecision(true)}>
              <ShoppingBag size={16} />
              <span>BELI ({formatShortRupiah(tile.price)})</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. UPGRADE PROPERTY MODAL
  if (isMyPending && pending.type === 'upgrade_property') {
    const tile = getTileById(pending.tileId, game.board);
    const levelNames = ['Tanah', 'Ruko', 'Gedung', 'Landmark'];
    const nextLvl = pending.level + 1;
    return (
      <div className="modal-backdrop light">
        <div className="kraft-card modal-card" style={{ maxWidth: 410 }}>
          <div className="deed-header" style={{ background: tile.color || '#334155' }}>
            <span className="deed-group">Kembangkan Properti</span>
            <h3 className="deed-name">{tile.name}</h3>
          </div>
          <div className="deed-body">
            <p className="upgrade-copy">
              Bangun <strong>{levelNames[nextLvl]} (Level {nextLvl})</strong> untuk menaikkan tarif sewa!
            </p>
            <div className="rent-table">
              <div><span>Sewa Saat Ini</span><strong>{formatShortRupiah(tile.rents[pending.level])}</strong></div>
              <div><span>Sewa Setelah Upgrade</span><strong className="text-green">{formatShortRupiah(tile.rents[nextLvl])}</strong></div>
              <div><span>Biaya Bangun</span><strong>{formatRupiah(pending.cost)}</strong></div>
            </div>
          </div>
          <div className="modal-btn-row">
            <button className="btn-tan flex-1" onClick={() => onUpgradeDecision(false)}>
              NANTI SAJA
            </button>
            <button className="btn-green flex-1" onClick={() => onUpgradeDecision(true)}>
              <Building2 size={16} />
              <span>BANGUN ({formatShortRupiah(pending.cost)})</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. DEBT RESOLUTION MODAL
  if (isMyPending && pending.type === 'debt_resolution') {
    const me = game.players.find((p) => p.id === myId);
    const deficit = Math.max(0, pending.amount - (me?.money || 0));
    return (
      <div className="modal-backdrop light">
        <div className="kraft-card modal-card" style={{ maxWidth: 430 }}>
          <div className="debt-header">
            <AlertTriangle size={28} />
            <h3>SALDO TIDAK CUKUP!</h3>
          </div>
          <p className="upgrade-copy">
            Kamu harus membayar <strong>{formatRupiah(pending.amount)}</strong> ({pending.reason}), tetapi saldomu hanya{' '}
            <strong>{formatRupiah(me?.money || 0)}</strong>. Kurang{' '}
            <strong className="text-red">{formatRupiah(deficit)}</strong>.
          </p>
          <p className="field-hint">
            Jual beberapa properti di <strong>PORTO</strong> untuk melunasi tagihan, atau nyatakan bangkrut.
          </p>
          <div className="modal-btn-row" style={{ marginTop: 14 }}>
            <button className="btn-green flex-1" onClick={onOpenPorto}>
              BUKA PORTO &amp; JUAL ASET
            </button>
            <button className="btn-danger-sm" onClick={onDeclareBankruptcy}>
              BANGKRUT
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
