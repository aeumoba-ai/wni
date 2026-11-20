// Katalog kustomisasi karakter — dipakai bersama oleh render 3D (Scene3D),
// ikon SVG (AvatarIcon) dan modal Kustomisasi Karakter.
//
// Semua entri punya `id` stabil: JANGAN mengubah id yang sudah ada karena
// tersimpan di localStorage pemain (konoha_guest_look). Tambah entri baru
// di akhir grupnya.

export const CUSTOMIZATION_STORAGE_KEY = 'konoha_guest_look';
export const CUSTOMIZATION_VERSION = 1;

/* ------------------------------------------------------------------ */
/* 1. Warna kulit (16)                                                 */
/* ------------------------------------------------------------------ */
export const SKIN_TONES = [
  { id: 'putih', label: 'Putih Cerah', base: '#ffe0c8', shade: '#f0c4a6' },
  { id: 'kuning_langsat', label: 'Kuning Langsat', base: '#f6d3ab', shade: '#e0b489' },
  { id: 'sawo_kuning', label: 'Sawo Kuning', base: '#f1c27d', shade: '#dba461' },
  { id: 'terang', label: 'Terang', base: '#f2c79d', shade: '#dba87c' },
  { id: 'langsat', label: 'Langsat', base: '#e0ac69', shade: '#c88f4c' },
  { id: 'madura', label: 'Madura', base: '#cf9a63', shade: '#b47f4a' },
  { id: 'bali', label: 'Bali', base: '#c58b57', shade: '#a97242' },
  { id: 'jawa', label: 'Jawa', base: '#d9a066', shade: '#bd844b' },
  { id: 'ambon', label: 'Ambon', base: '#a86b3c', shade: '#8c542b' },
  { id: 'sawo_matang', label: 'Sawo Matang', base: '#8d5524', shade: '#714018' },
  { id: 'timor', label: 'Timor', base: '#7b4b2a', shade: '#62381c' },
  { id: 'gelap', label: 'Gelap Manis', base: '#6b4226', shade: '#55301a' },
  { id: 'papua', label: 'Papua', base: '#5c3a21', shade: '#482a16' },
  { id: 'eboni', label: 'Eboni', base: '#4a2c17', shade: '#381f0e' },
  { id: 'dayak', label: 'Dayak', base: '#b87b4d', shade: '#9a6238' },
  { id: 'bugis', label: 'Bugis', base: '#c9905f', shade: '#ac7446' },
];

/* ------------------------------------------------------------------ */
/* 2. Rambut (12 gaya x 14 warna)                                      */
/* ------------------------------------------------------------------ */
export const HAIR_STYLES = [
  { id: 'pendek', label: 'Pendek Rapi', shape: 'short' },
  { id: 'cepak', label: 'Cepak', shape: 'buzz' },
  { id: 'belah', label: 'Belah Tengah', shape: 'side' },
  { id: 'ikal', label: 'Ikal', shape: 'curly' },
  { id: 'kribo', label: 'Kribo', shape: 'afro' },
  { id: 'panjang', label: 'Panjang Lurus', shape: 'long' },
  { id: 'gelombang', label: 'Gelombang', shape: 'wave' },
  { id: 'kuncir', label: 'Kuncir', shape: 'ponytail' },
  { id: 'sanggul', label: 'Sanggul', shape: 'bun' },
  { id: 'poni', label: 'Poni Rata', shape: 'bangs' },
  { id: 'mohawk', label: 'Mohawk', shape: 'mohawk' },
  { id: 'botak', label: 'Botak', shape: 'bald' },
];

export const HAIR_COLORS = [
  { id: 'hitam', label: 'Hitam Legam', color: '#14100f' },
  { id: 'hitam_kecoklatan', label: 'Hitam Kecoklatan', color: '#2b1d16' },
  { id: 'cokelat_tua', label: 'Cokelat Tua', color: '#4a2c1a' },
  { id: 'cokelat', label: 'Cokelat', color: '#6b4226' },
  { id: 'cokelat_muda', label: 'Cokelat Muda', color: '#8d5a2b' },
  { id: 'pirang', label: 'Pirang', color: '#b98b40' },
  { id: 'pirang_terang', label: 'Pirang Terang', color: '#d9b06a' },
  { id: 'merah', label: 'Merah Bubuk', color: '#8f3a1f' },
  { id: 'oranye', label: 'Oranye', color: '#c2622a' },
  { id: 'abu', label: 'Abu Perak', color: '#9ca3af' },
  { id: 'putih', label: 'Putih Uban', color: '#e5e7eb' },
  { id: 'biru', label: 'Biru Neon', color: '#3b82f6' },
  { id: 'ungu', label: 'Ungu', color: '#7c3aed' },
  { id: 'hijau', label: 'Hijau Zaitun', color: '#4d7c0f' },
];

