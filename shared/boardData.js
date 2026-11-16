// 40-tile circular board (100% Indonesia dari Sabang sampai Merauke)
// Every new match generates a fresh randomized arrangement of Indonesian places from a pool of 48 unique locations!

export const STARTING_MONEY = 15_000_000;
export const PASS_START_BONUS = 2_000_000;
export const INITIAL_KAS_NEGARA = 1_000_000;
export const JAIL_BAIL_AMOUNT = 1_000_000;
export const JAIL_TILE_ID = 10;
export const TOTAL_TILES = 40;

export const COLOR_GROUPS = {
  brown: { label: 'Ekonomi Rakyat', color: '#8b5a2b' },
  teal: { label: 'Pesona Nusantara', color: '#0d9488' },
  pink: { label: 'Kota Budaya', color: '#db2777' },
  orange: { label: 'Warisan & Kuliner', color: '#ea580c' },
  red: { label: 'Ikon Daerah', color: '#dc2626' },
  yellow: { label: 'Pusat Niaga', color: '#ca8a04' },
  green: { label: 'Permata Alam', color: '#16a34a' },
  indigo: { label: 'Ring Satu & Elit', color: '#4f46e5' },
  transport: { label: 'Transportasi Nusantara', color: '#0284c7' },
  utility: { label: 'Utilitas BUMN', color: '#eab308' },
};

