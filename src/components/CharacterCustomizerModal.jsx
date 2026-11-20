import React, { useEffect, useMemo, useState } from 'react';
import { Shuffle, RotateCcw, Check, X, Sparkles } from 'lucide-react';
import AvatarIcon from './AvatarIcon.jsx';
import {
  ACCESSORIES,
  BOTTOMS,
  CUSTOMIZATION_TABS,
  CUSTOMIZATION_TOTALS,
  HAIR_COLORS,
  HAIR_STYLES,
  HEADWEAR,
  HEADWEAR_COLORS,
  MAX_ACCESSORIES,
  SHOES,
  SKIN_TONES,
  TOPS,
  describeCustomization,
  isDefaultCustomization,
  normalizeCustomization,
  randomCustomization,
  resolveLook,
} from '../../shared/customization.js';

const formatBig = (n) => {
  try {
    return new Intl.NumberFormat('id-ID').format(n);
  } catch {
    return String(n);
  }
};

/** Satu kotak pilihan: pratinjau avatar mini + label. */
function OptionCard({ active, label, sub, customization, characterId, onClick, wide }) {
  return (
    <button
      type="button"
      className={`cust-option ${active ? 'active' : ''} ${wide ? 'wide' : ''}`}
      onClick={onClick}
      title={label}
      aria-pressed={active}
    >
      <span className="cust-option-preview">
        <AvatarIcon characterId={characterId} customization={customization} size={46} />
      </span>
      <span className="cust-option-label">{label}</span>
      {sub ? <span className="cust-option-sub">{sub}</span> : null}
      {active ? (
        <span className="cust-option-check">
          <Check size={12} strokeWidth={3.5} />
        </span>
      ) : null}
    </button>
  );
}

/** Chip warna sederhana (untuk warna rambut / warna penutup kepala). */
function ColorCard({ active, label, color, onClick }) {
  return (
    <button
      type="button"
      className={`cust-color ${active ? 'active' : ''}`}
      onClick={onClick}
      title={label}
      aria-pressed={active}
    >
      <span className="cust-color-dot" style={{ background: color }} />
      <span className="cust-color-label">{label}</span>
    </button>
  );
}