/* ------------------------------------------------------------------ */
/* 3. Penutup kepala — budaya Indonesia & modern (21)                  */
/* ------------------------------------------------------------------ */
export const HEADWEAR = [
  { id: 'none', label: 'Tanpa Penutup', group: 'none', shape: 'none' },
  { id: 'peci_hitam', label: 'Peci Hitam', group: 'budaya', shape: 'peci' },
  { id: 'peci_beludru', label: 'Peci Beludru', group: 'budaya', shape: 'peci' },
  { id: 'kopiah_bordir', label: 'Kopiah Bordir', group: 'budaya', shape: 'peci', trim: true },
  { id: 'songkok', label: 'Songkok', group: 'budaya', shape: 'songkok' },
  { id: 'blangkon', label: 'Blangkon Jawa', group: 'budaya', shape: 'blangkon' },
  { id: 'iket_jawa', label: 'Iket Kepala Jawa', group: 'budaya', shape: 'band' },
  { id: 'udeng_bali', label: 'Udeng Bali', group: 'budaya', shape: 'udeng' },
  { id: 'ikat_dayak', label: 'Ikat Kepala Dayak', group: 'budaya', shape: 'band_feather' },
  { id: 'caping', label: 'Caping Bambu', group: 'budaya', shape: 'cone' },
  { id: 'hijab_segiempat', label: 'Hijab Segi Empat', group: 'budaya', shape: 'veil' },
  { id: 'hijab_pashmina', label: 'Pashmina', group: 'budaya', shape: 'veil_long' },
  { id: 'kerudung', label: 'Kerudung', group: 'budaya', shape: 'veil' },
  { id: 'topi_petani', label: 'Topi Petani', group: 'modern', shape: 'wide_brim' },
  { id: 'topi_sekolah', label: 'Topi Sekolah', group: 'modern', shape: 'cap' },
  { id: 'topi_pantai', label: 'Topi Pantai', group: 'modern', shape: 'wide_brim' },
  { id: 'topi_koboi', label: 'Topi Koboi', group: 'modern', shape: 'cowboy' },
  { id: 'beanie', label: 'Beanie Rajut', group: 'modern', shape: 'beanie' },
  { id: 'bandana', label: 'Bandana', group: 'modern', shape: 'band' },
  { id: 'helm_ojol', label: 'Helm Ojol', group: 'kerja', shape: 'helmet', visor: true },
  { id: 'helm_full', label: 'Helm Full Face', group: 'kerja', shape: 'helmet_full' },
  { id: 'mahkota', label: 'Mahkota', group: 'fun', shape: 'crown' },
];

export const HEADWEAR_COLORS = [
  { id: 'hitam', label: 'Hitam', color: '#1a1a1a' },
  { id: 'putih', label: 'Putih', color: '#f7f7f2' },
  { id: 'krem', label: 'Krem', color: '#e7d7b8' },
  { id: 'cokelat', label: 'Cokelat', color: '#7a5230' },
  { id: 'merah', label: 'Merah', color: '#c0392b' },
  { id: 'marun', label: 'Marun', color: '#7f1d1d' },
  { id: 'navy', label: 'Navy', color: '#1e3a5f' },
  { id: 'hijau', label: 'Hijau', color: '#2f7d32' },
  { id: 'toska', label: 'Toska', color: '#0f766e' },
  { id: 'ungu', label: 'Ungu', color: '#6b21a8' },
  { id: 'pink', label: 'Pink', color: '#db2777' },
  { id: 'emas', label: 'Emas', color: '#d4a017' },
  { id: 'oranye', label: 'Oranye', color: '#e2711d' },
  { id: 'abu', label: 'Abu', color: '#6b7280' },
];