// 36 Real Indonesian Property Destinations (Sabang sampai Merauke)
export const INDONESIAN_PROPERTY_POOL = [
  { name: 'Lumpur Lapindo, Porong', shortName: 'LUMPUR LAPINDO', province: 'Jawa Timur', landmark: 'lapindo', flavor: 'Tanggul penahan & kawah lumpur panas legendaris Sidoarjo.' },
  { name: 'Warung Madura 24J', shortName: 'WARUNG MADURA', province: 'Nusantara', landmark: 'madura', flavor: 'Buka 24 jam nonstop, tutup cuma pas kiamat (setengah hari).' },
  { name: 'Canggu, Bali', shortName: 'CANGGU, BALI', province: 'Bali', landmark: 'canggu', flavor: 'Candi Bentar, ombak surfing, dan beach club idaman turis.' },
  { name: 'Malioboro, Jogja', shortName: 'MALIOBORO', province: 'DI Yogyakarta', landmark: 'malioboro', flavor: 'Tugu Pal Putih, pendopo Joglo, angkringan, dan batik.' },
  { name: 'Braga, Bandung', shortName: 'BRAGA BANDUNG', province: 'Jawa Barat', landmark: 'braga', flavor: 'Arsitektur Art Deco, tusuk sate Bandung, & kafe klasik.' },
  { name: 'PIK 2, Jakarta', shortName: 'PIK 2 JAKARTA', province: 'DKI Jakarta', landmark: 'pik2', flavor: 'Pagoda Pantjoran megah dan kawasan pesisir modern utara Jakarta.' },
  { name: 'SCBD, Sudirman', shortName: 'SCBD SUDIRMAN', province: 'DKI Jakarta', landmark: 'scbd', flavor: 'Klaster gedung pencakar langit pusat finansial Indonesia.' },
  { name: 'Seminyak, Bali', shortName: 'SEMINYAK, BALI', province: 'Bali', landmark: 'seminyak', flavor: 'Vila tropis beratap alang-alang, infinity pool & sunset beanbag.' },
  { name: 'Danau Toba, Sumut', shortName: 'DANAU TOBA', province: 'Sumatera Utara', landmark: 'toba', flavor: 'Rumah Bolon Batak & danau vulkanik terbesar di Asia Tenggara.' },
  { name: 'Raja Ampat, Papua', shortName: 'RAJA AMPAT', province: 'Papua Barat Daya', landmark: 'raja_ampat', flavor: 'Gugusan pulau karst zamrud Wayag & laguna biru jernih.' },
  { name: 'IKN Nusantara', shortName: 'IKN NUSANTARA', province: 'Kalimantan Timur', landmark: 'ikn', flavor: 'Istana Garuda bersayap perunggu di jantung hutan Kalimantan.' },
  { name: 'Menteng, Jakarta', shortName: 'MENTENG JKT', province: 'DKI Jakarta', landmark: 'menteng', flavor: 'Kawasan hunian kolonial elit rindang di Jakarta Pusat.' },
  { name: 'Borobudur, Magelang', shortName: 'BOROBUDUR', province: 'Jawa Tengah', landmark: 'borobudur', flavor: 'Candi Buddha terbesar di dunia dengan stupa batu megah.' },
  { name: 'Prambanan, Sleman', shortName: 'PRAMBANAN', province: 'DI Yogyakarta', landmark: 'prambanan', flavor: 'Tiga menara candi Hindu menjulang penuh kisah Roro Jonggrang.' },
  { name: 'Gunung Bromo, Jatim', shortName: 'GUNUNG BROMO', province: 'Jawa Timur', landmark: 'bromo', flavor: 'Kaldera pasir luas, puncak berasap, dan deretan jeep wisata.' },
  { name: 'Kawah Ijen, Banyuwangi', shortName: 'KAWAH IJEN', province: 'Jawa Timur', landmark: 'ijen', flavor: 'Danau belerang toska dan fenomena Api Biru (Blue Fire) langka.' },
  { name: 'Kota Tua, Jakarta', shortName: 'KOTA TUA JKT', province: 'DKI Jakarta', landmark: 'kotatua', flavor: 'Museum Fatahillah kolonial & sepeda onthel warna-warni.' },
  { name: 'Ancol, Jakarta', shortName: 'ANCOL DUFAN', province: 'DKI Jakarta', landmark: 'ancol', flavor: 'Bianglala Dufan berputar di tepi pantai rekreasi ibu kota.' },
  { name: 'Ampera, Palembang', shortName: 'JEMB. AMPERA', province: 'Sumatera Selatan', landmark: 'ampera', flavor: 'Jembatan merah ikonik membelah Sungai Musi kota pempek.' },
  { name: 'Jam Gadang, Bukittinggi', shortName: 'JAM GADANG', province: 'Sumatera Barat', landmark: 'jam_gadang', flavor: 'Menara jam bersejarah beratap gonjong khas Minangkabau.' },
  { name: 'Pasar Terapung, Banjar', shortName: 'PASAR TERAPUNG', province: 'Kalimantan Selatan', landmark: 'pasar_terapung', flavor: 'Perahu klotok penuh hasil bumi berdagang di Sungai Barito.' },
  { name: 'Tana Toraja, Sulsel', shortName: 'TANA TORAJA', province: 'Sulawesi Selatan', landmark: 'toraja', flavor: 'Rumah adat Tongkonan beratap perahu menjulang megah.' },
  { name: 'Pantai Losari, Makassar', shortName: 'PANTAI LOSARI', province: 'Sulawesi Selatan', landmark: 'losari', flavor: 'Anjungan sunset & Masjid 99 Kubah warna-warni kebanggaan Makassar.' },
  { name: 'Labuan Bajo, NTT', shortName: 'LABUAN BAJO', province: 'Nusa Tenggara Timur', landmark: 'labuan_bajo', flavor: 'Perbukitan Pulau Padar & kapal Phinisi di perairan Komodo.' },
  { name: 'Gili Trawangan, Lombok', shortName: 'GILI TRAWANGAN', province: 'Nusa Tenggara Barat', landmark: 'gili', flavor: 'Pulau tropis bebas kendaraan dengan ayunan laut ikonik.' },
  { name: 'Ubud, Bali', shortName: 'UBUD, BALI', province: 'Bali', landmark: 'ubud', flavor: 'Terasering sawah hijau Tegalalang & ketenangan budaya Bali.' },
  { name: 'Lawang Sewu, Semarang', shortName: 'LAWANG SEWU', province: 'Jawa Tengah', landmark: 'lawang_sewu', flavor: 'Gedung bata merah berpintu seribu dengan menara kubah kembar.' },
  { name: 'Tugu Pahlawan, Surabaya', shortName: 'TUGU PAHLAWAN', province: 'Jawa Timur', landmark: 'surabaya', flavor: 'Monumen paku terbalik & ikon Sura dan Baya Kota Pahlawan.' },
  { name: 'Baiturrahman, Aceh', shortName: 'BAITURRAHMAN', province: 'Aceh', landmark: 'aceh', flavor: 'Masjid Raya berkubah hitam elegan & payung pelataran Serambi Mekkah.' },
  { name: 'Danau Kelimutu, Flores', shortName: 'DANAU KELIMUTU', province: 'Nusa Tenggara Timur', landmark: 'kelimutu', flavor: 'Keajaiban gunung berapi dengan tiga danau kawah berbeda warna.' },
  { name: 'Bunaken, Manado', shortName: 'BUNAKEN MANADO', province: 'Sulawesi Utara', landmark: 'bunaken', flavor: 'Taman laut terumbu karang warna-warni kelas dunia di Sulut.' },
  { name: 'Kawah Putih, Ciwidey', shortName: 'KAWAH PUTIH', province: 'Jawa Barat', landmark: 'kawah_putih', flavor: 'Danau kawah putih-toska dengan dermaga kayu berkabut sejuk.' },
  { name: 'Parangtritis, Bantul', shortName: 'PARANGTRITIS', province: 'DI Yogyakarta', landmark: 'parangtritis', flavor: 'Gumuk pasir eksotis & deburan ombak pantai selatan Jawa.' },
  { name: 'Dieng Plateau, Wonosobo', shortName: 'DIENG PLATEAU', province: 'Jawa Tengah', landmark: 'dieng', flavor: 'Negeri di Atas Awan, Candi Arjuna & Telaga Warna Wonosobo.' },
  { name: 'Wakatobi, Sultra', shortName: 'WAKATOBI', province: 'Sulawesi Tenggara', landmark: 'wakatobi', flavor: 'Atol terumbu karang & rumah panggung suku Bajo di laut biru.' },
  { name: 'Danau Sentani, Papua', shortName: 'DANAU SENTANI', province: 'Papua', landmark: 'sentani', flavor: 'Rumah adat Honai Papua di tepi danau indah kaki Pegunungan Cycloop.' },
];

