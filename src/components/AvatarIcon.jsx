import React from 'react';
import { getCharacterById } from '../../shared/characters.js';
import { resolveLook } from '../../shared/customization.js';

const HEAD_Y = 34;

/** Rambut SVG per bentuk (dipakai bila pemain memakai look kustom). */
function HairSvg({ shape, color }) {
  if (!color || shape === 'bald') return null;
  const stroke = '#2c1e16';
  const common = { fill: color, stroke, strokeWidth: 2.2, strokeLinejoin: 'round' };
  switch (shape) {
    case 'buzz':
      return <path d="M19 30 C19 19, 45 19, 45 30 Q32 25 19 30 Z" {...common} />;
    case 'side':
      return (
        <g>
          <path d="M18 29 C18 17, 46 17, 46 29 Q38 20 26 22 Q21 25 18 29 Z" {...common} />
          <path d="M24 22 l12 -2" stroke={stroke} strokeWidth={1.6} />
        </g>
      );
    case 'bangs':
      return (
        <g>
          <path d="M18 30 C18 16, 46 16, 46 30 L42 26 L37 29 L32 25 L27 29 L22 26 Z" {...common} />
        </g>
      );
    case 'curly':
      return (
        <g {...common}>
          <circle cx="23" cy="23" r="5.6" />
          <circle cx="32" cy="19.5" r="5.8" />
          <circle cx="41" cy="23" r="5.6" />
          <circle cx="19" cy="29" r="4.4" />
          <circle cx="45" cy="29" r="4.4" />
        </g>
      );
    case 'afro':
      return (
        <g {...common}>
          <circle cx="32" cy="24" r="13.5" />
          <circle cx="20" cy="30" r="6.5" />
          <circle cx="44" cy="30" r="6.5" />
        </g>
      );
    case 'long':
      return (
        <g>
          <path d="M17 30 C17 14, 47 14, 47 30 L47 50 Q41 55 32 55 Q23 55 17 50 Z" {...common} />
        </g>
      );
    case 'wave':
      return (
        <g>
          <path d="M17 31 C17 15, 47 15, 47 31 L45 44 Q39 47 32 47 Q25 47 19 44 Z" {...common} />
          <path d="M22 36 q10 6 20 0" fill="none" stroke={stroke} strokeWidth={1.6} />
        </g>
      );
    case 'ponytail':
      return (
        <g>
          <path d="M18 30 C18 16, 46 16, 46 30 Q32 24 18 30 Z" {...common} />
          <ellipse cx="48" cy="38" rx="4.6" ry="9" {...common} />
        </g>
      );
    case 'bun':
      return (
        <g>
          <circle cx="32" cy="15" r="6" {...common} />
          <path d="M18 30 C18 18, 46 18, 46 30 Q32 23 18 30 Z" {...common} />
        </g>
      );
    case 'mohawk':
      return (
        <g>
          <path d="M18 30 C18 20, 46 20, 46 30 Q32 26 18 30 Z" {...common} />
          <path d="M32 8 L38 22 L26 22 Z" {...common} />
        </g>
      );
    default:
      return <path d="M18 30 C18 17, 46 17, 46 30 Q32 23 18 30 Z" {...common} />;
  }
}