export default function CharacterCustomizerModal({ open, customization, characterId = 'ojol', onChange, onClose }) {
  const [tab, setTab] = useState('kulit');
  const look = useMemo(() => normalizeCustomization(customization), [customization]);
  const resolved = useMemo(() => resolveLook(look), [look]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const patch = (next) => onChange?.(normalizeCustomization({ ...look, ...next }));
  const withOption = (key, id) => normalizeCustomization({ ...look, [key]: id });
  const toggleAccessory = (id) => {
    const list = look.accessories.includes(id)
      ? look.accessories.filter((a) => a !== id)
      : [...look.accessories, id];
    patch({ accessories: list.slice(-MAX_ACCESSORIES) });
  };

  const renderGrid = () => {
    if (tab === 'kulit') {
      return (
        <div className="cust-grid">
          {SKIN_TONES.map((tone) => (
            <OptionCard
              key={tone.id}
              active={look.skin === tone.id}
              label={tone.label}
              customization={{ ...look, skin: tone.id }}
              characterId={characterId}
              onClick={() => patch({ skin: tone.id })}
            />
          ))}
        </div>
      );
    }
    if (tab === 'rambut') {
      return (
        <>
          <div className="cust-subtitle">Gaya rambut</div>
          <div className="cust-grid">
            {HAIR_STYLES.map((style) => (
              <OptionCard
                key={style.id}
                active={look.hairStyle === style.id}
                label={style.label}
                customization={{ ...look, hairStyle: style.id, headwear: 'none' }}
                characterId={characterId}
                onClick={() => patch({ hairStyle: style.id })}
              />
            ))}
          </div>
          <div className="cust-subtitle">Warna rambut</div>
          <div className="cust-colors">
            {HAIR_COLORS.map((c) => (
              <ColorCard key={c.id} active={look.hairColor === c.id} label={c.label} color={c.color} onClick={() => patch({ hairColor: c.id })} />
            ))}
          </div>
        </>
      );
    }
    if (tab === 'kepala') {
      return (
        <>
          <div className="cust-subtitle">Model penutup kepala ({HEADWEAR.length} pilihan)</div>
          <div className="cust-grid">
            {HEADWEAR.map((item) => (
              <OptionCard
                key={item.id}
                active={look.headwear === item.id}
                label={item.label}
                sub={item.group === 'budaya' ? 'budaya' : item.group === 'kerja' ? 'kerja' : undefined}
                customization={{ ...look, headwear: item.id }}
                characterId={characterId}
                onClick={() => patch({ headwear: item.id })}
              />
            ))}
          </div>
          <div className="cust-subtitle">Warna penutup kepala</div>
          <div className="cust-colors">
            {HEADWEAR_COLORS.map((c) => (
              <ColorCard key={c.id} active={look.headwearColor === c.id} label={c.label} color={c.color} onClick={() => patch({ headwearColor: c.id })} />
            ))}
          </div>
        </>
      );
    }
    if (tab === 'atasan') {
      const groups = [
        { id: 'budaya', label: 'Pakaian adat & batik Indonesia' },
        { id: 'modern', label: 'Kaos, kemeja & jaket biasa' },
        { id: 'kerja', label: 'Seragam & pakaian kerja' },
      ];
      return (
        <>
          {groups.map((group) => {
            const items = TOPS.filter((t) => t.group === group.id);
            if (!items.length) return null;
            return (
              <React.Fragment key={group.id}>
                <div className="cust-subtitle">
                  {group.label} ({items.length})
                </div>
                <div className="cust-grid">
                  {items.map((top) => (
                    <OptionCard
                      key={top.id}
                      active={look.top === top.id}
                      label={top.label}
                      customization={{ ...look, top: top.id }}
                      characterId={characterId}
                      onClick={() => patch({ top: top.id })}
                    />
                  ))}
                </div>
              </React.Fragment>
            );
          })}
        </>
      );
    }
    if (tab === 'bawahan') {
      return (
        <div className="cust-grid">
          {BOTTOMS.map((bottom) => (
            <OptionCard
              key={bottom.id}
              active={look.bottom === bottom.id}
              label={bottom.label}
              customization={{ ...look, bottom: bottom.id }}
              characterId={characterId}
              onClick={() => patch({ bottom: bottom.id })}
            />
          ))}
        </div>
      );
    }
    if (tab === 'kaki') {
      return (
        <div className="cust-grid">
          {SHOES.map((shoe) => (
            <OptionCard
              key={shoe.id}
              active={look.shoes === shoe.id}
              label={shoe.label}
              customization={{ ...look, shoes: shoe.id }}
              characterId={characterId}
              onClick={() => patch({ shoes: shoe.id })}
            />
          ))}
        </div>
      );
    }
    // aksesori
    return (
      <>
        <div className="cust-subtitle">
          Aksesori — pilih maksimal {MAX_ACCESSORIES} ({look.accessories.length}/{MAX_ACCESSORIES} terpakai)
        </div>
        <div className="cust-grid">
          {ACCESSORIES.map((acc) => {
            const active = look.accessories.includes(acc.id);
            const next = active ? look.accessories.filter((a) => a !== acc.id) : [...look.accessories, acc.id].slice(-MAX_ACCESSORIES);
            return (
              <OptionCard
                key={acc.id}
                active={active}
                label={acc.label}
                customization={{ ...look, accessories: next }}
                characterId={characterId}
                onClick={() => toggleAccessory(acc.id)}
              />
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className="cust-overlay" role="dialog" aria-modal="true" aria-label="Kustomisasi Karakter">
      <div className="cust-modal">
        <header className="cust-header">
          <div>
            <h2 className="cust-title">
              <Sparkles size={18} /> KUSTOMISASI KARAKTER
            </h2>
            <p className="cust-sub">
              {formatBig(CUSTOMIZATION_TOTALS.combinations)} kombinasi tampilan — semua gratis.
            </p>
          </div>
          <button type="button" className="cust-close" onClick={() => onClose?.()} aria-label="Tutup">
            <X size={20} />
          </button>
        </header>

        <div className="cust-body">
          <aside className="cust-preview">
            <div className="cust-preview-figure">
              <AvatarIcon characterId={characterId} customization={look} size={132} />
            </div>
            <div className="cust-preview-text">{describeCustomization(look)}</div>
            <div className="cust-preview-actions">
              <button type="button" className="cust-btn" onClick={() => onChange?.(randomCustomization())}>
                <Shuffle size={15} /> ACAK
              </button>
              <button
                type="button"
                className="cust-btn ghost"
                onClick={() => patch({ skin: 'terang', hairStyle: 'pendek', hairColor: 'hitam', headwear: 'none', headwearColor: 'hitam', top: 'kaos_putih', bottom: 'celana_panjang', shoes: 'sneakers', accessories: [] })}
              >
                <RotateCcw size={15} /> RESET
              </button>
            </div>
            <div className={`cust-badge ${isDefaultCustomization(look) ? 'off' : 'on'}`}>
              {isDefaultCustomization(look) ? 'Tampilan bawaan' : 'Kustom aktif'}
            </div>
            <ul className="cust-stats">
              <li>{CUSTOMIZATION_TOTALS.skin} warna kulit</li>
              <li>{CUSTOMIZATION_TOTALS.hairStyle} gaya · {CUSTOMIZATION_TOTALS.hairColor} warna rambut</li>
              <li>{CUSTOMIZATION_TOTALS.headwear} penutup kepala</li>
              <li>{CUSTOMIZATION_TOTALS.top} atasan</li>
              <li>{CUSTOMIZATION_TOTALS.accessory} aksesori</li>
            </ul>
          </aside>

          <section className="cust-options">
            <div className="cust-tabs" role="tablist">
              {CUSTOMIZATION_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={`cust-tab ${tab === t.id ? 'active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="cust-panel">{renderGrid()}</div>
          </section>
        </div>

        <footer className="cust-footer">
          <div className="cust-hint">Perubahan langsung tersimpan di perangkat ini dan dipakai pion Anda di papan.</div>
          <button type="button" className="cust-save" onClick={() => onClose?.()}>
            SIMPAN &amp; TUTUP
          </button>
        </footer>
      </div>
    </div>
  );
}