// 8 Real Indonesian Transport Hubs (4 randomly selected per game!)
export const INDONESIAN_TRANSPORT_POOL = [
  { name: 'Pelabuhan Merak', shortName: 'PEL. MERAK', province: 'Banten', landmark: 'port_merak', flavor: 'Dermaga penyeberangan Ferry Ro-Ro tersibuk Jawa–Sumatera.' },
  { name: 'Pelabuhan Belawan', shortName: 'PEL. BELAWAN', province: 'Sumatera Utara', landmark: 'port_belawan', flavor: 'Gerbang kargo peti kemas utama Pulau Sumatera.' },
  { name: 'Tol Trans Jawa', shortName: 'TOL TRANS JAWA', province: 'Pulau Jawa', landmark: 'tol', flavor: 'Gerbang tol biru-putih jalur mudik terpanjang Nusantara.' },
  { name: 'Bandara Soetta', shortName: 'BANDARA SOETTA', province: 'Banten / Jakarta', landmark: 'airport', flavor: 'Bandara internasional utama Indonesia beratap Joglo.' },
  { name: 'Halte TransJakarta', shortName: 'TRANSJAKARTA', province: 'DKI Jakarta', landmark: 'transjakarta', flavor: 'Koridor BRT busway terpanjang di dunia.' },
  { name: 'Kereta Cepat Whoosh', shortName: 'KERETA WHOOSH', province: 'Jakarta–Bandung', landmark: 'train', flavor: 'Kereta peluru pertama di Asia Tenggara melesat 350 km/jam.' },
  { name: 'Stasiun Gambir', shortName: 'STASIUN GAMBIR', province: 'DKI Jakarta', landmark: 'gambir', flavor: 'Stasiun kereta api eksekutif legendaris di jantung Jakarta.' },
  { name: 'MRT Jakarta', shortName: 'MRT JAKARTA', province: 'DKI Jakarta', landmark: 'mrt', flavor: 'Kereta Ratangga cepat bebas macet jalur Sudirman–HI.' },
];

// 4 Real Indonesian BUMN Utilities (2 randomly selected per game!)
export const INDONESIAN_UTILITY_POOL = [
  { name: 'PLN', shortName: 'PLN LISTRIK', province: 'Nasional', landmark: 'pln', flavor: 'Perusahaan Listrik Negara penyuplai listrik seluruh Nusantara.' },
  { name: 'PDAM', shortName: 'PDAM AIR', province: 'Nasional', landmark: 'pdam', flavor: 'Perusahaan Daerah Air Minum penjaga pasokan air bersih.' },
  { name: 'Pertamina', shortName: 'PERTAMINA', province: 'Nasional', landmark: 'pertamina', flavor: 'SPBU Pasti Pas energi nasional dari Sabang sampai Merauke.' },
  { name: 'Telkom Indihome', shortName: 'TELKOM', province: 'Nasional', landmark: 'telkom', flavor: 'Jaringan fiber optik & menara BTS konektivitas Indonesia.' },
];