/** Penutup kepala SVG per bentuk. */
function HeadwearSvg({ shape, color, trim, visor }) {
  if (!color || !shape || shape === 'none') return null;
  const stroke = '#2c1e16';
  const common = { fill: color, stroke, strokeWidth: 2.4, strokeLinejoin: 'round' };
  switch (shape) {
    case 'peci':
      return (
        <g>
          <rect x="20" y="14" width="24" height="13" rx="3" {...common} />
          {trim && <rect x="21" y="18" width="22" height="3" rx="1.5" fill="#d4a017" />}
        </g>
      );
    case 'songkok':
      return <rect x="20" y="10" width="24" height="18" rx="4" {...common} />;
    case 'blangkon':
      return (
        <g>
          <path d="M17 29 C17 15, 47 15, 47 29 Q32 24 17 29 Z" {...common} />
          <circle cx="18" cy="30" r="4" {...common} />
        </g>
      );
    case 'band':
      return <rect x="16" y="22" width="32" height="7" rx="3.5" {...common} />;
    case 'band_feather':
      return (
        <g>
          <rect x="16" y="22" width="32" height="7" rx="3.5" {...common} />
          <path d="M46 22 l7 -10 l-4 12 z" fill="#f97316" stroke={stroke} strokeWidth={1.6} />
        </g>
      );
    case 'udeng':
      return (
        <g>
          <path d="M17 29 C17 15, 47 15, 47 29 Q32 25 17 29 Z" {...common} />
          <path d="M32 20 l7 -6 l1 8 z" {...common} />
        </g>
      );
    case 'cone':
      return <polygon points="32,9 54,28 10,28" {...common} />;
    case 'veil':
      return (
        <g>
          <path d="M15 34 C14 13, 50 13, 49 34 L51 51 C44 55, 20 55, 13 51 Z" {...common} />
          <ellipse cx="32" cy="35" rx="12.5" ry="13" fill="rgba(255,255,255,0.12)" />
        </g>
      );
    case 'veil_long':
      return (
        <g>
          <path d="M14 34 C13 12, 51 12, 50 34 L52 58 C44 61, 20 61, 12 58 Z" {...common} />
          <ellipse cx="32" cy="35" rx="12.5" ry="13" fill="rgba(255,255,255,0.12)" />
        </g>
      );
    case 'wide_brim':
      return (
        <g>
          <ellipse cx="32" cy="25" rx="21" ry="6.5" {...common} />
          <path d="M20 25 C21 14, 43 14, 44 25 Z" {...common} />
        </g>
      );
    case 'cap':
      return (
        <g>
          <path d="M18 26 C19 14, 45 14, 46 26 Z" {...common} />
          <rect x="26" y="24" width="24" height="4.5" rx="2.2" {...common} />
        </g>
      );
    case 'cowboy':
      return (
        <g>
          <ellipse cx="32" cy="26" rx="20" ry="6" {...common} />
          <path d="M21 26 C22 13, 42 13, 43 26 Z" {...common} />
          <rect x="22" y="22" width="20" height="3" fill="#7c2d12" />
        </g>
      );
    case 'beanie':
      return (
        <g>
          <path d="M17 28 C17 13, 47 13, 47 28 Q32 23 17 28 Z" {...common} />
          <circle cx="32" cy="11" r="3.4" {...common} />
          <rect x="17" y="24" width="30" height="5" rx="2.5" fill="rgba(0,0,0,0.18)" />
        </g>
      );
    case 'helmet':
      return (
        <g>
          <path d="M16 30 C16 13, 48 13, 48 30 Z" {...common} />
          {visor && <path d="M21 26 L43 26 L41 31 L23 31 Z" fill="#111827" stroke={stroke} strokeWidth={1.5} />}
        </g>
      );
    case 'helmet_full':
      return (
        <g>
          <path d="M15 34 C15 12, 49 12, 49 34 Z" {...common} />
          <rect x="18" y="30" width="28" height="7" rx="3" fill="#0f172a" stroke={stroke} strokeWidth={1.6} />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path d="M19 24 L23 14 L28 22 L32 11 L36 22 L41 14 L45 24 Z" fill="#d4a017" stroke={stroke} strokeWidth={2.2} strokeLinejoin="round" />
          <rect x="19" y="23" width="26" height="4" rx="2" fill="#fbbf24" stroke={stroke} strokeWidth={1.8} />
        </g>
      );
    default:
      return null;
  }
}