/* ------------------------------------------------------------------ */
/* 4. Atasan — batik/adat + kaos & kemeja biasa (27)                   */
/* ------------------------------------------------------------------ */
export const TOPS = [
  // --- Budaya Indonesia ---
  { id: 'batik_parang', label: 'Batik Parang', group: 'budaya', color: '#6b4423', accent: '#f2e3c6', pattern: 'batik' },
  { id: 'batik_kawung', label: 'Batik Kawung', group: 'budaya', color: '#3f2a1d', accent: '#d9b06a', pattern: 'batik' },
  { id: 'batik_megamendung', label: 'Batik Mega Mendung', group: 'budaya', color: '#1e3a5f', accent: '#7db8e8', pattern: 'batik' },
  { id: 'batik_ceplok', label: 'Batik Ceplok', group: 'budaya', color: '#7f1d1d', accent: '#f3d19c', pattern: 'batik' },
  { id: 'batik_sogan', label: 'Batik Sogan', group: 'budaya', color: '#5a3b1a', accent: '#e8c37a', pattern: 'batik' },
  { id: 'batik_pekalongan', label: 'Batik Pekalongan', group: 'budaya', color: '#0f766e', accent: '#fde68a', pattern: 'batik' },
  { id: 'kebaya', label: 'Kebaya', group: 'budaya', color: '#c2185b', accent: '#f9d7e3', pattern: 'sash' },
  { id: 'kebaya_kartini', label: 'Kebaya Kartini', group: 'budaya', color: '#f1f5f9', accent: '#b91c1c', pattern: 'sash' },
  { id: 'beskap', label: 'Beskap Jawa', group: 'budaya', color: '#1f2937', accent: '#b8860b', pattern: 'collar' },
  { id: 'surjan', label: 'Surjan Lurik', group: 'budaya', color: '#7c5b3a', accent: '#e8dcc0', pattern: 'stripes' },
  { id: 'tenun_ikat', label: 'Tenun Ikat', group: 'budaya', color: '#7a3b2e', accent: '#f0c987', pattern: 'stripes' },
  { id: 'ulos', label: 'Ulos Batak', group: 'budaya', color: '#111827', accent: '#b91c1c', pattern: 'batik' },
  { id: 'sasirangan', label: 'Sasirangan', group: 'budaya', color: '#0e7490', accent: '#fbbf24', pattern: 'batik' },
  { id: 'baju_bodo', label: 'Baju Bodo', group: 'budaya', color: '#f4a2c0', accent: '#fde68a', pattern: 'plain' },
  // --- Kaos & kemeja biasa ---
  { id: 'kaos_putih', label: 'Kaos Putih Polos', group: 'modern', color: '#f8fafc', accent: '#cbd5e1', pattern: 'plain' },
  { id: 'kaos_hitam', label: 'Kaos Hitam Polos', group: 'modern', color: '#1f2937', accent: '#4b5563', pattern: 'plain' },
  { id: 'kaos_merah', label: 'Kaos Merah Polos', group: 'modern', color: '#dc2626', accent: '#f87171', pattern: 'plain' },
  { id: 'kaos_biru', label: 'Kaos Biru Polos', group: 'modern', color: '#2563eb', accent: '#93c5fd', pattern: 'plain' },
  { id: 'kaos_hijau', label: 'Kaos Hijau Polos', group: 'modern', color: '#15803d', accent: '#86efac', pattern: 'plain' },
  { id: 'kaos_kuning', label: 'Kaos Kuning Polos', group: 'modern', color: '#eab308', accent: '#fde68a', pattern: 'plain' },
  { id: 'kaos_abu', label: 'Kaos Abu Polos', group: 'modern', color: '#94a3b8', accent: '#e2e8f0', pattern: 'plain' },
  { id: 'kaos_loreng', label: 'Kaos Loreng', group: 'modern', color: '#4d5d3a', accent: '#8a7a4e', pattern: 'batik' },
  { id: 'kaos_stripes', label: 'Kaos Garis', group: 'modern', color: '#f1f5f9', accent: '#0f172a', pattern: 'stripes' },
  { id: 'kemeja_flanel', label: 'Kemeja Flanel', group: 'modern', color: '#b91c1c', accent: '#1f2937', pattern: 'stripes' },
  { id: 'kemeja_putih', label: 'Kemeja Putih', group: 'modern', color: '#ffffff', accent: '#cbd5e1', pattern: 'collar' },
  { id: 'hoodie', label: 'Hoodie', group: 'modern', color: '#334155', accent: '#94a3b8', pattern: 'plain' },
  { id: 'jaket_jeans', label: 'Jaket Jeans', group: 'modern', color: '#1e3a8a', accent: '#93c5fd', pattern: 'collar' },
  // --- Kerja / seragam ---
  { id: 'seragam_sekolah', label: 'Seragam Sekolah', group: 'kerja', color: '#f8fafc', accent: '#1e3a5f', pattern: 'collar' },
  { id: 'jaket_ojol', label: 'Jaket Ojol', group: 'kerja', color: '#15803d', accent: '#facc15', pattern: 'collar' },
  { id: 'rompi_satpam', label: 'Rompi Satpam', group: 'kerja', color: '#1e3a5f', accent: '#eab308', pattern: 'sash' },
  { id: 'seragam_pns', label: 'Seragam PNS', group: 'kerja', color: '#a1865c', accent: '#5b4636', pattern: 'collar' },
  { id: 'wearpack', label: 'Wearpack', group: 'kerja', color: '#0f766e', accent: '#facc15', pattern: 'stripes' },
  { id: 'celemek_warung', label: 'Celemek Warung', group: 'kerja', color: '#f59e0b', accent: '#fff7ed', pattern: 'plain' },
];