// Indonesian Tax Pools
export const INDONESIAN_LIGHT_TAX_POOL = [
  { name: 'PBB', shortName: 'PAJAK PBB', subtitle: 'Bayar Rp1,5 jt', landmark: 'pbb', taxAmount: 1_500_000, flavor: 'Pajak Bumi dan Bangunan masuk langsung ke Kas Negara.' },
  { name: 'Pajak Jalan (ETLE)', shortName: 'PAJAK ETLE', subtitle: 'Bayar Rp1,5 jt', landmark: 'etle', taxAmount: 1_500_000, flavor: 'Retribusi jalan & tilang elektronik masuk ke Kas Negara.' },
];

export const INDONESIAN_LUXURY_TAX_POOL = [
  { name: 'Pajak Barang Mewah', shortName: 'PAJAK MEWAH', subtitle: 'Bayar Rp2,2 jt', landmark: 'pajak_mewah', taxAmount: 2_200_000, flavor: 'PPnBM koleksi barang sultan disetor ke Kas Negara.' },
  { name: 'Bea Cukai Impor', shortName: 'BEA CUKAI', subtitle: 'Bayar Rp2,2 jt', landmark: 'pajak_mewah', taxAmount: 2_200_000, flavor: 'Pungutan bea masuk barang impor masuk ke Kas Negara.' },
];

export const INDONESIAN_PLACES_COUNT =
  INDONESIAN_PROPERTY_POOL.length +
  INDONESIAN_TRANSPORT_POOL.length +
  INDONESIAN_UTILITY_POOL.length;

