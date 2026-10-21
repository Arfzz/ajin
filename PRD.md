# AGENT SYSTEM PROMPT & PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Project Name:** AJIN (Aplikasi Jembatan Bahasa Isyarat dan Narasi)  
**Subtitle:** Pengembangan Aplikasi Pembelajaran Sistem Isyarat Bahasa Indonesia (SIBI) Berbasis Computer Vision untuk Pengenalan Alfabet Secara Real-Time  
**Architecture:** Monorepo Full-Stack JavaScript (React.js + Express.js + Supabase PostgreSQL) dengan Client-Side TensorFlow.js Inference & High-End Interactive Motion UI  

---

## 1. INSTRUKSI UTAMA UNTUK AI CODING AGENT
Kamu adalah Senior Full-Stack Software Engineer, Creative Frontend Developer, dan Computer Vision Architect. Tugas kamu adalah membangun aplikasi web **AJIN** dari nol hingga siap jalan (*production-ready MVP*) berdasarkan spesifikasi di dokumen ini.

### Aturan Ketat (Strict Constraints):
1. **Terminologi Resmi:** Gunakan selalu istilah **"Sistem Isyarat Bahasa Indonesia (SIBI)"** di seluruh UI, teks dokumentasi, dan database (bukan "Bahasa Isyarat Indonesia").
2. **Client-Side ML Inference:** Model Machine Learning sudah dilatih di Google Colab menggunakan Keras/TensorFlow dan dikonversi ke format **TensorFlow.js Graph Model (`model.json` + `.bin` shards + `labels.json`)**. JANGAN membuat backend Python untuk inferensi. Semua inferensi *computer vision* wajib berjalan di browser pengguna (*client-side*) menggunakan `@tensorflow/tfjs` agar mencapai *real-time* 20–30 FPS.
3. **Graceful Model Fallback (Mode Simulasi/Demo):** Jika file `/public/model/model.json` belum ditaruh oleh developer di folder `public/model/`, aplikasi TIDAK BOLEH crash. Buat *fallback/mock inference mode* interaktif (bisa memilih simulasi huruf secara manual atau *auto-cycle*) dan tampilkan status jelas bahwa sistem berjalan dalam Mode Simulasi sampai `model.json` terdeteksi.
4. **Database Supabase (PostgreSQL):** Gunakan **Supabase** sebagai database utama (PostgreSQL) dan penyedia autentikasi/penyimpanan. Sediakan integrasi via `@supabase/supabase-js` dan/atau Prisma ORM dengan provider `postgresql` (`DATABASE_URL` dan `DIRECT_URL` untuk Supabase connection pooling).
5. **High-Craft Creative UI & Performance Guardrail:**
   * Gunakan **Lenis (`@studio-freight/lenis` atau `lenis`)** untuk *smooth scrolling* di seluruh halaman informasi/katalog.
   * Gunakan **GSAP (`gsap` + `@gsap/react` + `ScrollTrigger`)** dan **Framer Motion (`framer-motion`)** untuk animasi transisi halaman, *micro-interactions*, dan efek *scroll reveal*.
   * Gunakan pola komponen bergaya **ReactBits** (seperti *SplitText*, *BlurText*, *SpotlightCard*, *MagnetButton*, * Aurora/Particles Background*) yang bersih dan modular di `src/components/reactbits/`.
   * Gunakan **Remotion (`remotion` + `@remotion/player`)** untuk merender video panduan interaktif secara terprogram (animasi *onboarding* cara penggunaan ROI kamera, demonstrasi perbedaan isyarat statis vs dinamis J/Z, dan visualisasi ejaan kata SIBI).
   * **PENTING (WebGL Thread Safety):** Saat kamera webcam dan inferensi TensorFlow.js sedang aktif di `PracticePage`, `NarrativePage`, dan `QuizPage`, **matikan atau minimalkan animasi canvas/partikel berat di latar belakang** agar tidak berebut *GPU frame budget* dengan WebGL milik TensorFlow.js.
6. **Pemisahan Kelas SIBI:** Fokus aplikasi ini adalah **26 kelas alfabet SIBI (A–Z)**, dengan pembedaan UI yang kontras antara isyarat **statis** (A–I, K–Y) dan isyarat **dinamis/bergerak** (J dan Z).

---