/* ------------------------------------------------------------------ */
/* 5. Bawahan (9)                                                      */
/* ------------------------------------------------------------------ */
export const BOTTOMS = [
  { id: 'celana_panjang', label: 'Celana Panjang', color: '#27272a' },
  { id: 'celana_pendek', label: 'Celana Pendek', color: '#3f4854' },
  { id: 'jeans', label: 'Jeans', color: '#1e3a8a' },
  { id: 'sarung', label: 'Kain Sarung', color: '#166534' },
  { id: 'celana_batik', label: 'Celana Batik', color: '#5a3b1a' },
  { id: 'rok_panjang', label: 'Rok Panjang', color: '#7c3aed' },
  { id: 'kulot', label: 'Kulot', color: '#be185d' },
  { id: 'training', label: 'Celana Training', color: '#111827', stripe: '#facc15' },
  { id: 'celana_kerja', label: 'Celana Kerja', color: '#4b5563' },
];

/* ------------------------------------------------------------------ */
/* 6. Alas kaki (7)                                                    */
/* ------------------------------------------------------------------ */
export const SHOES = [
  { id: 'sneakers', label: 'Sneakers', color: '#f8fafc', sole: '#1f2937' },
  { id: 'sandal_jepit', label: 'Sandal Jepit', color: '#0f766e', sole: '#0b4f49' },
  { id: 'sepatu_formal', label: 'Sepatu Formal', color: '#111827', sole: '#000000' },
  { id: 'sepatu_sekolah', label: 'Sepatu Sekolah', color: '#0f172a', sole: '#e5e7eb' },
  { id: 'sepatu_boot', label: 'Sepatu Boot', color: '#78350f', sole: '#292524' },
  { id: 'sepatu_olahraga', label: 'Sepatu Olahraga', color: '#dc2626', sole: '#f8fafc' },
  { id: 'tanpa', label: 'Tanpa Alas Kaki', color: null, sole: null },
];

/* ------------------------------------------------------------------ */
/* 7. Aksesori (20, boleh pilih sampai 4)                              */
/* ------------------------------------------------------------------ */
export const ACCESSORIES = [
  { id: 'kacamata', label: 'Kacamata', slot: 'face' },
  { id: 'kacamata_hitam', label: 'Kacamata Hitam', slot: 'face' },
  { id: 'kacamata_bulat', label: 'Kacamata Bulat', slot: 'face' },
  { id: 'masker', label: 'Masker', slot: 'face' },
  { id: 'kumis', label: 'Kumis', slot: 'face' },
  { id: 'jenggot', label: 'Jenggot', slot: 'face' },
  { id: 'anting', label: 'Anting', slot: 'head' },
  { id: 'tindik_hidung', label: 'Tindik Hidung', slot: 'face' },
  { id: 'kalung', label: 'Kalung', slot: 'neck' },
  { id: 'syal', label: 'Syal', slot: 'neck' },
  { id: 'selendang', label: 'Selendang', slot: 'neck' },
  { id: 'dasi', label: 'Dasi', slot: 'neck' },
  { id: 'tas_ransel', label: 'Tas Ransel', slot: 'back' },
  { id: 'tas_belanja', label: 'Tas Belanja', slot: 'hand' },
  { id: 'kipas', label: 'Kipas', slot: 'hand' },
  { id: 'buku', label: 'Buku Catatan', slot: 'hand' },
  { id: 'mikrofon', label: 'Mikrofon', slot: 'hand' },
  { id: 'payung', label: 'Payung', slot: 'hand' },
  { id: 'jam_tangan', label: 'Jam Tangan', slot: 'wrist' },
  { id: 'gelang', label: 'Gelang', slot: 'wrist' },
];