// 40-slot Monopoly Board Blueprint (exact engine types + balanced rent tiers)
const BOARD_SLOTS = [
  { id: 0, type: 'start', name: 'Gapura Mulai', shortName: 'MULAI', subtitle: '+Rp2 jt', landmark: 'gapura', color: '#dc2626', flavor: 'Lewati Gapura Mulai untuk terima gaji Rp2.000.000!' },
  { id: 1, type: 'property', group: 'brown', price: 650_000, upgradeCost: 500_000, rents: [80_000, 240_000, 680_000, 1_500_000] },
  { id: 2, type: 'lobby', name: 'Lobi Orang Dalam', shortName: 'LOBI ORDAL', subtitle: 'Kartu Lobi', landmark: 'folder', color: '#f59e0b', flavor: 'Ambil 1 Kartu Lobi Orang Dalam penuh kejutan!' },
  { id: 3, type: 'property', group: 'brown', price: 800_000, upgradeCost: 500_000, rents: [100_000, 300_000, 820_000, 1_750_000] },
  { id: 4, type: 'tax_light', color: '#b91c1c' },
  { id: 5, type: 'transport', group: 'transport', price: 2_000_000, rents: [250_000, 500_000, 1_000_000, 2_000_000] },
  { id: 6, type: 'property', group: 'teal', price: 1_050_000, upgradeCost: 600_000, rents: [130_000, 380_000, 980_000, 2_100_000] },
  { id: 7, type: 'policy', name: 'Kebijakan Pemerintah', shortName: 'KEBIJAKAN', subtitle: 'Kartu Kebijakan', landmark: 'switch', color: '#2563eb', flavor: 'Ambil 1 Kartu Kebijakan Pemerintah!' },
  { id: 8, type: 'property', group: 'teal', price: 1_150_000, upgradeCost: 600_000, rents: [145_000, 420_000, 1_080_000, 2_300_000] },
  { id: 9, type: 'property', group: 'teal', price: 1_300_000, upgradeCost: 650_000, rents: [165_000, 480_000, 1_200_000, 2_550_000] },

  { id: 10, type: 'jail', name: 'Rutan KPK', shortName: 'RUTAN KPK', subtitle: 'Kunjungan', landmark: 'jail', color: '#ea580c', flavor: 'Cuma besuk rekan, atau ditahan gara-gara OTT KPK!' },
  { id: 11, type: 'property', group: 'pink', price: 1_450_000, upgradeCost: 850_000, rents: [185_000, 540_000, 1_380_000, 2_850_000] },
  { id: 12, type: 'utility', group: 'utility', price: 1_500_000, rents: [220_000, 550_000] },
  { id: 13, type: 'property', group: 'pink', price: 1_550_000, upgradeCost: 850_000, rents: [200_000, 580_000, 1_480_000, 3_050_000] },
  { id: 14, type: 'property', group: 'pink', price: 1_700_000, upgradeCost: 900_000, rents: [220_000, 640_000, 1_620_000, 3_300_000] },
  { id: 15, type: 'transport', group: 'transport', price: 2_000_000, rents: [250_000, 500_000, 1_000_000, 2_000_000] },
  { id: 16, type: 'property', group: 'orange', price: 1_850_000, upgradeCost: 1_000_000, rents: [240_000, 700_000, 1_780_000, 3_550_000] },
  { id: 17, type: 'lobby', name: 'Lobi Orang Dalam', shortName: 'LOBI ORDAL', subtitle: 'Kartu Lobi', landmark: 'folder', color: '#f59e0b', flavor: 'Ambil 1 Kartu Lobi Orang Dalam penuh kejutan!' },
  { id: 18, type: 'property', group: 'orange', price: 2_000_000, upgradeCost: 1_000_000, rents: [260_000, 760_000, 1_900_000, 3_800_000] },
  { id: 19, type: 'property', group: 'orange', price: 2_150_000, upgradeCost: 1_100_000, rents: [285_000, 820_000, 2_050_000, 4_050_000] },

  { id: 20, type: 'freeparking', name: 'Kas Negara', shortName: 'KAS NEGARA', subtitle: 'Jackpot!', landmark: 'vault', color: '#eab308', flavor: 'Berhenti di sini untuk memborong seluruh jackpot Kas Negara!' },
  { id: 21, type: 'property', group: 'red', price: 2_350_000, upgradeCost: 1_250_000, rents: [310_000, 900_000, 2_220_000, 4_350_000] },
  { id: 22, type: 'policy', name: 'Kebijakan Pemerintah', shortName: 'KEBIJAKAN', subtitle: 'Kartu Kebijakan', landmark: 'switch', color: '#2563eb', flavor: 'Ambil 1 Kartu Kebijakan Pemerintah!' },
  { id: 23, type: 'property', group: 'red', price: 2_500_000, upgradeCost: 1_250_000, rents: [330_000, 960_000, 2_380_000, 4_600_000] },
  { id: 24, type: 'property', group: 'red', price: 2_650_000, upgradeCost: 1_350_000, rents: [350_000, 1_020_000, 2_520_000, 4_850_000] },
  { id: 25, type: 'transport', group: 'transport', price: 2_000_000, rents: [250_000, 500_000, 1_000_000, 2_000_000] },
  { id: 26, type: 'property', group: 'yellow', price: 2_850_000, upgradeCost: 1_500_000, rents: [380_000, 1_100_000, 2_720_000, 5_150_000] },
  { id: 27, type: 'property', group: 'yellow', price: 3_000_000, upgradeCost: 1_500_000, rents: [400_000, 1_160_000, 2_860_000, 5_400_000] },
  { id: 28, type: 'utility', group: 'utility', price: 1_500_000, rents: [220_000, 550_000] },
  { id: 29, type: 'property', group: 'yellow', price: 3_200_000, upgradeCost: 1_600_000, rents: [430_000, 1_240_000, 3_050_000, 5_750_000] },

  { id: 30, type: 'gotojail', name: 'OTT KPK!', shortName: 'OTT KPK!', subtitle: 'Masuk Rutan!', landmark: 'siren', color: '#dc2626', flavor: 'Kena Operasi Tangkap Tangan! Langsung masuk Rutan KPK!' },
  { id: 31, type: 'property', group: 'green', price: 3_450_000, upgradeCost: 1_750_000, rents: [470_000, 1_350_000, 3_300_000, 6_100_000] },
  { id: 32, type: 'property', group: 'green', price: 3_650_000, upgradeCost: 1_750_000, rents: [500_000, 1_440_000, 3_500_000, 6_450_000] },
  { id: 33, type: 'lobby', name: 'Lobi Orang Dalam', shortName: 'LOBI ORDAL', subtitle: 'Kartu Lobi', landmark: 'folder', color: '#f59e0b', flavor: 'Ambil 1 Kartu Lobi Orang Dalam penuh kejutan!' },
  { id: 34, type: 'property', group: 'green', price: 3_900_000, upgradeCost: 1_900_000, rents: [540_000, 1_550_000, 3_750_000, 6_850_000] },
  { id: 35, type: 'transport', group: 'transport', price: 2_000_000, rents: [250_000, 500_000, 1_000_000, 2_000_000] },
  { id: 36, type: 'policy', name: 'Kebijakan Pemerintah', shortName: 'KEBIJAKAN', subtitle: 'Kartu Kebijakan', landmark: 'switch', color: '#2563eb', flavor: 'Ambil 1 Kartu Kebijakan Pemerintah!' },
  { id: 37, type: 'property', group: 'indigo', price: 4_300_000, upgradeCost: 2_100_000, rents: [620_000, 1_750_000, 4_200_000, 7_500_000] },
  { id: 38, type: 'tax_luxury', color: '#b91c1c' },
  { id: 39, type: 'property', group: 'indigo', price: 4_800_000, upgradeCost: 2_300_000, rents: [720_000, 2_050_000, 4_850_000, 8_600_000] },
];

