# AJIN (Aplikasi Jembatan Bahasa Isyarat dan Narasi)

Platform Pembelajaran dan Pengenalan Sistem Isyarat Bahasa Indonesia (SIBI) Berbasis Computer Vision Secara Real-Time di Browser.

Arsitektur: Monorepo Full-Stack JavaScript (React Vite + Express.js + Supabase PostgreSQL) dengan inferensi sisi klien (client-side) menggunakan MediaPipe Hands Landmark dan ONNX Runtime WebAssembly, kecerdasan generatif Google Gemini 3.8 Flash, serta antarmuka Playful Neobrutalism berdaya aksesibilitas tinggi.

---

## 1. Ringkasan Eksekutif

AJIN dirancang sebagai jembatan komunikasi inklusif antara komunitas Teman Tuli dan masyarakat umum. Sistem ini mendeteksi gestur tangan alfabet Sistem Isyarat Bahasa Indonesia (SIBI) dari huruf A hingga Z melalui webcam atau kamera perangkat tanpa memerlukan instalasi backend Python khusus untuk inferensi video. Seluruh komputasi computer vision diproses langsung di peramban pengguna (*client-side*), menjamin privasi video kamera dan menghasilkan performa real-time 25 sampai 30 frame per detik (FPS).

### Prinsip Desain: Playful Neobrutalism
- **Batas Geometris Tegas**: Garis tinta pekat 2.5px hingga 3px (`border-ink`), bayangan jatuh tanpa blur (`shadow-[4px_4px_0_#111]`), dan sudut tegas.
- **Palet Warna Kontras Tinggi**: Cyber Yellow (`#FFD000`), Mint (`#00C68E`), Coral (`#FF4D4D`), Cobalt (`#0055FF`), dan latar Paper (`#FDFBF7`).
- **Anti-Slop & Aksesibilitas WCAG AAA**: Tipografi kontras tinggi, bebas dari badge miring dekoratif yang tidak fungsional, dan bebas emoji generik.

---

## 2. Fitur Utama Aplikasi

1. **Kamus 26 Alfabet SIBI Interaktif (`/kamus`)**
   - Katalog lengkap 26 huruf alfabet SIBI (A-Z) dengan deskripsi posisi jemari.
   - Filter klasifikasi: Vokal, Konsonan, Gestur Dinamis (lintasan gerak huruf J dan Z), serta Kategori Rawan Salah.
   - Pemutar panduan simulasi prosedural (Remotion procedural animation) dengan tampilan kartu Neobrutalism kontras tinggi.

2. **Studio Latihan Kamera Real-Time (`/latihan`)**
   - Deteksi webcam real-time dengan kotak panduan Region of Interest (ROI).
   - Mekanisme penahanan isyarat (*Hold-to-Type*) 1.0 detik untuk mencegah kesalahan deteksi saat tangan bergerak (*flickering*).
   - Bar telemetri real-time yang memantau FPS, latensi inferensi (ms), dan tingkat kepercayaan model (*confidence score*).
   - Notifikasi umpan balik visual dan pencatatan sesi latihan otomatis ke riwayat analitik.

3. **Pindai Isyarat dari Foto (`/pindai` atau `/foto`)**
   - Pengenalan isyarat SIBI dari foto atau gambar statis melalui unggah file atau seret-dan-lepas (*drag and drop*).
   - Visualisasi skeleton 21 landmark tangan dan distribusi probabilitas 5 prediksi teratas.

4. **Studio Narasi & Text-to-Speech (`/narasi`)**
   - Merangkai huruf isyarat menjadi kata dan kalimat narasi secara langsung.
   - Fitur koreksi ejaan otomatis dan tombol pembaca suara menggunakan Web Speech API Bahasa Indonesia (`id-ID`).

5. **Kuis & Evaluasi Mengeja Kata (`/kuis`)**
   - Modul evaluasi interaktif yang menguji kemampuan pengguna dalam mengingat dan membentuk gestur huruf SIBI.
   - Dilengkapi laci bantuan (*hint drawer*) dan pencatatan akurasi jawaban.

6. **Asisten AI SIBI & Chatbot Global AJIN (`/asisten`)**
   - Widget asisten suara mengambang (*floating widget*) yang dapat diakses dari seluruh halaman aplikasi.
   - Masukan suara (*Speech-to-Text id-ID*), konversi teks ke suara (*Text-to-Speech id-ID*), dan pemrosesan percakapan interaktif menggunakan Google Gemini 3.8 Flash.
   - Tombol pintasan cerdas (*smart action buttons*) untuk navigasi cepat ke halaman kamus, latihan, atau kuis.