export const MAX_ACCESSORIES = 4;

/** Urutan tab di modal kustomisasi. */
export const CUSTOMIZATION_TABS = [
  { id: 'kulit', label: 'Kulit' },
  { id: 'rambut', label: 'Rambut' },
  { id: 'kepala', label: 'Penutup Kepala' },
  { id: 'atasan', label: 'Atasan' },
  { id: 'bawahan', label: 'Bawahan' },
  { id: 'kaki', label: 'Alas Kaki' },
  { id: 'aksesori', label: 'Aksesori' },
];

const byId = (list) => new Map(list.map((item) => [item.id, item]));

export const SKIN_BY_ID = byId(SKIN_TONES);
export const HAIR_STYLE_BY_ID = byId(HAIR_STYLES);
export const HAIR_COLOR_BY_ID = byId(HAIR_COLORS);
export const HEADWEAR_BY_ID = byId(HEADWEAR);
export const HEADWEAR_COLOR_BY_ID = byId(HEADWEAR_COLORS);
export const TOP_BY_ID = byId(TOPS);
export const BOTTOM_BY_ID = byId(BOTTOMS);
export const SHOE_BY_ID = byId(SHOES);
export const ACCESSORY_BY_ID = byId(ACCESSORIES);

export const DEFAULT_CUSTOMIZATION = Object.freeze({
  version: CUSTOMIZATION_VERSION,
  skin: 'terang',
  hairStyle: 'pendek',
  hairColor: 'hitam',
  headwear: 'none',
  headwearColor: 'hitam',
  top: 'kaos_putih',
  bottom: 'celana_panjang',
  shoes: 'sneakers',
  accessories: Object.freeze([]),
});

const pick = (map, id, fallback) => (id && map.has(id) ? id : fallback);
const idOf = (item, fallback) => {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object' && typeof item.id === 'string') return item.id;
  return fallback;
};

/** Selalu mengembalikan objek lengkap & valid — tidak pernah melempar error. */
export function normalizeCustomization(value) {
  const raw = value && typeof value === 'object' ? value : {};
  const list = Array.isArray(raw.accessories) ? raw.accessories : [];
  const seen = new Set();
  const accessories = [];
  for (const entry of list) {
    const id = idOf(entry, null);
    if (!id || seen.has(id) || !ACCESSORY_BY_ID.has(id)) continue;
    seen.add(id);
    accessories.push(id);
    if (accessories.length >= MAX_ACCESSORIES) break;
  }
  return {
    version: CUSTOMIZATION_VERSION,
    skin: pick(SKIN_BY_ID, raw.skin, DEFAULT_CUSTOMIZATION.skin),
    hairStyle: pick(HAIR_STYLE_BY_ID, raw.hairStyle, DEFAULT_CUSTOMIZATION.hairStyle),
    hairColor: pick(HAIR_COLOR_BY_ID, raw.hairColor, DEFAULT_CUSTOMIZATION.hairColor),
    headwear: pick(HEADWEAR_BY_ID, raw.headwear, DEFAULT_CUSTOMIZATION.headwear),
    headwearColor: pick(HEADWEAR_COLOR_BY_ID, raw.headwearColor, DEFAULT_CUSTOMIZATION.headwearColor),
    top: pick(TOP_BY_ID, raw.top, DEFAULT_CUSTOMIZATION.top),
    bottom: pick(BOTTOM_BY_ID, raw.bottom, DEFAULT_CUSTOMIZATION.bottom),
    shoes: pick(SHOE_BY_ID, raw.shoes, DEFAULT_CUSTOMIZATION.shoes),
    accessories,
  };
}