## 2. TECH STACK & ARSITEKTUR DIREKTORI

### Tech Stack
* **Frontend Core (`/client`):** React 18+ (Vite), Tailwind CSS, React Router DOM v6, Zustand (State Management), Axios, `@supabase/supabase-js`.
* **Creative UI & Motion (`/client`):**
  * `gsap`, `@gsap/react` (ScrollTrigger, timeline animations)
  * `lenis` (Smooth scroll wrapper)
  * `remotion`, `@remotion/player` (Programmatic instructional video player)
  * `framer-motion`, `clsx`, `tailwind-merge` (Komponen interaktif bergaya **ReactBits**)
  * `lucide-react` (Icons), `canvas-confetti` (Selebrasi kuis/mastery)
* **Computer Vision (`/client`):** `@tensorflow/tfjs`, `react-webcam`.
* **Backend (`/server`):** Node.js, Express.js, CORS, Dotenv, `@supabase/supabase-js`, Prisma ORM (`postgresql` terhubung ke Supabase).

### Struktur Monorepo yang Harus Dibuat
```text
ajin-sibi-app/
├── package.json                       # Root scripts (concurrently jalankan client & server)
├── supabase/
│   └── seed.sql                       # SQL DDL & Seeder langsung untuk Supabase SQL Editor
├── server/                            # Express.js Backend (Port 5000)
│   ├── prisma/
│   │   ├── schema.prisma              # Skema PostgreSQL Supabase
│   │   └── seed.js                    # Seeder 26 Alfabet SIBI (A-Z)
│   ├── src/
│   │   ├── config/
│   │   │   └── supabase.js            # Supabase Admin/Service client
│   │   ├── controllers/
│   │   ├── middlewares/               # Verifikasi Supabase JWT / Custom JWT
│   │   ├── routes/
│   │   └── index.js
│   ├── .env.example
│   └── package.json
└── client/                            # React Vite Frontend (Port 5173)
    ├── public/
    │   └── model/                     # Tempat menaruh model.json, *.bin, dan labels.json
    │       └── labels.json            # Default array ["A", "B", ..., "Z"]
    ├── src/
    │   ├── components/
    │   │   ├── layout/
    │   │   │   ├── SmoothScroll.jsx   # Lenis + GSAP ScrollTrigger sync wrapper
    │   │   │   └── Navbar.jsx
    │   │   ├── reactbits/             # Komponen UI kreatif bergaya ReactBits
    │   │   │   ├── SplitText.jsx      # Animasi tipografi per huruf/kata dengan GSAP
    │   │   │   ├── SpotlightCard.jsx  # Kartu kamus SIBI dengan efek radial spotlight kursor
    │   │   │   ├── MagnetButton.jsx   # Tombol CTA magnetik dengan GSAP quickTo
    │   │   │   └── DecryptedText.jsx  # Efek teks saat huruf SIBI berhasil diterjemahkan
    │   │   ├── remotion/              # Komposisi video interaktif dengan @remotion/player
    │   │   │   ├── SibiGuideVideo.jsx # Komposisi Remotion panduan posisi tangan & gestur J/Z
    │   │   │   └── GuidePlayer.jsx    # Wrapper @remotion/player untuk halaman Kamus/Latihan
    │   │   └── vision/
    │   │       ├── WebcamCanvas.jsx   # Kamera + ROI guide box + TFJS inference loop
    │   │       └── TelemetryBar.jsx   # Real-time FPS, Latency (ms), dan Confidence (%)
    │   ├── hooks/
    │   │   └── useSibiModel.js        # Custom hook load tf.loadGraphModel & prediksi
    │   ├── lib/
    │   │   └── supabaseClient.js      # Inisialisasi Supabase client frontend
    │   ├── pages/
    │   │   ├── HomePage.jsx           # Landing page interaktif (Lenis + GSAP + ReactBits + Remotion)
    │   │   ├── DictionaryPage.jsx     # Kamus 26 alfabet SIBI dengan SpotlightCard & Remotion preview
    │   │   ├── PracticePage.jsx       # Latihan per huruf real-time
    │   │   ├── NarrativePage.jsx      # Jembatan Isyarat & Narasi (Susun Kata + TTS id-ID)
    │   │   ├── QuizPage.jsx           # Evaluasi/Tantangan tebak & eja kata
    │   │   └── AnalyticsPage.jsx      # Dashboard metrik evaluasi empiris & Export CSV
    │   ├── services/
    │   │   └── api.js                 # Axios instance ke Express API
    │   ├── App.jsx
    │   └── main.jsx
    ├── .env.example
    └── package.json

```

