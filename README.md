# Monopoli WNI Simulator — Monopoli Negeri Konoha (Guest-Only & Vercel-Ready)

Game monopoli online 3D dengan sentuhan lokal Indonesia yang dirancang **100% Guest-Only / Anonim (tanpa login, cukup nama & pion)**, mendukung **invite teman pakai kode room 6 karakter & link invite (`?room=KODE`)**, serta **siap langsung di-deploy ke Vercel** tanpa perlu server WebSocket berbayar.

## Fitur Utama

- **100% Guest-Only & Anonim**: Langsung masuk lobi tanpa login/daftar. Cukup isi nama panggilan (atau acak nama WNI) dan pilih 1 dari 10 karakter WNI (*Pak Pejabat, Pak Tentara, Bu RT, Pak Haji, Mbak Hijab, Bang Ojol, Mas Startup, Pak Petani, Anak Tongkrongan, Kang Parkir*).
- **Satu Tombol PENGATURAN (Terpadu)**: Tombol **PENGATURAN** yang jelas tersedia di **Menu Utama**, **Ruang Tunggu**, dan **HUD**. Semua pengaturan ada di dalam satu modal yang sama — tab `AUDIO` (volume 0–100% untuk master/musik/klik/SFX), tab `ANIMASI` (Smooth Animation ON/OFF + cutscene, default OFF), tab `RUANGAN` (kode/link invite, keamanan), serta **Cara Main**. Tidak ada tombol pengaturan yang terpisah-pisah.
- **Mode Sinematik Sementara & Kamera Follow**: Saat pion bergerak atau cutscene berjalan, HUD/kartu/laci yang menutupi papan meredup sementara dan aktif kembali setelah animasi selesai. Kamera mengikuti pion dengan lembut lalu kembali ke sudut, zoom, dan target yang dipakai pemain sebelumnya — tanpa reset; jika pemain menyentuh kamera, kontrol langsung kembali ke pemain.
- **Mobile / Touch Responsive**: Area aman notch (*safe-area*), viewport dinamis, layout HUD adaptif, daftar pemain bisa digeser horizontal, tombol sentuh besar, input nyaman tanpa auto-zoom iOS, kontrol kamera drag + pinch-to-zoom, serta kamera/FOV/DPR yang menyesuaikan layar portrait dan landscape.
- **Kualitas Grafik + Advanced Option + Gaya Pixel**: Tab `GRAFIK` di dalam satu Pengaturan menyediakan preset `RINGAN`, `SEIMBANG` (default), `TINGGI`, dan `KUSTOM`, serta switch gaya `BIASA · 3D HALUS` / `PIXEL · RETRO 8-BIT`. Pixel style merender seluruh papan/kota/pion 3D dalam buffer resolusi rendah lalu upscale nearest-neighbour, memakai material lebih faceted dan font Pixelify Sans untuk judul/HUD; gerakan pion/dadu/bangunan/partikel memakai frame bertahap agar selaras dengan estetika pixel. Preset tinggi menambah resolusi render, bayangan lembut, tinggi ruko/gedung/menara, kaca fasad, lis atap, detail dekorasi dan kepadatan partikel saat Smooth Animation aktif. Opsi kustom: resolusi, bayangan, kepadatan efek, tinggi bangunan, dan detail ornamen; tersimpan lokal per perangkat (tidak memengaruhi fairness/multiplayer) dengan batas aman otomatis untuk mobile.
- **Multiplayer Online di Vercel (Zero-Config!)**:
  - Menggunakan arsitektur **Host-Authoritative WebRTC P2P (`PeerJS`)** berbasis **Kode Room 6 karakter** (`KNH482`) sehingga bisa langsung main lintas perangkat di Vercel Static/Hobby plan tanpa server WebSocket tambahan.
  - Dilengkapi **BroadcastChannel** untuk testing multi-tab lokal secara instan, serta **Vercel Serverless Function (`/api/rooms`)** untuk daftar ruangan publik (otomatis mendukung Upstash Redis / Vercel KV bila env var diisi, dan tetap berjalan dengan fallback memori bila tanpa konfigurasi).
