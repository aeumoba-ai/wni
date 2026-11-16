# Monopoli WNI Simulator — Monopoli Negeri Konoha (Guest-Only & Vercel-Ready)

Game monopoli online 3D dengan sentuhan lokal Indonesia yang dirancang **100% Guest-Only / Anonim (tanpa login, cukup nama & pion)**, mendukung **invite teman pakai kode room 6 karakter & link invite (`?room=KODE`)**, serta **siap langsung di-deploy ke Vercel** tanpa perlu server WebSocket berbayar.

## Fitur Utama

- **100% Guest-Only & Anonim**: Langsung masuk lobi tanpa login/daftar. Cukup isi nama panggilan (atau acak nama WNI) dan pilih 1 dari 10 karakter WNI (*Pak Pejabat, Pak Tentara, Bu RT, Pak Haji, Mbak Hijab, Bang Ojol, Mas Startup, Pak Petani, Anak Tongkrongan, Kang Parkir*).
- **Multiplayer Online di Vercel (Zero-Config!)**:
  - Menggunakan arsitektur **Host-Authoritative WebRTC P2P (`PeerJS`)** berbasis **Kode Room 6 karakter** (`KNH482`) sehingga bisa langsung main lintas perangkat di Vercel Static/Hobby plan tanpa server WebSocket tambahan.
  - Dilengkapi **BroadcastChannel** untuk testing multi-tab lokal secara instan, serta **Vercel Serverless Function (`/api/rooms`)** untuk daftar ruangan publik (otomatis mendukung Upstash Redis / Vercel KV bila env var diisi, dan tetap berjalan dengan fallback memori bila tanpa konfigurasi).
- **Invite Kode Room & Link Langsung**:
  - Tombol **Salin Kode**, **Salin Link (`?room=KODE`)**, dan **Bagikan ke WhatsApp** di lobi dan saat permainan.
  - Link invite langsung membuka tab **KODE** dengan pratinjau ruangan terisi otomatis.
- **Visual 3D Mirip Screenshot Asli (Three.js)**:
  - Kota 3D Indonesia lengkap dengan Monas, Istana Negara + bendera Merah-Putih, Masjid Istiqlal, flyover, dan mobil melintas.
  - Papan melingkar 32 petak dengan urutan persis seperti screenshot (*Gapura Mulai, Kebijakan, Lumpur Lapindo - Porong, PBB, Pelabuhan Merak, Lobi Orang Dalam, Canggu Bali, Rutan KPK, PLN, Pelabuhan Belawan, Tol Trans Jawa, Pajak Jalan, Bandara Soetta, Bus TransJakarta, Kas Negara, dll.*) lengkap dengan properti 3D, aura pemilik neon, dan gedung upgrade (*Ruko → Gedung → Landmark*).
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

## Gameplay Reference

![Gameplay 1](./gameplay-1.jpg)

![Gameplay 2](./gameplay-2.jpg)

![Gameplay 3](./gameplay-3.jpg)