---

## 3. SKEMA DATABASE SUPABASE (`server/prisma/schema.prisma` & `supabase/seed.sql`)

Buat dua dukungan sekaligus: file `server/prisma/schema.prisma` untuk ORM di Express, DAN file `supabase/seed.sql` agar developer bisa langsung *copy-paste* ke SQL Editor Supabase jika ingin setup instan.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id           String             @id @default(uuid()) // Kompatibel dengan Supabase Auth UUID
  name         String
  email        String             @unique
  passwordHash String?
  role         String             @default("student") // "student" | "admin"
  createdAt    DateTime           @default(now())
  progress     UserProgress[]
  telemetries  SessionTelemetry[]
}

model SibiAlphabet {
  id                Int            @id @default(autoincrement())
  letter            String         @unique // "A" sampai "Z"
  gestureType       String         // "static" (A-I, K-Y) atau "dynamic" (J, Z)
  description       String         // Instruksi posisi jari dalam Bahasa Indonesia
  referenceImageUrl String         // URL gambar referensi isyarat (Supabase Storage / Public URL)
  difficulty        String         @default("easy") // "easy" | "medium" | "hard"
  tips              String?        // Tips khusus pencahayaan/sudut kamera (misal untuk huruf K, Y, P)
  progress          UserProgress[]
}

model UserProgress {
  id             Int          @id @default(autoincrement())
  userId         String
  alphabetId     Int
  isMastered     Boolean      @default(false)
  bestConfidence Float        @default(0)
  attemptsCount  Int          @default(0)
  updatedAt      DateTime     @updatedAt
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  alphabet       SibiAlphabet @relation(fields: [alphabetId], references: [id], onDelete: Cascade)

  @@unique([userId, alphabetId])
}

model SessionTelemetry {
  id             Int      @id @default(autoincrement())
  userId         String?
  sessionType    String   // "practice" | "narrative" | "quiz"
  targetLabel    String?  // Huruf atau kata yang diuji
  predictedLabel String?
  confidence     Float    // Rata-rata confidence (0-100)
  latencyMs      Float    // Waktu inferensi per frame dalam ms
  fps            Float    // Frame per second
  lightingCond   String?  // Catatan kondisi pengujian (opsional)
  isSuccess      Boolean  @default(true)
  createdAt      DateTime @default(now())
  user           User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
}