- **Invite Kode Room & Link Langsung**:
  - Tombol **Salin Kode**, **Salin Link (`?room=KODE`)**, dan **Bagikan ke WhatsApp** di lobi dan saat permainan.
  - Link invite langsung membuka tab **KODE** dengan pratinjau ruangan terisi otomatis.
- **Visual 3D Mirip Screenshot Asli (Three.js)**:
  - Kota 3D Indonesia lengkap dengan Monas, Istana Negara + bendera Merah-Putih, Masjid Istiqlal, flyover, dan mobil melintas.
  - Papan melingkar **40 petak acak 100% Indonesia** (*Gapura Mulai, Kebijakan, Lumpur Lapindo - Porong, PBB, Pelabuhan Merak, Lobi Orang Dalam, Canggu Bali, Rutan KPK, PLN, Pelabuhan Belawan, Tol Trans Jawa, Pajak Jalan, Bandara Soetta, Bus TransJakarta, Kas Negara, dll.*) lengkap dengan 57 landmark 3D khas daerah, aura pemilik neon, dan gedung upgrade (*Ruko → Gedung → Landmark*). Susunan lokasi berubah di setiap game.
  - HUD lengkap: pill pemain berwarna, balon dialog karakter, Kas Negara, kontrol **Tahan Untuk Melempar** dengan bar **ACAK / GANJIL / GENAP** + bar charge kuning, **PORTO**, **DAGANG**, obrolan real-time, dan Web Audio SFX/BGM.

## Deploy ke Vercel (1 Klik / Tanpa Server Tambahan)

1. Push repository ini ke GitHub Anda.
2. Buka [Vercel](https://vercel.com) → **Add New Project** → pilih repository ini.
3. Pengaturan otomatis terbaca dari `vercel.json`:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Klik **Deploy** — langsung bisa dimainkan & invite teman pakai kode room!

*(Opsional: jika ingin daftar ruangan publik di tab **CARI** tersinkron permanen lintas region Vercel, tambahkan env var `KV_REST_API_URL` & `KV_REST_API_TOKEN` atau Upstash Redis; untuk **Privat lewat kode room**, tidak butuh konfigurasi apa pun!)*

## Menjalankan Secara Lokal

```bash
npm install
npm run build
npm start
```

Buka `http://localhost:3000`.
Untuk development: `npm run dev` (Vite) dan `npm run dev:server` (opsional untuk `/api/rooms`).

## Tipografi Tema (Self-Hosted & Web-Optimized)

Font tidak lagi bergantung pada CDN pihak ketiga: seluruh berkas **WOFF2** ada di `public/fonts/` dan dimuat lewat `src/fonts.css` dengan `font-display: swap` + `preload` untuk font kritikal.

| Peran | Font | Alasan |
| --- | --- | --- |
| Logo, judul besar, nama petak 3D | **Lilita One** | Huruf tebal, bulat, dan *chunky* — sangat pas untuk nuansa papan kartun / board game. |
| Tombol, HUD, angka, badge | **Baloo 2** | Rounded, ramah, playful, tetap terbaca di ukuran kecil, dan mendukung Latin Extended. |
| Teks UI, deskripsi, chat, log | **Plus Jakarta Sans** | Geometric sans karya **Tokotype (Jakarta)** dengan x-height tinggi & konter terbuka; nyaman untuk UI dan teks kecil. |
| Kode room, timestamp, persentase | **JetBrains Mono** | Monospace tabular sehingga 6 karakter kode room & angka tidak bergeser. |
| Judul/HUD saat `PIXEL · RETRO 8-BIT` | **Pixelify Sans** | Typeface pixel-inspired untuk switch gaya retro; teks paragraf tetap memakai font UI yang mudah dibaca. |

Lisensi SIL Open Font License 1.1 untuk masing-masing font tersedia di `public/fonts/OFL-*.txt`. Pratinjau tipografi tanpa koneksi internet ada di [`typography-preview.html`](./typography-preview.html).

## Gameplay Reference

![Gameplay 1](./gameplay-1.jpg)

![Gameplay 2](./gameplay-2.jpg)

![Gameplay 3](./gameplay-3.jpg)