// Deterministic PRNG (Mulberry32) so any seed reproduces the exact same board across peers
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRng(items, rng) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createBoardSeed() {
  return ((Date.now() & 0xffffffff) ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

/**
 * Generates a fresh randomized 40-tile 100%-Indonesian Monopoly board.
 * Every game draws a new random subset & arrangement from 48 real Indonesian places!
 */
export function generateRandomBoard(seed = createBoardSeed()) {
  const rng = mulberry32(seed);
  const props = shuffleWithRng(INDONESIAN_PROPERTY_POOL, rng);
  const transports = shuffleWithRng(INDONESIAN_TRANSPORT_POOL, rng);
  const utilities = shuffleWithRng(INDONESIAN_UTILITY_POOL, rng);
  const lightTax = INDONESIAN_LIGHT_TAX_POOL[Math.floor(rng() * INDONESIAN_LIGHT_TAX_POOL.length)];
  const luxuryTax = INDONESIAN_LUXURY_TAX_POOL[Math.floor(rng() * INDONESIAN_LUXURY_TAX_POOL.length)];

  let pi = 0;
  let ti = 0;
  let ui = 0;

  const tiles = BOARD_SLOTS.map((slot) => {
    if (slot.type === 'property') {
      const place = props[pi++];
      return {
        ...slot,
        name: place.name,
        shortName: place.shortName,
        province: place.province,
        landmark: place.landmark,
        flavor: place.flavor,
        color: COLOR_GROUPS[slot.group].color,
      };
    }
    if (slot.type === 'transport') {
      const hub = transports[ti++];
      return {
        ...slot,
        name: hub.name,
        shortName: hub.shortName,
        province: hub.province,
        landmark: hub.landmark,
        flavor: hub.flavor,
        color: COLOR_GROUPS.transport.color,
      };
    }
    if (slot.type === 'utility') {
      const util = utilities[ui++];
      return {
        ...slot,
        name: util.name,
        shortName: util.shortName,
        province: util.province,
        landmark: util.landmark,
        flavor: util.flavor,
        color: COLOR_GROUPS.utility.color,
      };
    }
    if (slot.type === 'tax_light') {
      return {
        id: slot.id,
        type: 'tax',
        name: lightTax.name,
        shortName: lightTax.shortName,
        subtitle: lightTax.subtitle,
        landmark: lightTax.landmark,
        taxAmount: lightTax.taxAmount,
        color: slot.color,
        flavor: lightTax.flavor,
      };
    }
    if (slot.type === 'tax_luxury') {
      return {
        id: slot.id,
        type: 'tax',
        name: luxuryTax.name,
        shortName: luxuryTax.shortName,
        subtitle: luxuryTax.subtitle,
        landmark: luxuryTax.landmark,
        taxAmount: luxuryTax.taxAmount,
        color: slot.color,
        flavor: luxuryTax.flavor,
      };
    }
    return { ...slot };
  });

  return { seed, tiles };
}

// Default preview board (used in lobby before a match generates its own random seed)
const DEFAULT_BOARD_BUNDLE = generateRandomBoard(createBoardSeed());
export const BOARD_TILES = DEFAULT_BOARD_BUNDLE.tiles;
export const DEFAULT_BOARD_SEED = DEFAULT_BOARD_BUNDLE.seed;

export function getTileById(id, board = BOARD_TILES) {
  const list = Array.isArray(board) && board.length > 0 ? board : BOARD_TILES;
  const n = list.length;
  return list[((id % n) + n) % n];
}

export function getGroupTiles(group, board = BOARD_TILES) {
  const list = Array.isArray(board) && board.length > 0 ? board : BOARD_TILES;
  return list.filter((t) => t.group === group);
}

export function formatRupiah(amount) {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(Math.round(amount));
  return `${sign}Rp${abs.toLocaleString('id-ID')}`;
}

export function formatShortRupiah(amount) {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    const val = abs / 1_000_000;
    const str = Number.isInteger(val) ? String(val) : val.toFixed(1).replace('.', ',');
    return `${sign}Rp ${str} jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp ${Math.round(abs / 1_000)} rb`;
  }
  return `${sign}Rp ${abs}`;
}