```

---

## 4. SPESIFIKASI FITUR & LOGIKA TEKNIS

### Modul 1: Creative Frontend Architecture (Lenis, GSAP, ReactBits, Remotion)

1. **Smooth Scrolling (`SmoothScroll.jsx`):**
* Integrasikan `Lenis` dengan `gsap.ticker` dan `ScrollTrigger.update` sehingga animasi scroll GSAP berjalan mulus tanpa *jitter*.


2. **Komponen Bergaya ReactBits (`src/components/reactbits/`):**
* `SplitText.jsx`: Animasi *hero title* di `HomePage` menggunakan GSAP `fromTo` dengan `stagger`.
* `SpotlightCard.jsx`: Kartu interaktif untuk 26 alfabet SIBI di `DictionaryPage` yang memunculkan sorotan cahaya mengikuti koordinat kursor mouse `(x, y)`.
* `DecryptedText.jsx`: Efek teks terenkripsi yang berubah menjadi huruf SIBI yang terdeteksi saat huruf baru masuk ke kotak kalimat di `NarrativePage`.
* `MagnetButton.jsx`: Tombol aksi utama yang tertarik secara halus ke arah kursor saat *hover*.


3. **Programmatic Video dengan Remotion (`src/components/remotion/`):**
* Buat komponen `SibiGuideVideo.jsx` menggunakan `AbsoluteFill`, `useCurrentFrame`, `interpolate`, dan `spring` dari `remotion`.
* Video ini memvisualisasikan: (a) Cara memosisikan telapak tangan di dalam kotak ROI kamera, (b) Ilustrasi lintasan gerak jari untuk huruf dinamis **J** dan **Z**, serta (c) Simulasi visual cara menahan gestur selama 1.5 detik untuk mengetik narasi.
* Tampilkan menggunakan `<Player />` dari `@remotion/player` di `HomePage` dan modal panduan di `DictionaryPage`.



### Modul 2: Engine Inferensi TensorFlow.js (`useSibiModel.js`)

1. **Model Loading & Warm-up:**
* Muat model dari `/model/model.json` menggunakan `tf.loadGraphModel('/model/model.json')` (dukung fallback otomatis ke `tf.loadLayersModel` jika model berupa Layers Model).
* Muat daftar label dari `/model/labels.json`.
* Lakukan *GPU warm-up* dengan tensor dummy `tf.zeros([1, IMG_SIZE, IMG_SIZE, 3])` saat inisialisasi, lalu `.dispose()`.


2. **Preprocessing Pipeline & ROI Cropping:**
* Gunakan `tf.tidy(() => { ... })` di setiap siklus inferensi agar bebas *WebGL memory leak*.
* Sediakan konfigurasi `IMG_SIZE` (default `224`) dan fitur **ROI (Region of Interest) Cropping** yang memotong khusus area kotak panduan tangan di `<video>` sebelum di-resize ke `[IMG_SIZE, IMG_SIZE]`. Ini krusial agar wajah dan latar belakang ruangan tidak merusak prediksi model.
* Normalisasi piksel `.toFloat().div(tf.scalar(255.0))` (sediakan juga toggle opsi *grayscale* atau *RGB* di UI pengaturan kamera jika model dilatih dengan 1 atau 3 channel).


3. **Pengukuran Telemetri Real-Time:**
* Hitung `latencyMs` menggunakan selisih `performance.now()` sebelum dan sesudah `model.predict()`.
* Hitung `fps` aktual dari *inference loop*.



### Modul 3: Jembatan Bahasa Isyarat dan Narasi (`NarrativePage.jsx`)

1. **Temporal Smoothing & Hold-to-Type Buffer:**
* Buat *sliding window buffer* (15 frame terakhir) dan *hold timer* (default **1.5 detik**, dapat diatur pengguna via slider).
* Jika huruf yang sama terdeteksi secara konsisten dengan `confidence >= threshold` (default **75%**) selama durasi tahan, penuhi *circular progress ring* beranimasi GSAP, lalu tambahkan huruf tersebut ke dalam `narrativeText` dengan efek `DecryptedText`.


2. **Kontrol Narasi & Text-to-Speech (TTS):**
* Sediakan tombol UI dan pintasan keyboard: **Tambah Spasi (`Space`)**, **Hapus Huruf Terakhir (`Backspace`)**, **Bersihkan Kalimat (`Clear`)**, dan *Quick Word Suggestions* (rekomendasi kata Bahasa Indonesia dari awalan huruf yang sedang diketik).
* Sediakan tombol **"Suarakan Narasi"** menggunakan `window.speechSynthesis` dengan bahasa `id-ID` (Bahasa Indonesia).



### Modul 4: Kamus, Latihan, Kuis & Analitik (`DictionaryPage`, `PracticePage`, `QuizPage`, `AnalyticsPage`)

1. **Katalog 26 Alfabet SIBI:**
* Filter berdasarkan Semua, Huruf Statis (A–I, K–Y), Huruf Dinamis (J, Z), dan Tingkat Kesulitan.
* Berikan badge khusus dan tips orientasi kamera pada huruf yang mirip secara visual (seperti **K vs Y vs V**, atau **M vs N vs S**, serta **P**).


2. **Mode Latihan & Kuis Eja Kata:**
* Split screen di `PracticePage`: Panduan huruf + Remotion animasi di kiri, Live Webcam + ROI Box di kanan. Saat `predictedLetter === targetLetter && confidence >= 80%` ditahan 1 detik, picu selebrasi dan simpan progres ke Supabase.
* `QuizPage`: Tantangan mengeja kata (misal: `"BUKU"`, `"SAYA"`, `"AJIN"`, `"KITA"`) melawan waktu.


3. **Dashboard Evaluasi Empiris (`AnalyticsPage.jsx`):**
* Menampilkan rata-rata Latensi Inferensi (`ms`), rata-rata FPS, akurasi per kelas huruf (A–Z), dan tombol **Export CSV** dari data `SessionTelemetry` di Supabase untuk kebutuhan tabel pengujian skripsi/penelitian.



---

## 5. DAFTAR ENDPOINT REST API (`server/src/routes`)

* `POST /api/auth/register` & `POST /api/auth/login` — Autentikasi pengguna (terintegrasi Supabase Auth / JWT).
* `GET /api/alphabets` — Ambil 26 data alfabet SIBI beserta progres user.
* `POST /api/progress/update` — Upsert `isMastered`, `bestConfidence`, dan increment `attemptsCount` di Supabase.
* `POST /api/telemetry` — Simpan log pengujian (`sessionType`, `targetLabel`, `predictedLabel`, `confidence`, `latencyMs`, `fps`, `isSuccess`).
* `GET /api/telemetry/summary` — Ambil agregasi performa empiris untuk halaman `AnalyticsPage`.

---

## 6. URUTAN EKSEKUSI (STEP-BY-STEP EXECUTION PLAN)

Kerjakan proyek ini secara berurutan tanpa melewati satu tahap pun:

1. **Tahap 1 (Scaffolding & Supabase Config):** Inisialisasi monorepo `/server` dan `/client`. Buat file `.env.example` di kedua folder (memuat `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`). Buat `supabase/seed.sql` dan `server/prisma/schema.prisma` beserta `seed.js` yang mengisi lengkap 26 alfabet SIBI (A–Z) dalam Bahasa Indonesia.
2. **Tahap 2 (Backend Express API):** Bangun seluruh route dan controller di `/server` menggunakan Prisma/Supabase client, lengkap dengan *local memory/JSON fallback* jika variabel `.env` Supabase belum diisi oleh developer agar server tetap langsung menyala saat pertama kali dijalankan.
3. **Tahap 3 (Creative UI Components & Remotion):** Setup React + Vite + Tailwind CSS. Bangun wrapper `SmoothScroll.jsx` (Lenis + GSAP), komponen `src/components/reactbits/` (`SplitText`, `SpotlightCard`, `MagnetButton`, `DecryptedText`), dan komposisi video `@remotion/player` (`SibiGuideVideo.jsx`).
4. **Tahap 4 (CV Engine & Main Pages):** Buat `/public/model/labels.json` dan hook `useSibiModel.js` (dengan ROI cropping, toggle RGB/Grayscale, dan *Graceful Simulation Fallback*). Bangun halaman `HomePage`, `DictionaryPage`, `PracticePage`, `NarrativePage`, `QuizPage`, dan `AnalyticsPage`.
5. **Tahap 5 (Verifikasi & Dokumentasi):** Pastikan tidak ada dependency yang kurang di `package.json`, jalankan build check, dan tulis `README.md` berisi panduan menyambungkan URL Supabase serta cara menaruh file `model.json` dari Google Colab.

```