7. **Dashboard Analitik & Evaluasi Empiris (`/analitik`)**
   - Rekap metrik empiris penelitian: rata-rata latensi inferensi, rata-rata FPS, akurasi per kelas huruf, dan tabel detail sesi latihan.
   - Arsitektur penyimpanan ganda: sinkronisasi otomatis antara LocalStorage browser dengan basis data server (JSON store / Supabase).
   - Fitur **Ekspor CSV** untuk keperluan pengolahan data empiris skripsi atau publikasi ilmiah.

8. **Autentikasi Pengguna & Mode Tamu**
   - Mendukung login menggunakan Google OAuth 2.0 (Passport.js).
   - Pengguna tamu (*guest*) dapat langsung berlatih tanpa login, dan data latihan sesi tamu otomatis dimigrasikan ke akun pengguna setelah login berhasil.

---

## 3. Arsitektur Monorepo

```text
ajin/
├── package.json                       # Skrip orkestrasi root (menjalankan client & server)
├── README.md                          # Dokumentasi resmi proyek
├── supabase/
│   └── seed.sql                       # Skema DDL PostgreSQL & data awal 26 alfabet SIBI
├── server/                            # Backend API (Node.js + Express.js, Port 5001)
│   ├── src/
│   │   ├── config/                    # Inisialisasi Supabase, Passport, dan Gemini AI
│   │   ├── controllers/               # Auth, Alfabet, Progres, Telemetri, dan AI Chat
│   │   ├── data/                      # File persistensi lokal (telemetry_store.json, dsb.)
│   │   ├── routes/                    # Definisi rute Express (/api/*)
│   │   └── index.js                   # Entry point server Express
│   ├── .env.example                   # Contoh konfigurasi environment backend
│   └── package.json
└── client/                            # Frontend Web SPA (React 18 + Vite, Port 5173)
    ├── public/
    │   ├── model/                     # Bobot model ONNX & MediaPipe Hand Landmarker
    │   │   ├── effnet_b0_sibi.onnx    # Model klasifikasi ONNX SIBI
    │   │   ├── hand_landmarker.task   # Model deteksi 21 landmark tangan MediaPipe
    │   │   └── labels.json            # Array 26 label huruf ["A", "B", ..., "Z"]
    │   └── wasm/                      # Binari WebAssembly ONNX Runtime & MediaPipe
    ├── src/
    │   ├── components/
    │   │   ├── chat/                  # Widget Asisten Suara & Chatbot AJIN
    │   │   ├── layout/                # Navbar, Footer, SmoothScroll, Preloader
    │   │   ├── remotion/              # Komposisi panduan visual gestur tangan
    │   │   └── vision/                # WebcamCanvas (ROI guide) & TelemetryBar
    │   ├── context/                   # AuthContext (Google OAuth & migrasi guest)
    │   ├── hooks/                     # useSibiModel (pipeline MediaPipe + ONNX + fallback)
    │   ├── pages/                     # Halaman utama (Home, Kamus, Latihan, Narasi, Kuis, Analitik, Foto)
    │   ├── services/                  # Klien Axios & sinkronisasi data telemetri
    │   ├── App.jsx
    │   └── main.jsx
    ├── vercel.json                    # Konfigurasi SPA rewrite untuk deployment Vercel
    ├── .env.example                   # Contoh konfigurasi environment frontend
    └── package.json
```

---

## 4. Panduan Menjalankan Proyek Secara Lokal

### Prasyarat Sistem
- **Node.js**: Versi 18.x atau lebih tinggi (disarankan versi LTS 20.x).
- **NPM**: Versi 9.x atau lebih baru.
- Peramban web modern yang mendukung WebGL dan WebAssembly (Google Chrome, Microsoft Edge, atau Firefox).

### Langkah 1: Kloning Repositori
```bash
git clone https://github.com/Arfzz/ajin.git
cd ajin
```

### Langkah 2: Pasang Seluruh Dependensi
Jalankan perintah berikut di folder root:
```bash
npm --prefix server install
npm --prefix client install
```

### Langkah 3: Konfigurasi Environment Variables

1. **Konfigurasi Server**: Salin file `server/.env.example` menjadi `server/.env`:
   ```bash
   cp server/.env.example server/.env
   ```
   Isi variabel penting pada `server/.env`:
   - `PORT=5001`
   - `CLIENT_URL=http://localhost:5173`
   - `GEMINI_API_KEY`: Kunci API Google AI Studio untuk mengaktifkan chatbot cerdas.
   - `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET`: Kredensial OAuth Google (opsional jika hanya menjalankan mode tamu).
   - `SUPABASE_URL` dan `SUPABASE_ANON_KEY`: Kredensial Supabase (opsional, server memiliki penyimpanan disk JSON lokal jika Supabase tidak diisi).

