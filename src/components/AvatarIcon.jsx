import React from 'react';
import { getCharacterById } from '../../shared/characters.js';

export default function AvatarIcon({ characterId, size = 38, className = '' }) {
  const char = getCharacterById(characterId);
  const s = size;

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 64 64"
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
      aria-label={char.name}
    >
      {/* Background circle */}
      <circle cx="32" cy="32" r="29" fill="#fff7e6" stroke="#2c1e16" strokeWidth="3.2" />

      {/* Shoulders / Shirt */}
      <path
        d="M13 54 C15 43, 49 43, 51 54 Z"
        fill={char.shirtColor}
        stroke="#2c1e16"
        strokeWidth="2.5"
      />

      {/* Hijab back drape if ukhti */}
      {char.hatType === 'hijab' && (
        <path
          d="M15 34 C14 14, 50 14, 49 34 L51 51 C44 55, 20 55, 13 51 Z"
          fill={char.hatColor}
          stroke="#2c1e16"
          strokeWidth="2.5"
        />
      )}

      {/* Face */}
      <circle cx="32" cy="34" r="14" fill={char.skinColor} stroke="#2c1e16" strokeWidth="2.5" />

      {/* Eyes & Smile */}
      <circle cx="27" cy="34" r="2" fill="#1e1b18" />
      <circle cx="37" cy="34" r="2" fill="#1e1b18" />
      <path d="M28 40 Q32 43.5 36 40" fill="none" stroke="#2c1e16" strokeWidth="2" strokeLinecap="round" />

      {/* Glasses for Mas Startup */}
      {char.hatType === 'glasses_hair' && (
        <g stroke="#1e1b18" strokeWidth="2" fill="rgba(255,255,255,0.3)">
          <circle cx="26.5" cy="34" r="4.5" />
          <circle cx="37.5" cy="34" r="4.5" />
          <line x1="31" y1="34" x2="33" y2="34" />
        </g>
      )}

      {/* Character-specific headgear */}
      {char.hatType === 'peaked_cap' && (
        <g>
          <path d="M16 25 Q32 13 48 25 L45 29 L19 29 Z" fill={char.hatColor} stroke="#2c1e16" strokeWidth="2.4" />
          <rect x="20" y="27" width="24" height="4" rx="2" fill="#2c1e16" />
          <circle cx="32" cy="22" r="2.6" fill="#facc15" stroke="#2c1e16" strokeWidth="1.2" />
        </g>
      )}

      {char.hatType === 'helmet_green' && (
        <g>
          <path d="M16 29 C16 14, 48 14, 48 29 Z" fill={char.hatColor} stroke="#2c1e16" strokeWidth="2.5" />
          <path d="M15 29 L49 29" stroke="#2c1e16" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      {char.hatType === 'hair_bun' && (
        <g>
          <circle cx="32" cy="14" r="6" fill={char.hatColor} stroke="#2c1e16" strokeWidth="2.2" />
          <path d="M18 30 C18 18, 46 18, 46 30 Q32 23 18 30 Z" fill={char.hatColor} stroke="#2c1e16" strokeWidth="2.2" />
        </g>
      )}

      {char.hatType === 'peci' && (
        <rect x="20" y="14" width="24" height="13" rx="3" fill={char.hatColor} stroke="#2c1e16" strokeWidth="2.4" />
      )}

      {char.hatType === 'ojol_helmet' && (
        <g>
          <path d="M16 30 C16 13, 48 13, 48 30 Z" fill={char.hatColor} stroke="#2c1e16" strokeWidth="2.5" />
          <path d="M21 26 L43 26 L41 31 L23 31 Z" fill="#111827" stroke="#2c1e16" strokeWidth="1.5" />
          <line x1="32" y1="16" x2="32" y2="25" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}

      {char.hatType === 'glasses_hair' && (
        <path d="M18 29 C18 17, 46 17, 46 29 Q35 22 18 29 Z" fill={char.hatColor} stroke="#2c1e16" strokeWidth="2.2" />
      )}

      {char.hatType === 'caping' && (
        <polygon points="32,9 54,28 10,28" fill={char.hatColor} stroke="#2c1e16" strokeWidth="2.5" strokeLinejoin="round" />
      )}

      {char.hatType === 'spiky_hair' && (
        <path
          d="M18 29 L20 18 L27 23 L32 14 L38 23 L45 18 L46 29 Q32 24 18 29 Z"
          fill={char.hatColor}
          stroke="#2c1e16"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      )}

      {char.hatType === 'orange_cap' && (
        <g>
          <path d="M17 28 C18 16, 46 16, 47 28 Z" fill={char.hatColor} stroke="#2c1e16" strokeWidth="2.4" />
          <path d="M23 27 L51 27" stroke={char.hatColor} strokeWidth="4" strokeLinecap="round" />
          <path d="M23 27 L51 27" stroke="#2c1e16" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
