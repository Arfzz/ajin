# AJIN (Aplikasi Jembatan Bahasa Isyarat dan Narasi)

**Pengembangan Aplikasi Pembelajaran Sistem Isyarat Bahasa Indonesia (SIBI) Berbasis Computer Vision untuk Pengenalan Alfabet Secara Real-Time**

Arsitektur: Monorepo Full-Stack JavaScript (React Vite + Express.js + Supabase PostgreSQL) dengan Inferensi Client-Side TensorFlow.js, Framer Motion, 21st.dev Container Scroll & Media Expansion, GSAP, Lenis Smooth Scroll, dan Prosedural Remotion Guide.

---

## 1. Struktur Monorepo

```text
ajin/
├── package.json                       # Root script (jalankan client & server)
├── README.md                          # Dokumentasi proyek
├── supabase/
│   └── seed.sql                       # DDL Skema PostgreSQL & Seeder 26 Alfabet SIBI
├── server/                            # Express.js Backend (Port 5000)
│   ├── prisma/
│   │   └── schema.prisma              # Skema Prisma untuk Supabase DB
│   ├── src/
│   │   ├── config/supabase.js         # Klien Supabase dengan in-memory fallback
│   │   ├── controllers/               # Auth, Alfabet, Progres, Telemetri
│   │   ├── routes/                    # API endpoints
│   │   └── index.js                   # Server utama Express
│   ├── .env.example
│   └── package.json
└── client/                            # React Vite Frontend (Port 5173)
    ├── public/
    │   └── model/                     # Lokasi model TensorFlow.js (model.json & labels.json)
    │       └── labels.json            # Array 26 label ["A", "B", ..., "Z"]
    ├── src/
    │   ├── components/
    │   │   ├── creative/              # 21st.dev (ContainerScroll & MediaExpansionHero)
    │   │   ├── reactbits/             # SplitText, SpotlightCard, MagnetButton, DecryptedText, TiltedCard, FloatingDock
    │   │   ├── remotion/              # Panduan visual gerak isyarat prosedural
    │   │   ├── vision/                # WebcamCanvas (ROI guide box) & TelemetryBar
    │   │   └── layout/                # Navbar & SmoothScroll (Lenis + GSAP)
    │   ├── hooks/
    │   │   └── useSibiModel.js        # Hook TFJS dengan fallback Mode Simulasi interaktif
    │   ├── pages/
    │   │   ├── HomePage.jsx           # Beranda dengan 21st.dev Container Scroll & Bento Grid
    │   │   ├── DictionaryPage.jsx     # Kamus 26 alfabet SIBI + filter + drawer detail
    │   │   ├── PracticePage.jsx       # Studio latihan kamera real-time
    │   │   ├── NarrativePage.jsx      # Jembatan isyarat ke narasi + Text-to-Speech id-ID
    │   │   ├── QuizPage.jsx           # Tantangan mengeja kata SIBI
    │   │   └── AnalyticsPage.jsx      # Dashboard evaluasi empiris & ekspor CSV
    │   ├── App.jsx
    │   └── main.jsx
    ├── .env.example
    └── package.json
```

---

## 2. Cara Menjalankan Aplikasi

### Langkah 1: Install Dependensi
Jalankan di root folder proyek:
```bash
npm --prefix server install
npm --prefix client install
```

### Langkah 2: Menjalankan Server Backend dan Client Frontend Bersamaan
```bash
npm run dev
```
Atau jalankan di dua terminal terpisah:
* Terminal 1: `npm --prefix server run dev` (Berjalan di `http://localhost:5000`)
* Terminal 2: `npm --prefix client run dev` (Berjalan di `http://localhost:5173`)

---

## 3. Cara Menaruh Model dari Google Colab

Ketika model Machine Learning selesai dilatih dan dikonversi ke format TensorFlow.js di Google Colab:

1. Unduh hasil konversi: file `model.json` dan seluruh file shard bobot bertipe `.bin` (misalnya `group1-shard1of1.bin`).
2. Taruh file-file tersebut ke folder:
   ```text
   client/public/model/
   ├── model.json
   ├── group1-shard1of1.bin
   └── labels.json
   ```
3. Buka web kembali. Sistem akan secara otomatis mendeteksi `model.json`, melakukan warm-up WebGL, dan beralih dari **Mode Simulasi** ke **Mode Inferensi TensorFlow.js Asli**.

> **Catatan:** Jika model belum ditaruh di folder `client/public/model/`, aplikasi akan otomatis berjalan dalam **Mode Simulasi Interaktif**. Anda tetap dapat memilih huruf target atau menyimulasikan deteksi kamera tanpa hambatan.

---

## 4. Setup Database Supabase (Opsional / Siap Pakai)

Jika ingin menyimpan progres dan data telemetri penelitian ke akun Supabase Anda:

1. Buka [Supabase Dashboard](https://supabase.com).
2. Masuk ke menu **SQL Editor**, buka file `supabase/seed.sql` di proyek ini, lalu salin dan jalankan kodenya. Seluruh tabel dan data 26 alfabet SIBI langsung terisi lengkap.
3. Salin URL dan Kunci API Supabase ke file `server/.env` dan `client/.env`.

---

## 5. Fitur Utama

* **21st.dev Container Scroll & Media Expansion:** Animasi 3D tilt scroll dinamis yang membuka studio visualizer SIBI.
* **Mekanisme Hold-to-Type 1.5 Detik:** Menjaga stabilitas input dengan penyangga temporal frame sehingga tidak terjadi salah deteksi saat tangan bergerak.
* **Jembatan Narasi & TTS id-ID:** Merangkai huruf isyarat menjadi kata dan kalimat yang dapat disuarakan dengan Web Speech API Bahasa Indonesia.
* **Dashboard Evaluasi Empiris:** Merekam latensi, FPS, dan akurasi per kelas huruf dengan tombol **Ekspor CSV** untuk bab analisis skripsi.
