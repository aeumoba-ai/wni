import React, { useState } from 'react';
import { X, ArrowLeftRight, Check, Ban } from 'lucide-react';
import { BOARD_TILES, formatRupiah, formatShortRupiah } from '../../shared/boardData.js';
import AvatarIcon from './AvatarIcon.jsx';

export function IncomingTradeModal({ trade, onRespond }) {
  if (!trade) return null;
  const tileName = (id) => BOARD_TILES.find((t) => t.id === id)?.name || `Petak #${id}`;
  return (
    <div className="modal-backdrop">
      <div className="kraft-card modal-card" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h2 className="modal-title">TAWARAN DAGANG MASUK</h2>
        </div>
        <p className="upgrade-copy">
          <strong>{trade.fromName}</strong> mengajak kamu berdagang:
        </p>

        <div className="trade-summary-grid">
          <div className="trade-col">
            <div className="trade-col-title">Kamu Menerima</div>
            {trade.offerMoney > 0 && <div className="trade-chip money">+{formatRupiah(trade.offerMoney)}</div>}
            {trade.offerTiles.map((tid) => (
              <div key={tid} className="trade-chip">{tileName(tid)}</div>
            ))}
            {trade.offerMoney === 0 && trade.offerTiles.length === 0 && (
              <div className="muted-sm">Tidak ada</div>
            )}
          </div>
          <div className="trade-col">
            <div className="trade-col-title">Kamu Memberikan</div>
            {trade.requestMoney > 0 && <div className="trade-chip money">-{formatRupiah(trade.requestMoney)}</div>}
            {trade.requestTiles.map((tid) => (
              <div key={tid} className="trade-chip">{tileName(tid)}</div>
            ))}
            {trade.requestMoney === 0 && trade.requestTiles.length === 0 && (
              <div className="muted-sm">Tidak ada</div>
            )}
          </div>
        </div>

        <div className="modal-btn-row" style={{ marginTop: 14 }}>
          <button className="btn-danger-sm flex-1" onClick={() => onRespond(false)}>
            <Ban size={15} />
            <span>TOLAK</span>
          </button>
          <button className="btn-green flex-1" onClick={() => onRespond(true)}>
            <Check size={15} />
            <span>TERIMA DEAL!</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TradeModal({ game, myId, onPropose, onClose }) {
  const me = game.players.find((p) => p.id === myId);
  const targets = game.players.filter((p) => p.id !== myId && !p.bankrupt);

  const [targetId, setTargetId] = useState(targets[0]?.id || '');
  const [offerTiles, setOfferTiles] = useState([]);
  const [requestTiles, setRequestTiles] = useState([]);
  const [offerMoney, setOfferMoney] = useState(0);
  const [requestMoney, setRequestMoney] = useState(0);

  const target = targets.find((t) => t.id === targetId);
  const myTiles = BOARD_TILES.filter((t) => game.properties?.[t.id]?.ownerId === myId);
  const targetTiles = BOARD_TILES.filter((t) => game.properties?.[t.id]?.ownerId === targetId);

  const toggle = (list, setter, id) => {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetId) return;
    onPropose({
      toId: targetId,
      offerTiles,
      requestTiles,
      offerMoney: Number(offerMoney) || 0,
      requestMoney: Number(requestMoney) || 0,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="kraft-card modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <h2 className="modal-title">DAGANG PROPERTI</h2>
          <button className="icon-close-btn" onClick={onClose} aria-label="Tutup">
            <X size={20} />
          </button>
        </div>

        {targets.length === 0 ? (
          <div className="empty-rooms">Tidak ada pemain lain yang aktif.</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field-block">
              <label className="field-label">Pilih Lawan Dagang</label>
              <div className="trade-target-row">
                {targets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`trade-target-btn ${targetId === t.id ? 'active' : ''}`}
                    onClick={() => {
                      setTargetId(t.id);
                      setRequestTiles([]);
                    }}
                  >
                    <AvatarIcon characterId={t.characterId} size={26} />
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="trade-summary-grid">
              <div className="trade-col">
                <div className="trade-col-title">Tawaran Kamu ({formatShortRupiah(me?.money || 0)})</div>
                <label className="field-hint">Uang Tunai (Rp)</label>
                <input
                  type="number"
                  step={100000}
                  min={0}
                  max={me?.money || 0}
                  value={offerMoney}
                  onChange={(e) => setOfferMoney(e.target.value)}
                  className="kraft-input sm"
                />
                <div className="trade-tile-list">
                  {myTiles.length === 0 && <div className="muted-sm">Belum punya properti</div>}
                  {myTiles.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`trade-tile-btn ${offerTiles.includes(t.id) ? 'selected' : ''}`}
                      onClick={() => toggle(offerTiles, setOfferTiles, t.id)}
                    >
                      <span className="dot" style={{ background: t.color }} />
                      <span>{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="trade-col">
                <div className="trade-col-title">
                  Minta dari {target?.name} ({formatShortRupiah(target?.money || 0)})
                </div>
                <label className="field-hint">Uang Tunai (Rp)</label>
                <input
                  type="number"
                  step={100000}
                  min={0}
                  max={target?.money || 0}
                  value={requestMoney}
                  onChange={(e) => setRequestMoney(e.target.value)}
                  className="kraft-input sm"
                />
                <div className="trade-tile-list">
                  {targetTiles.length === 0 && <div className="muted-sm">Lawan belum punya properti</div>}
                  {targetTiles.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`trade-tile-btn ${requestTiles.includes(t.id) ? 'selected' : ''}`}
                      onClick={() => toggle(requestTiles, setRequestTiles, t.id)}
                    >
                      <span className="dot" style={{ background: t.color }} />
                      <span>{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" className="btn-green full-width" style={{ marginTop: 14 }}>
              <ArrowLeftRight size={16} />
              <span>KIRIM TAWARAN DAGANG</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