export default function AvatarIcon({ characterId, customization = null, size = 38, className = '' }) {
  const char = getCharacterById(characterId);
  const look = customization ? resolveLook(customization) : null;
  const s = size;

  const shirtColor = look ? look.top.color : char.shirtColor;
  const skinColor = look ? look.skin.base : char.skinColor;
  const hairColor = look ? look.hairColor.color : char.hatColor;
  const hairShape = look ? look.hairStyle.shape : null;
  const headwear = look ? look.headwear : null;
  const hasAcc = (id) => Boolean(look && look.hasAccessory(id));
  const dark = '#1e1b18';

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 64 64"
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
      aria-label={look ? `${char.name} (kustom)` : char.name}
      role="img"
    >
      <circle cx="32" cy="32" r="29" fill="#fff7e6" stroke="#2c1e16" strokeWidth="3.2" />

      {/* Penutup kepala panjang/di belakang bahu */}
      {headwear && (headwear.shape === 'veil' || headwear.shape === 'veil_long') && (
        <path
          d={headwear.shape === 'veil_long'
            ? 'M14 34 C13 13, 51 13, 50 34 L52 58 C43 61, 21 61, 12 58 Z'
            : 'M15 34 C14 14, 50 14, 49 34 L51 51 C44 55, 20 55, 13 51 Z'}
          fill={look.headwearColor.color}
          stroke="#2c1e16"
          strokeWidth="2.5"
        />
      )}

      {/* Bahu / atasan */}
      <path d="M13 54 C15 43, 49 43, 51 54 Z" fill={shirtColor} stroke="#2c1e16" strokeWidth="2.5" />
      {look && look.top.pattern === 'collar' && (
        <path d="M27 46 L32 51 L37 46" fill="none" stroke={look.top.accent} strokeWidth="2.2" strokeLinecap="round" />
      )}
      {look && look.top.pattern === 'stripes' && (
        <g stroke={look.top.accent} strokeWidth="2">
          <path d="M17 49 L47 46" />
          <path d="M16 53 L48 50" />
        </g>
      )}
      {look && look.top.pattern === 'batik' && (
        <g fill={look.top.accent}>
          <circle cx="24" cy="49" r="1.7" />
          <circle cx="32" cy="47" r="1.7" />
          <circle cx="40" cy="49" r="1.7" />
          <circle cx="28" cy="52" r="1.4" />
          <circle cx="36" cy="52" r="1.4" />
        </g>
      )}
      {look && look.top.pattern === 'sash' && (
        <path d="M24 45 L40 54" stroke={look.top.accent} strokeWidth="4" strokeLinecap="round" />
      )}

      {/* Kepala */}
      <circle cx="32" cy={HEAD_Y} r="14" fill={skinColor} stroke="#2c1e16" strokeWidth="2.5" />

      {/* Rambut kustom */}
      {look && <HairSvg shape={hairShape} color={hairColor} />}

      {/* Wajah */}
      <circle cx="27" cy="34" r="2" fill="#1e1b18" />
      <circle cx="37" cy="34" r="2" fill="#1e1b18" />
      <path d="M28 40 Q32 43.5 36 40" fill="none" stroke="#2c1e16" strokeWidth="2" strokeLinecap="round" />

      {/* Aksesori wajah kustom */}
      {look && (hasAcc('kacamata') || hasAcc('kacamata_hitam') || hasAcc('kacamata_bulat')) && (
        <g stroke={dark} strokeWidth="2" fill={hasAcc('kacamata_hitam') ? '#0b1220' : 'rgba(255,255,255,0.3)'}>
          <circle cx="26.5" cy="34" r={hasAcc('kacamata_bulat') ? 5 : 4.5} />
          <circle cx="37.5" cy="34" r={hasAcc('kacamata_bulat') ? 5 : 4.5} />
          <line x1="31" y1="34" x2="33" y2="34" />
        </g>
      )}
      {look && hasAcc('masker') && (
        <rect x="21" y="38" width="22" height="10" rx="4" fill="#e5e7eb" stroke="#2c1e16" strokeWidth="1.8" />
      )}
      {look && hasAcc('kumis') && <rect x="25" y="38.6" width="14" height="2.6" rx="1.3" fill="#1f2937" />}
      {look && hasAcc('jenggot') && (
        <path d="M22 40 Q32 54 42 40 Q32 46 22 40 Z" fill="#1f2937" stroke="#2c1e16" strokeWidth="1.6" />
      )}
      {look && hasAcc('kalung') && (
        <path d="M26 46 Q32 51 38 46" fill="none" stroke="#d4a017" strokeWidth="2.2" strokeLinecap="round" />
      )}
      {look && hasAcc('syal') && <path d="M22 44 Q32 49 42 44" fill="none" stroke="#b91c1c" strokeWidth="3.4" strokeLinecap="round" />}
      {look && hasAcc('dasi') && (
        <g fill="#111827">
          <rect x="30.4" y="45" width="3.2" height="3" />
          <path d="M30.6 48 h2.8 l1 6 l-2.4 2 l-2.4 -2 z" />
        </g>
      )}

      {/* Penutup kepala kustom */}
      {look && <HeadwearSvg shape={headwear.shape} color={look.headwearColor.color} trim={headwear.trim} visor={headwear.visor} />}

      {/* Gaya bawaan karakter (tanpa kustomisasi) */}
      {!look && char.hatType === 'peaked_cap' && (
        <g>
          <path d="M16 25 Q32 13 48 25 L45 29 L19 29 Z" fill={char.hatColor} stroke="#2c1e16" strokeWidth="2.4" />
          <rect x="20" y="27" width="24" height="4" rx="2" fill="#2c1e16" />
          <circle cx="32" cy="22" r="2.6" fill="#facc15" stroke="#2c1e16" strokeWidth="1.2" />
        </g>
      )}
      {!look && char.hatType === 'helmet_green' && (
        <g>
          <path d="M16 29 C16 14, 48 14, 48 29 Z" fill={char.hatColor} stroke="#2c1e16" strokeWidth="2.5" />
          <path d="M15 29 L49 29" stroke="#2c1e16" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {!look && char.hatType === 'hair_bun' && (
        <g>
          <circle cx="32" cy="14" r="6" fill={char.hatColor} stroke="#2c1e16" strokeWidth="2.2" />
          <path d="M18 30 C18 18, 46 18, 46 30 Q32 23 18 30 Z" fill={char.hatColor} stroke="#2c1e16" strokeWidth="2.2" />
        </g>
      )}
      {!look && char.hatType === 'peci' && (
        <rect x="20" y="14" width="24" height="13" rx="3" fill={char.hatColor} stroke="#2c1e16" strokeWidth="2.4" />
      )}
      {!look && char.hatType === 'hijab' && (
        <path d="M15 34 C14 14, 50 14, 49 34 L51 51 C44 55, 20 55, 13 51 Z" fill={char.hatColor} stroke="#2c1e16" strokeWidth="2.5" />
      )}
      {!look && char.hatType === 'ojol_helmet' && (
        <g>
          <path d="M16 30 C16 13, 48 13, 48 30 Z" fill={char.hatColor} stroke="#2c1e16" strokeWidth="2.5" />
          <path d="M21 26 L43 26 L41 31 L23 31 Z" fill="#111827" stroke="#2c1e16" strokeWidth="1.5" />
          <line x1="32" y1="16" x2="32" y2="25" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}
      {!look && char.hatType === 'glasses_hair' && (
        <g>
          <path d="M18 29 C18 17, 46 17, 46 29 Q35 22 18 29 Z" fill={char.hatColor} stroke="#2c1e16" strokeWidth="2.2" />
          <g stroke="#1e1b18" strokeWidth="2" fill="rgba(255,255,255,0.3)">
            <circle cx="26.5" cy="34" r="4.5" />
            <circle cx="37.5" cy="34" r="4.5" />
            <line x1="31" y1="34" x2="33" y2="34" />
          </g>
        </g>
      )}
      {!look && char.hatType === 'caping' && (
        <polygon points="32,9 54,28 10,28" fill={char.hatColor} stroke="#2c1e16" strokeWidth="2.5" strokeLinejoin="round" />
      )}
      {!look && char.hatType === 'spiky_hair' && (
        <path
          d="M18 29 L20 18 L27 23 L32 14 L38 23 L45 18 L46 29 Q32 24 18 29 Z"
          fill={char.hatColor}
          stroke="#2c1e16"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      )}
      {!look && char.hatType === 'orange_cap' && (
        <g>
          <path d="M17 28 C18 16, 46 16, 47 28 Z" fill={char.hatColor} stroke="#2c1e16" strokeWidth="2.4" />
          <path d="M23 27 L51 27" stroke={char.hatColor} strokeWidth="4" strokeLinecap="round" />
          <path d="M23 27 L51 27" stroke="#2c1e16" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      )}
      {!look && !['peaked_cap', 'helmet_green', 'hair_bun', 'peci', 'hijab', 'ojol_helmet', 'glasses_hair', 'caping', 'spiky_hair', 'orange_cap'].includes(char.hatType) && (
        <path d="M18 29 L20 18 L27 23 L32 14 L38 23 L45 18 L46 29 Q32 24 18 29 Z" fill={char.hatColor} stroke="#2c1e16" strokeWidth="2.2" strokeLinejoin="round" />
      )}
    </svg>
  );
}
