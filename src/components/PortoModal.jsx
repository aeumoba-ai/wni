import React from 'react';
import { X, Building2, Coins } from 'lucide-react';
import {
  BOARD_TILES,
  formatRupiah,
  formatShortRupiah,
} from '../../shared/boardData.js';

const LEVEL_LABELS = ['Tanah Kosong', 'Lv.1 Ruko', 'Lv.2 Gedung', 'Lv.3 Landmark'];

export default function PortoModal({ game, myId, onUpgrade, onSell, onClose }) {
  const me = game.players.find((p) => p.id === myId);
  const isMyTurn = game.currentPlayerId === myId && !me?.bankrupt;

  const myTiles = BOARD_TILES.filter((t) => game.properties?.[t.id]?.ownerId === myId).map((tile) => {
    const prop = game.properties[tile.id];
    const invested = (tile.price || 0) + (prop.level || 0) * (tile.upgradeCost || 0);
    const sellValue = Math.round(invested * 0.7);
    return { tile, prop, sellValue };
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="kraft-card modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">PORTOFOLIO ASET</h2>
            <div className="modal-sub">
              Tunai: <strong>{formatRupiah(me?.money || 0)}</strong> &bull; Kekayaan Bersih:{' '}
              <strong>{formatRupiah(me?.netWorth || 0)}</strong>
              {me?.jailFreeCards > 0 ? ` • ${me.jailFreeCards} Kartu Orang Dalam` : ''}
            </div>
          </div>
          <button className="icon-close-btn" onClick={onClose} aria-label="Tutup">
            <X size={20} />
          </button>
        </div>

        {myTiles.length === 0 ? (
          <div className="empty-rooms">
            Kamu belum memiliki properti apa pun. Lempar dadu dan borong wilayah Indonesia!
          </div>
        ) : (
          <div className="porto-list">
            {myTiles.map(({ tile, prop, sellValue }) => {
              const canUpgrade =
                isMyTurn &&
                game.phase === 'WAITING_ROLL' &&
                tile.type === 'property' &&
                prop.level < 3 &&
                (me?.money || 0) >= tile.upgradeCost;

              return (
                <div key={tile.id} className="porto-row">
                  <div className="porto-swatch" style={{ background: tile.color || '#475569' }} />
                  <div className="porto-info">
                    <div className="porto-name">{tile.name}</div>
                    <div className="porto-meta">
                      {tile.type === 'property'
                        ? `${LEVEL_LABELS[prop.level]} • Sewa ${formatShortRupiah(tile.rents[prop.level])}`
                        : tile.type === 'transport'
                          ? 'Transportasi Strategis'
                          : 'Utilitas Publik'}
                    </div>
                  </div>
                  <div className="porto-actions">
                    {tile.type === 'property' && prop.level < 3 && (
                      <button
                        type="button"
                        className="btn-green-sm"
                        disabled={!canUpgrade}
                        onClick={() => onUpgrade(tile.id)}
                        title={
                          canUpgrade
                            ? `Upgrade ke ${LEVEL_LABELS[prop.level + 1]}`
                            : 'Hanya bisa upgrade di awal giliran Anda jika saldo cukup'
                        }
                      >
                        <Building2 size={13} />
                        <span>+{formatShortRupiah(tile.upgradeCost)}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-danger-xs"
                      disabled={!isMyTurn}
                      onClick={() => onSell(tile.id)}
                      title="Jual ke bank (70% nilai total)"
                    >
                      <Coins size={13} />
                      <span>Jual ({formatShortRupiah(sellValue)})</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