/** Apakah look masih sama dengan default (dipakai untuk badge "AKTIF"). */
export function isDefaultCustomization(value) {
  const look = normalizeCustomization(value);
  return (
    look.skin === DEFAULT_CUSTOMIZATION.skin &&
    look.hairStyle === DEFAULT_CUSTOMIZATION.hairStyle &&
    look.hairColor === DEFAULT_CUSTOMIZATION.hairColor &&
    look.headwear === DEFAULT_CUSTOMIZATION.headwear &&
    look.top === DEFAULT_CUSTOMIZATION.top &&
    look.bottom === DEFAULT_CUSTOMIZATION.bottom &&
    look.shoes === DEFAULT_CUSTOMIZATION.shoes &&
    look.accessories.length === 0
  );
}

/** Semua warna siap pakai untuk render 3D / SVG. */
export function resolveLook(value) {
  const look = normalizeCustomization(value);
  const skin = SKIN_BY_ID.get(look.skin);
  const hairStyle = HAIR_STYLE_BY_ID.get(look.hairStyle);
  const hairColor = HAIR_COLOR_BY_ID.get(look.hairColor);
  const headwear = HEADWEAR_BY_ID.get(look.headwear);
  const headwearColor = HEADWEAR_COLOR_BY_ID.get(look.headwearColor);
  const top = TOP_BY_ID.get(look.top);
  const bottom = BOTTOM_BY_ID.get(look.bottom);
  const shoes = SHOE_BY_ID.get(look.shoes);
  return {
    look,
    skin,
    hairStyle,
    hairColor,
    headwear,
    headwearColor,
    top,
    bottom,
    shoes,
    accessories: look.accessories.map((id) => ACCESSORY_BY_ID.get(id)).filter(Boolean),
    hasAccessory: (id) => look.accessories.includes(id),
  };
}

export function countCustomizationCombinations() {
  let acc = 1;
  for (let k = 0; k <= MAX_ACCESSORIES; k++) {
    // C(n, k)
    let c = 1;
    for (let i = 0; i < k; i++) c = (c * (ACCESSORIES.length - i)) / (i + 1);
    acc += c;
  }
  return (
    SKIN_TONES.length *
    HAIR_STYLES.length *
    HAIR_COLORS.length *
    HEADWEAR.length *
    HEADWEAR_COLORS.length *
    TOPS.length *
    BOTTOMS.length *
    SHOES.length *
    acc
  );
}

export const CUSTOMIZATION_TOTALS = Object.freeze({
  skin: SKIN_TONES.length,
  hairStyle: HAIR_STYLES.length,
  hairColor: HAIR_COLORS.length,
  headwear: HEADWEAR.length,
  headwearColor: HEADWEAR_COLORS.length,
  top: TOPS.length,
  bottom: BOTTOMS.length,
  shoes: SHOES.length,
  accessory: ACCESSORIES.length,
  combinations: countCustomizationCombinations(),
});

const rand = (list) => list[Math.floor(Math.random() * list.length)];

/** Look acak — selalu valid & bervariasi (dipakai tombol "ACAK"). */
export function randomCustomization() {
  const accessories = [];
  const pool = [...ACCESSORIES];
  const wanted = Math.floor(Math.random() * (MAX_ACCESSORIES + 1));
  for (let i = 0; i < wanted && pool.length; i++) {
    const chosen = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    accessories.push(chosen.id);
  }
  return normalizeCustomization({
    skin: rand(SKIN_TONES).id,
    hairStyle: rand(HAIR_STYLES).id,
    hairColor: rand(HAIR_COLORS).id,
    headwear: rand(HEADWEAR).id,
    headwearColor: rand(HEADWEAR_COLORS).id,
    top: rand(TOPS).id,
    bottom: rand(BOTTOMS).id,
    shoes: rand(SHOES).id,
    accessories,
  });
}

/** Ringkasan singkat untuk tooltip/daftar. */
export function describeCustomization(value) {
  const r = resolveLook(value);
  const parts = [r.skin.label, r.top.label, r.headwear.id === 'none' ? r.hairStyle.label : r.headwear.label];
  if (r.accessories.length) parts.push(r.accessories.map((a) => a.label).join(', '));
  return parts.join(' · ');
}