---

### Tips Tambahan Sebelum Kamu Jalankan di Agent:
* Karena di screenshot evaluasi model kamu sebelumnya gambar alfabetnya tampak dalam **skala keabuan (*grayscale*)**[cite: 2], di dalam PRD di atas sudah saya selipkan instruksi agar *agent* membuat **toggle RGB (3 channel) / Grayscale (1 channel)** dan **ROI Cropping** di pengaturan kamera `useSibiModel.js`. Jadi apapun *input channel* model Colab kamu nanti, tinggal klik *switch* di UI webnya tanpa perlu bongkar kode lagi.

<FollowUp label="Mau sekalian dibuatkan script SQL (seed.sql) siap pakai untuk langsung di-run di Supabase SQL Editor?" query="Buatkan kode lengkap supabase/seed.sql berisi pembuatan tabel dan insert data 26 alfabet SIBI (A-Z) untuk langsung saya jalankan di Supabase SQL Editor."/>

<ElicitationsGroup>
  <Elicitation question="Apakah kamu ingin autentikasi usernya full memakai Supabase Auth langsung dari frontend React, atau tetap melewati middleware JWT di Express?"/>
  <Elicitation question="Apakah input model yang kamu latih di Colab kemarin menggunakan gambar Grayscale 1-channel (seperti di screenshot evaluasi) atau RGB 3-channel?"/>
</ElicitationsGroup>

```