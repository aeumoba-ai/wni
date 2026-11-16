export const POLICY_CARDS = [
  {
    id: 'pol_bansos',
    deck: 'policy',
    title: 'Bansos Cair Tepat Waktu!',
    description: 'Pemerintah membagikan bantuan tunai langsung. Terima Rp1.500.000 dari negara.',
    effect: { type: 'money', amount: 1_500_000 },
  },
  {
    id: 'pol_bbm',
    deck: 'policy',
    title: 'Harga BBM Naik Lagi',
    description: 'Biaya operasional melonjak! Bayar Rp300.000 untuk setiap properti yang kamu miliki ke Kas Negara.',
    effect: { type: 'per_property', amount: -300_000, toKas: true },
  },
  {
    id: 'pol_tilang',
    deck: 'policy',
    title: 'Kena Tilang ETLE',
    description: 'Kamera perempatan menangkap pelanggaranmu. Bayar denda Rp600.000 ke Kas Negara.',
    effect: { type: 'tax', amount: 600_000 },
  },
  {
    id: 'pol_thr',
    deck: 'policy',
    title: 'THR & Gaji ke-13 Cair!',
    description: 'Rekening langsung gemuk. Terima Rp2.000.000!',
    effect: { type: 'money', amount: 2_000_000 },
  },
  {
    id: 'pol_subsidi',
    deck: 'policy',
    title: 'Subsidi UMKM Kreatif',
    description: 'Bisnis lokalmu dapat penghargaan nasional. Terima Rp1.200.000!',
    effect: { type: 'money', amount: 1_200_000 },
  },
  {
    id: 'pol_audit',
    deck: 'policy',
    title: 'Audit Pajak Mendadak',
    description: 'Ada selisih laporan SPT tahun lalu. Setor Rp1.000.000 ke Kas Negara.',
    effect: { type: 'tax', amount: 1_000_000 },
  },
  {
    id: 'pol_mudik',
    deck: 'policy',
    title: 'Mudik Gratis Jalur Tol',
    description: 'Langsung meluncur ke Gapura Mulai dan ambil gaji Rp2.000.000!',
    effect: { type: 'move_to', tileId: 0, collectStart: true },
  },
  {
    id: 'pol_arisan',
    deck: 'policy',
    title: 'Menang Arisan RT!',
    description: 'Semua pemain lain wajib patungan Rp300.000 untukmu.',
    effect: { type: 'collect_all', amount: 300_000 },
  },
  {
    id: 'pol_sumbangan',
    deck: 'policy',
    title: 'Iuran 17-an Kampung',
    description: 'Sebagai warga berada, kamu nyumbang lomba panjat pinang Rp500.000 ke Kas Negara.',
    effect: { type: 'tax', amount: 500_000 },
  },
  {
    id: 'pol_macet',
    deck: 'policy',
    title: 'Terjebak Macet Pantura',
    description: 'Salah ambil jalur alternatif! Mundur 3 langkah.',
    effect: { type: 'move_rel', steps: -3 },
  },
];

export const LOBBY_CARDS = [
  {
    id: 'lob_bebas',
    deck: 'lobby',
    title: 'Kenalan Orang Dalam',
    description: 'Simpan kartu ini! Bisa dipakai untuk langsung bebas dari Rutan KPK tanpa bayar tebusan.',
    effect: { type: 'jail_free_card' },
  },
  {
    id: 'lob_tender',
    deck: 'lobby',
    title: 'Menang Tender Proyek Strategis',
    description: 'Proposalmu langsung disetujui tanpa revisi. Terima Rp2.500.000!',
    effect: { type: 'money', amount: 2_500_000 },
  },
  {
    id: 'lob_ott',
    deck: 'lobby',
    title: 'Bocor di Grup WA — Kena OTT!',
    description: 'Transaksimu terendus! Langsung masuk Rutan KPK tanpa lewat Mulai.',
    effect: { type: 'go_to_jail' },
  },
  {
    id: 'lob_kas',
    deck: 'lobby',
    title: 'Pencairan Dana Taktis',
    description: 'Kamu mendapat cipratan 50% dari saldo Kas Negara saat ini!',
    effect: { type: 'kas_half' },
  },
  {
    id: 'lob_bali',
    deck: 'lobby',
    title: 'Rapat Kerja di Canggu, Bali',
    description: 'Studi banding sambil liburan! Langsung terbang ke Canggu, Bali.',
    effect: { type: 'move_to', tileId: 6, collectStart: true },
  },
  {
    id: 'lob_traktir',
    deck: 'lobby',
    title: 'Traktir Kopi Senopati',
    description: 'Biar lobi makin lancar, bayar Rp300.000 ke masing-masing pemain lain.',
    effect: { type: 'pay_all', amount: 300_000 },
  },
  {
    id: 'lob_viral',
    deck: 'lobby',
    title: 'Konten Review Viral di FYP',
    description: 'Endorse mengalir deras! Terima Rp1.800.000.',
    effect: { type: 'money', amount: 1_800_000 },
  },
  {
    id: 'lob_calo',
    deck: 'lobby',
    title: 'Kena Tipu Calo Tanah',
    description: 'Sertifikat ternyata fotokopian! Rugi Rp1.200.000 masuk Kas Negara.',
    effect: { type: 'tax', amount: 1_200_000 },
  },
  {
    id: 'lob_whoosh',
    deck: 'lobby',
    title: 'Naik Kereta Cepat Whoosh',
    description: 'Meluncur kilat ke Stasiun Whoosh! (Jika lewat Mulai, tetap dapat gaji.)',
    effect: { type: 'move_to', tileId: 27, collectStart: true },
  },
  {
    id: 'lob_dividen',
    deck: 'lobby',
    title: 'Dividen BUMN Cair',
    description: 'Terima Rp400.000 untuk setiap properti yang kamu kuasai!',
    effect: { type: 'per_property', amount: 400_000, toKas: false },
  },
];

export function drawRandomCard(deck) {
  const pool = deck === 'policy' ? POLICY_CARDS : LOBBY_CARDS;
  return pool[Math.floor(Math.random() * pool.length)];
}
