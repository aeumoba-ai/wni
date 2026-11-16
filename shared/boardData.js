export const STARTING_MONEY = 15_000_000;
export const PASS_START_BONUS = 2_000_000;
export const INITIAL_KAS_NEGARA = 1_000_000;
export const JAIL_BAIL_AMOUNT = 1_000_000;
export const JAIL_TILE_ID = 7;
export const TOTAL_TILES = 32;

export const COLOR_GROUPS = {
  brown: { label: 'Pinggiran', color: '#8b5a2b' },
  teal: { label: 'Surga Bali', color: '#14b8a6' },
  orange: { label: 'Infrastruktur', color: '#f97316' },
  green: { label: 'Wisata Budaya', color: '#22c55e' },
  red: { label: 'Bisnis Elite', color: '#ef4444' },
  purple: { label: 'Pesona Nusantara', color: '#a855f7' },
  navy: { label: 'Ring Satu', color: '#2563eb' },
  transport: { label: 'Transportasi', color: '#0284c7' },
  utility: { label: 'Utilitas', color: '#eab308' },
};

// 32-tile circular board arranged clockwise from bottom-right (Tile 0: Gapura Mulai)
// Bottom arc (Tiles 0..14) mirrors the exact sequence visible in gameplay-2.jpg & gameplay-3.jpg!
export const BOARD_TILES = [
  // === QUADRANT 1: Bottom-right -> Bottom-left ===
  {
    id: 0,
    name: 'Gapura Mulai',
    shortName: 'MULAI',
    subtitle: '+Rp2 jt',
    type: 'start',
    landmark: 'gapura',
    color: '#dc2626',
  },
  {
    id: 1,
    name: 'Kebijakan Pemerintah',
    shortName: 'KEBIJAKAN',
    subtitle: 'Kartu Kebijakan',
    type: 'policy',
    landmark: 'switch',
    color: '#2563eb',
  },
  {
    id: 2,
    name: 'Lumpur Lapindo, Porong',
    shortName: 'LUMPUR LAPINDO - PORONG',
    type: 'property',
    group: 'brown',
    color: '#8b5a2b',
    price: 600_000,
    upgradeCost: 400_000,
    rents: [120_000, 350_000, 750_000, 1_300_000],
  },
  {
    id: 3,
    name: 'PBB',
    shortName: 'PBB',
    subtitle: 'Bayar Rp1 jt',
    type: 'tax',
    taxAmount: 1_000_000,
    landmark: 'pbb',
    color: '#b91c1c',
  },
  {
    id: 4,
    name: 'Pelabuhan Merak',
    shortName: 'PELABUHAN MERAK',
    type: 'transport',
    group: 'transport',
    color: '#0284c7',
    price: 2_000_000,
    landmark: 'port',
    rents: [400_000, 800_000, 1_600_000, 3_000_000],
  },
  {
    id: 5,
    name: 'Lobi Orang Dalam',
    shortName: 'LOBI ORANG DALAM',
    subtitle: 'Kartu Lobi',
    type: 'lobby',
    landmark: 'folder',
    color: '#b45309',
  },
  {
    id: 6,
    name: 'Canggu, Bali',
    shortName: 'CANGGU, BALI',
    type: 'property',
    group: 'teal',
    color: '#14b8a6',
    price: 3_200_000,
    upgradeCost: 1_500_000,
    rents: [680_000, 1_700_000, 3_400_000, 5_200_000],
  },
  {
    id: 7,
    name: 'Rutan KPK',
    shortName: 'RUTAN KPK',
    subtitle: 'Tahanan / Mampir',
    type: 'jail',
    landmark: 'jail',
    color: '#b91c1c',
  },

  // === QUADRANT 2: Bottom-left -> Top-left ===
  {
    id: 8,
    name: 'PLN',
    shortName: 'PLN',
    type: 'utility',
    group: 'utility',
    color: '#eab308',
    price: 1_500_000,
    landmark: 'pln',
    rents: [250_000, 600_000],
  },
  {
    id: 9,
    name: 'Pelabuhan Belawan',
    shortName: 'PELABUHAN BELAWAN',
    type: 'transport',
    group: 'transport',
    color: '#0284c7',
    price: 2_000_000,
    landmark: 'port',
    rents: [400_000, 800_000, 1_600_000, 3_000_000],
  },
  {
    id: 10,
    name: 'Kebijakan Pemerintah',
    shortName: 'KEBIJAKAN',
    subtitle: 'Kartu Kebijakan',
    type: 'policy',
    landmark: 'switch',
    color: '#2563eb',
  },
  {
    id: 11,
    name: 'Tol Trans Jawa',
    shortName: 'TOL TRANS JAWA',
    type: 'property',
    group: 'orange',
    color: '#f97316',
    price: 2_200_000,
    upgradeCost: 1_100_000,
    rents: [440_000, 1_100_000, 2_200_000, 3_500_000],
  },
  {
    id: 12,
    name: 'Pajak Jalan',
    shortName: 'PAJAK JALAN',
    subtitle: 'Bayar Rp500 rb',
    type: 'tax',
    taxAmount: 500_000,
    landmark: 'toll',
    color: '#dc2626',
  },
  {
    id: 13,
    name: 'Bandara Soetta',
    shortName: 'BANDARA SOETTA',
    type: 'transport',
    group: 'transport',
    color: '#0284c7',
    price: 2_000_000,
    landmark: 'airport',
    rents: [400_000, 800_000, 1_600_000, 3_000_000],
  },
  {
    id: 14,
    name: 'Halte TransJakarta',
    shortName: 'BUS TRANSJAKARTA',
    type: 'property',
    group: 'orange',
    color: '#f97316',
    price: 2_000_000,
    upgradeCost: 1_000_000,
    rents: [400_000, 1_000_000, 2_000_000, 3_200_000],
  },
  {
    id: 15,
    name: 'Kas Negara',
    shortName: 'KAS NEGARA',
    subtitle: 'Ambil Jackpot!',
    type: 'freeparking',
    landmark: 'vault',
    color: '#1f2937',
  },

  // === QUADRANT 3: Top-left -> Top-right ===
  {
    id: 16,
    name: 'Warung Madura 24J',
    shortName: 'WARUNG MADURA',
    type: 'property',
    group: 'brown',
    color: '#8b5a2b',
    price: 800_000,
    upgradeCost: 500_000,
    rents: [160_000, 450_000, 950_000, 1_600_000],
  },
  {
    id: 17,
    name: 'Malioboro, Jogja',
    shortName: 'MALIOBORO, JOGJA',
    type: 'property',
    group: 'green',
    color: '#22c55e',
    price: 1_400_000,
    upgradeCost: 800_000,
    rents: [280_000, 750_000, 1_500_000, 2_500_000],
  },
  {
    id: 18,
    name: 'Braga, Bandung',
    shortName: 'BRAGA, BANDUNG',
    type: 'property',
    group: 'green',
    color: '#22c55e',
    price: 1_600_000,
    upgradeCost: 900_000,
    rents: [320_000, 850_000, 1_700_000, 2_800_000],
  },
  {
    id: 19,
    name: 'Lobi Orang Dalam',
    shortName: 'LOBI ORANG DALAM',
    subtitle: 'Kartu Lobi',
    type: 'lobby',
    landmark: 'folder',
    color: '#b45309',
  },
  {
    id: 20,
    name: 'PDAM',
    shortName: 'PDAM',
    type: 'utility',
    group: 'utility',
    color: '#eab308',
    price: 1_500_000,
    landmark: 'pdam',
    rents: [250_000, 600_000],
  },
  {
    id: 21,
    name: 'PIK 2, Jakarta',
    shortName: 'PIK 2, JAKARTA',
    type: 'property',
    group: 'red',
    color: '#ef4444',
    price: 2_600_000,
    upgradeCost: 1_300_000,
    rents: [520_000, 1_350_000, 2_700_000, 4_300_000],
  },
  {
    id: 22,
    name: 'SCBD, Sudirman',
    shortName: 'SCBD, SUDIRMAN',
    type: 'property',
    group: 'red',
    color: '#ef4444',
    price: 2_800_000,
    upgradeCost: 1_400_000,
    rents: [580_000, 1_450_000, 2_900_000, 4_600_000],
  },
  {
    id: 23,
    name: 'OTT KPK!',
    shortName: 'OTT KPK!',
    subtitle: 'Masuk Rutan',
    type: 'gotojail',
    landmark: 'siren',
    color: '#991b1b',
  },

  // === QUADRANT 4: Top-right -> Bottom-right ===
  {
    id: 24,
    name: 'Seminyak, Bali',
    shortName: 'SEMINYAK, BALI',
    type: 'property',
    group: 'teal',
    color: '#14b8a6',
    price: 3_000_000,
    upgradeCost: 1_450_000,
    rents: [640_000, 1_600_000, 3_200_000, 4_900_000],
  },
  {
    id: 25,
    name: 'Danau Toba, Sumut',
    shortName: 'DANAU TOBA',
    type: 'property',
    group: 'purple',
    color: '#a855f7',
    price: 3_000_000,
    upgradeCost: 1_500_000,
    rents: [640_000, 1_600_000, 3_200_000, 5_000_000],
  },
  {
    id: 26,
    name: 'Kebijakan Pemerintah',
    shortName: 'KEBIJAKAN',
    subtitle: 'Kartu Kebijakan',
    type: 'policy',
    landmark: 'switch',
    color: '#2563eb',
  },
  {
    id: 27,
    name: 'Kereta Cepat Whoosh',
    shortName: 'WHOOSH',
    type: 'transport',
    group: 'transport',
    color: '#0284c7',
    price: 2_000_000,
    landmark: 'train',
    rents: [400_000, 800_000, 1_600_000, 3_000_000],
  },
  {
    id: 28,
    name: 'Pajak Barang Mewah',
    shortName: 'PAJAK MEWAH',
    subtitle: 'Bayar Rp750 rb',
    type: 'tax',
    taxAmount: 750_000,
    color: '#dc2626',
  },
  {
    id: 29,
    name: 'Raja Ampat, Papua',
    shortName: 'RAJA AMPAT',
    type: 'property',
    group: 'purple',
    color: '#a855f7',
    price: 3_400_000,
    upgradeCost: 1_650_000,
    rents: [740_000, 1_850_000, 3_700_000, 5_600_000],
  },
  {
    id: 30,
    name: 'IKN Nusantara',
    shortName: 'IKN NUSANTARA',
    type: 'property',
    group: 'navy',
    color: '#2563eb',
    price: 3_600_000,
    upgradeCost: 1_800_000,
    rents: [800_000, 2_000_000, 4_000_000, 6_200_000],
  },
  {
    id: 31,
    name: 'Menteng, Jakarta',
    shortName: 'MENTENG, JAKARTA',
    type: 'property',
    group: 'navy',
    color: '#2563eb',
    price: 4_000_000,
    upgradeCost: 2_000_000,
    rents: [900_000, 2_250_000, 4_500_000, 7_000_000],
  },
];

export function getTileById(id) {
  return BOARD_TILES[((id % TOTAL_TILES) + TOTAL_TILES) % TOTAL_TILES];
}

export function getGroupTiles(group) {
  return BOARD_TILES.filter((t) => t.group === group);
}

export function formatRupiah(amount) {
  const neg = amount < 0;
  const abs = Math.abs(Math.round(amount));
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg ? '-' : ''}Rp${formatted}`;
}

export function formatShortRupiah(amount) {
  const neg = amount < 0;
  const abs = Math.abs(amount);
  let str;
  if (abs >= 1_000_000) {
    const jt = abs / 1_000_000;
    str = `Rp${Number.isInteger(jt) ? jt : jt.toFixed(1).replace('.', ',')} jt`;
  } else if (abs >= 1_000) {
    const rb = abs / 1_000;
    str = `Rp${Number.isInteger(rb) ? rb : rb.toFixed(0)} rb`;
  } else {
    str = `Rp${abs}`;
  }
  return neg ? `-${str}` : str;
}