2. **Konfigurasi Client**: Salin file `client/.env.example` menjadi `client/.env`:
   ```bash
   cp client/.env.example client/.env
   ```
   Isi variabel pada `client/.env`:
   - `VITE_API_URL=http://localhost:5001`

### Langkah 4: Jalankan Aplikasi
Jalankan kedua layanan (backend dan frontend) secara bersamaan dari root folder:
```bash
npm run dev
```

Atau jalankan pada dua jendela terminal terpisah:
- **Terminal 1 (Backend Express)**:
  ```bash
  npm --prefix server run dev
  ```
  Backend berjalan pada `http://localhost:5001`.
- **Terminal 2 (Frontend React)**:
  ```bash
  npm --prefix client run dev
  ```
  Aplikasi web dapat diakses pada `http://localhost:5173`.

---

## 5. Pipeline Machine Learning & Computer Vision

AJIN menggunakan arsitektur inferensi bertingkat (*two-stage inference pipeline*) yang sepenuhnya berjalan di browser:

```text
Kamera / Foto
     │
     ▼
MediaPipe Hand Landmarker (WASM)
     │ Deteksi 21 titik koordinat 3D tangan (x, y, z)
     ▼
Ekstraksi & Normalisasi Fitur (63 dimensi)
     │ Normalisasi terhadap wrist & ukuran telapak (scale & translation invariant)
     ▼
ONNX Runtime WebAssembly (effnet_b0_sibi.onnx)
     │ Klasifikasi probabilitas huruf SIBI (A-Z)
     ▼
Penyaring Temporal & Hold-to-Type (1.0 detik)
     │ Mencegah false positive saat tangan bergerak transisi
     ▼
Karakter Terketik / Umpan Balik Visual
```

### Mode Fallback (Simulasi Interaktif)
Jika file model di `client/public/model/` belum tersedia atau pengguna menolak izin akses kamera, sistem secara otomatis mengaktifkan **Mode Simulasi Interaktif**. Pengguna tetap dapat menguji alur aplikasi, memilih huruf target, menyimulasikan gestur, dan membaca panduan tanpa kendala.

---

## 6. Panduan Deployment Produksi

### A. Deployment Frontend ke Vercel
1. Hubungkan repositori GitHub ke Vercel.
2. Atur **Root Directory** ke folder `client`.
3. File `client/vercel.json` telah dikonfigurasi dengan aturan penulisan ulang (*rewrites*) SPA:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/" }
     ]
   }
   ```
4. Tambahkan Environment Variable di dashboard Vercel:
   - `VITE_API_URL`: URL publik backend Express Anda (contoh: `https://api-ajin.azurewebsites.net`).

### B. Deployment Backend ke Azure App Service / Railway / Render
1. Deploy folder `server` ke penyedia hosting Node.js pilihan Anda.
2. Atur Environment Variables di penyedia hosting:
   - `NODE_ENV=production`
   - `CLIENT_URL=https://nama-domain-anda.vercel.app`
   - `GEMINI_API_KEY=kunci_api_gemini_anda`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, dan `GOOGLE_REDIRECT_URI` (sesuai domain publik).
   - `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` (jika menggunakan Supabase di produksi).

### C. Build Menjadi Aplikasi Mobile Android (APK)
Aplikasi web AJIN dapat dibungkus menjadi APK Android menggunakan **Capacitor**:
1. Pasang Capacitor di folder `client`:
   ```bash
   cd client
   npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/app @capacitor/browser
   npx cap init "AJIN SIBI" "com.ajin.sibi" --web-dir=dist
   ```
2. Build frontend dan tambahkan platform Android:
   ```bash
   npm run build
   npx cap add android
   ```
3. Buka folder `android` di Android Studio dan pastikan izin kamera telah tercantum di `AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.CAMERA" />
   <uses-permission android:name="android.permission.RECORD_AUDIO" />
   ```
4. Build APK Release atau Debug melalui menu **Build > Build Bundle(s) / APK(s) > Build APK(s)** di Android Studio.

---

## 7. Lisensi

Proyek ini dikembangkan untuk tujuan penelitian akademik, pengembangan teknologi asistif inklusif, dan edukasi Sistem Isyarat Bahasa Indonesia (SIBI). Seluruh kode dirilis di bawah lisensi MIT.
