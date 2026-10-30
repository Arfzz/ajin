AJIN — DESIGN SYSTEM & EXPERIMENTAL UI SPECIFICATION (DESIGN.md)

Project: AJIN (Aplikasi Jembatan Bahasa Isyarat dan Narasi)

Design Reference & Evolution: Terinspirasi dari struktur modern https://kreasi-in.vercel.app/, dievolusikan menjadi lebih bersih (Ultra-Clean Light Mode), lebih eksperimental (Kinetic & Tactile Web), namun tetap menjaga ketergunaan (Usability) tingkat tinggi untuk pembelajaran Sistem Isyarat Bahasa Indonesia (SIBI) berbasis Computer Vision.

1. FILOSOFI DESAIN (DESIGN DIRECTION)

Swiss-Grid Clarity Meets Kinetic Experimentation:

Menggabungkan kerapian tata letak editorial berlatar putih bersih (clean white canvas) dengan elemen interaktif eksperimental dari ReactBits, GSAP ScrollTrigger, Lenis Smooth Scroll, dan Remotion Player.

Setiap animasi memiliki fungsi kognitif (memberi umpan balik deteksi kamera, memandu fokus mata ke posisi jari, atau merayakan keberhasilan pengejaan kata), bukan sekadar dekorasi pasif yang mengganggu konsentrasi belajar.

Tactile Computer Vision HUD (Heads-Up Display):

Saat pengguna masuk ke mode kamera (Practice, Narrative Builder, Quiz), antarmuka bertransformasi menjadi studio visi komputer yang bersih, presisi, dan responsif dengan indikator metrik real-time (FPS, latensi inferensi $\text{ms}$, dan persentase confidence).

Strict GPU Budget Guardrail:

Halaman eksplorasi (HomePage, DictionaryPage) memaksimalkan efek eksperimental penuh (GSAP parallax, 3D tilt, spotlight).

Halaman kamera aktif (PracticePage, NarrativePage, QuizPage) menghentikan animasi latar belakang berbasis <canvas> berat agar WebGL TensorFlow.js mendapatkan $100\%$ alokasi GPU untuk menjaga kecepatan inferensi $\ge 25\text{ FPS}$.

2. PALET WARNA (COLOR PALETTE — CLEAN WHITE & ELECTRIC BLUE)

Menggunakan pendekatan High-Craft Light Mode dengan latar putih murni, aksen utama biru elektrik yang tegas, serta warna semantik berdaya kontras tinggi untuk umpan balik computer vision.

2.1 Surface & Background Tokens

Token

Hex Code

Tailwind Equivalent

Penggunaan Utama

--bg-canvas

#FFFFFF

bg-white

Latar belakang utama halaman (Pure Clean White)

--bg-subtle

#F8FAFC

bg-slate-50

Latar belakang seksi sekunder, Bento Grid container

--bg-elevated

#F1F5F9

bg-slate-100

Kartu kamus tidak aktif, pill filter, skeleton loader

--bg-glass

rgba(255, 255, 255, 0.78)

bg-white/80 backdrop-blur-md

Floating Navbar, Bottom Dock, HUD Overlay di atas kamera

--bg-hud-dark

#0B1120

bg-slate-950

Kontainer khusus Viewfinder Kamera & Telemetry Bar

2.2 Brand Primary & Experimental Accents

Token

Hex Code

Tailwind Equivalent

Penggunaan Utama

--primary-blue

#2563EB

blue-600

Warna utama merek AJIN, CTA utama, active state, progress ring

--primary-deep

#1D4ED8

blue-700

Hover state tombol utama, aksen tipografi hero

--primary-soft

#DBEAFE

blue-100

Latar badge aktif, sorotan SpotlightCard (rgba(37, 99, 235, 0.12))

--accent-cyan

#0EA5E9

sky-500

Garis pemindai ROI (Region of Interest) kamera & hand landmark

--accent-indigo

#4F46E5

indigo-600

Gradien eksperimental (from-blue-600 via-indigo-600 to-sky-500)

2.3 Semantic & Computer Vision Feedback Tokens

Token

Hex Code

Tailwind Equivalent

Penggunaan pada Deteksi SIBI

--cv-locked

#10B981

emerald-500

Gestur cocok & stabil ($\text{Confidence} \ge 80\%$), huruf berhasil diketik

--cv-holding

#F59E0B

amber-500

Sedang menahan gestur (Temporal Smoothing $0.1\text{s} - 1.5\text{s}$) & Badge Huruf Dinamis (J, Z)

--cv-Alert

#F43F5E

rose-500

Gestur kurang tepat / peringatan kemiripan visual (misal: K vs Y)

2.4 Typography & Border Tokens

Text Primary (--text-ink): #0F172A (slate-900) — Kontras rasio $> 15:1$ di atas putih.

Text Secondary (--text-muted): #475569 (slate-600) — Deskripsi posisi jari dan instruksi.

Text Technical (--text-mono): #64748B (slate-500) — Label metrik FPS, latensi, dan indeks kelas.

Border Hairline (--border-subtle): #E2E8F0 (slate-200) — Garis pembatas Bento Grid 1px solid.

Border Active (--border-focus): #93C5FD (blue-300) — Border kartu saat di-hover atau dipilih.

3. TIPOGRAFI & SKALA HIERARKI (TYPOGRAPHY)

Menggunakan kombinasi 3 jenis huruf (font pairing) untuk memadukan kesan eksperimental sekaligus keterbacaan instruksional:

Display & Headlines (--font-display): 'Plus Jakarta Sans' atau 'Space Grotesk' (Weights: 700 Bold, 800 ExtraBold). Karakter geometris modern, tegas saat dianimasikan per huruf dengan SplitText.

UI & Body Copy (--font-sans): 'Inter' atau 'Plus Jakarta Sans' (Weights: 400 Regular, 500 Medium, 600 SemiBold). Sangat bersih untuk membaca instruksi lekukan jari.

Telemetry & Narrative Output (--font-mono): 'JetBrains Mono' (Weights: 500 Medium, 700 Bold). Wajib memakai font-variant-numeric: tabular-nums agar angka FPS, milidetik latensi, dan persentase confidence tidak bergoyang saat berubah setiap frame.

Skala Ukuran Responsif

Hero Display: clamp(2.5rem, 5vw + 1rem, 4.5rem), line-height: 1.08, letter-spacing: -0.03em.

Section Heading (H2): clamp(1.75rem, 3vw, 2.5rem), line-height: 1.15, letter-spacing: -0.02em.

Card Title / Huruf SIBI Besar: 2rem (32px) hingga 3.5rem (56px) untuk indikator huruf yang sedang terdeteksi.

Body Copy: 1rem (16px), line-height: 1.65, lebar baca ideal 60ch–70ch.

4. KATALOG KOMPONEN LENGKAP (ALL-IN COMPONENT MAPPING)

Seluruh komponen di bawah ini wajib diimplementasikan dan ditempatkan sesuai fungsinya agar tampilan terasa eksperimental namun tetap intuitif:

4.1 Komponen Eksperimental Bergaya ReactBits (src/components/reactbits/)

SplitText.jsx & BlurText.jsx

Fungsi: Menganimasikan judul utama di HomePage ("Jembatan Bahasa Isyarat & Narasi Real-Time") per karakter dengan efek spring dan blur-to-clear saat halaman dimuat.

DecryptedText.jsx

Fungsi: Dipasang pada Kotak Output Narasi (NarrativePage). Setiap kali sebuah huruf SIBI berhasil dikunci selama 1,5 detik, huruf tersebut muncul dengan efek dekripsi matriks singkat selama $250\text{ ms}$ sebelum mengunci menjadi huruf final.

SpotlightCard.jsx

Fungsi: Membungkus 26 kartu alfabet di DictionaryPage dan kartu fitur di HomePage. Menampilkan efek cahaya radial biru lembut (radial-gradient(400px circle at var(--mouse-x) var(--mouse-y), rgba(37,99,235,0.10), transparent 80%)) yang mengikuti pergerakan kursor.

TiltedCard.jsx (3D Perspective Hover)

Fungsi: Dipasang pada kartu Referensi Visual Isyarat di PracticePage. Pengguna dapat menggerakkan kursor di atas foto referensi tangan untuk melihat efek kemiringan 3D halus beserta floating badge tingkat kesulitan.

MagnetButton.jsx

Fungsi: Membungkus tombol CTA utama ("Mulai Praktik Kamera", "Suarakan Narasi (TTS)"). Tombol bergerak mengikuti tarikan magnetik kursor dalam radius $40\text{px}$ menggunakan gsap.quickTo.

StarBorder.jsx / AnimatedBeamBorder.jsx

Fungsi: Membungkus kontainer Viewfinder Kamera Aktif. Garis cahaya bergerak mengelilingi bingkai kamera; warnanya berubah dinamis dari Biru (#2563EB) saat memindai, Kuning (#F59E0B) saat menahan gestur, dan Hijau (#10B981) saat huruf berhasil dikunci.

FloatingDock.jsx (macOS-style Interactive Dock)

Fungsi: Navigasi mengambang di bagian bawah layar pada mode Narrative Builder & Practice, memuat aksi cepat: Toggle Kamera, Tambah Spasi, Hapus Huruf (Backspace), Suarakan Kalimat (TTS), Toggle RGB/Grayscale, dan Buka Panduan Remotion.

CountUp.jsx

Fungsi: Menganimasikan angka statistik di HomePage dan AnalyticsPage (Total 26 Alfabet SIBI, Target Latensi $<50\text{ ms}$, Akurasi Pengujian, dan Jumlah Huruf Dikuasai).

AnimatedList.jsx

Fungsi: Menampilkan riwayat huruf yang baru saja berhasil diperagakan secara real-time di sisi kanan layar latihan dengan animasi masuk staggered slide-in.

SquaresBackground.jsx / DotGridBackground.jsx

Fungsi: Latar belakang kisi-kisi teknis (technical blueprint grid) tipis berwarna #F1F5F9 di atas kanvas putih #FFFFFF yang menyala biru muda saat dilewati kursor (otomatis di-pause saat kamera aktif).

4.2 Komponen Motion & Video Terprogram (GSAP, Lenis, Remotion)

SmoothScroll.jsx (Lenis + GSAP ScrollTrigger)

Mengatur kelembaman gulir layar (lerp: 0.08, smoothWheel: true) di HomePage, DictionaryPage, dan AnalyticsPage.

SibiGuideVideo.jsx (@remotion/player)

Video instruksional berbasis kode React (Remotion) berdurasi 6 detik (looping, 60 FPS) yang merender:

Animasi vector hand masuk ke area kotak Region of Interest (ROI).

Animasi panah arah gerakan kelingking untuk huruf J dan gerakan telunjuk zig-zag untuk huruf Z.

Visualisasi indikator Hold-to-Type 1,5 detik.

5. ARSITEKTUR TATA LETAK PER HALAMAN (PAGE-BY-PAGE BLUEPRINT)

5.1 HomePage.jsx — Eksperimental & Edukatif

Top Navbar Glass: Logo AJIN dengan badge SIBI Real-Time CV, menu navigasi (Beranda, Kamus A–Z, Praktik Kamera, Jembatan Narasi, Kuis, Analitik), serta indikator status Model TFJS ("Model Ready" / "Simulation Mode").

Hero Section (Asymmetric Split):

Kiri (60%): Badge pill biru muda "Sistem Isyarat Bahasa Indonesia (SIBI)", judul besar dengan SplitText, sub-judul penjelasan singkat, dan dua MagnetButton ("Buka Studio Narasi" dengan warna solid #2563EB & "Pelajari 26 Alfabet" dengan warna putih ber-border #E2E8F0).

Kanan (40%): Interactive Preview Card yang menampilkan <Player /> dari Remotion secara langsung dalam bingkai bergaya HUD computer vision.

Interactive Bento Grid (GSAP ScrollTrigger Reveal):

Kotak 1 (Besar): Demonstrasi visual bagaimana Hold-to-Type mengubah urutan isyarat tangan K - I - T - A menjadi narasi bersuara.

Kotak 2: Perbandingan visual Isyarat Statis (24 Huruf) vs Isyarat Dinamis (J & Z).

Kotak 3: Metrik performa Client-Side TensorFlow.js (CountUp komponen: $100\%$ Privasi Browser, $<50\text{ ms}$ Latensi).

5.2 DictionaryPage.jsx — Katalog Interaktif 26 Alfabet SIBI

Sticky Filter & Search Bar:

Tab Filter bergaya segmented control: Semua (26), Statis (24), Dinamis (J & Z), Perlu Perhatian Khusus (K, Y, V, P), dan Sudah Dikuasai.

Grid Kartu Alfabet (SpotlightCard 4 Kolom Desktop):

Setiap kartu berlatar #FFFFFF dengan border #E2E8F0, menampilkan huruf besar dengan warna #2563EB, badge tipe gestur (Statis biru / Dinamis kuning), ilustrasi tangan, dan status checkmark hijau jika sudah dikuasai.

Klik Kartu $\rightarrow$ Interactive Drawer/Modal: Menampilkan instruksi posisi jari lengkap, tips sudut kamera, tombol "Lihat Animasi Remotion", dan tombol langsung "Latih Huruf Ini di Kamera".

5.3 PracticePage.jsx & NarrativePage.jsx — Studio Computer Vision (High Usability)

Menggunakan tata letak Zero-Distraction Split Studio (100vh pada desktop tanpa perlu banyak scroll):

+-----------------------------------------------------------------------------------+
| [Navbar Ringkas]         Status Model: TFJS WebGL Aktif | FPS: 28 | Latency: 24ms |
+-----------------------------------+-----------------------------------------------+
| PANEL KIRI (Panduan / Narasi)     | PANEL KANAN (Webcam Viewfinder & ROI HUD)     |
|                                   |                                               |
| [Target Huruf / Kotak Kalimat]    |  +-----------------------------------------+  |
|  " H A L O   T E M A N "          |  |               [Video Feed]              |  |
|                                   |  |         +---------------------+         |  |
| [Progress Hold-to-Type: 1.5s]     |  |         |   KOTAK PANDUAN     |         |  |
|  (=======> 85% Menahan Huruf O)   |  |         |   TANGAN (ROI)      |         |  |
|                                   |  |         +---------------------+         |  |
| [Word Suggestions Chips]          |  |  Prediksi: [ O ]   Confidence: [ 92% ]  |  |
|  (HALO) (HARI) (HARUS)            |  +-----------------------------------------+  |
|                                   |  [Toggle ROI Crop] [Mode: Grayscale/RGB]      |
+-----------------------------------+-----------------------------------------------+
|               [Floating Dock: Spasi | Hapus | Clear | Suarakan TTS]               |
+-----------------------------------------------------------------------------------+


Kotak Panduan Tangan (ROI Guide Box):

Di atas video webcam, tampilkan kotak persegi di area tengah-kanan/kiri dengan sudut siku biru menyala (#0EA5E9). Sistem hanya memotong (crop) area di dalam kotak ini untuk dikirim ke TensorFlow.js sehingga wajah pengguna tidak mengganggu akurasi deteksi.

Kontrol Kalibrasi Cepat (Usability):

Sediakan switch Mirror Camera, Toggle RGB / Grayscale (menyesuaikan channel model Colab), dan Slider Hold Duration ($0.5\text{ detik} - 3.0\text{ detik}$).

5.4 QuizPage.jsx & AnalyticsPage.jsx

Mode Kuis Eja Kata: Menampilkan kata target di bagian atas dengan kotak huruf berderet (contoh: [ B ] [ U ] [ K ] [ U ]). Huruf yang sedang aktif menyala biru #2563EB, dan otomatis berpindah ke huruf berikutnya dengan animasi confetti ringan begitu pengguna berhasil menahan isyarat yang benar.

Halaman Analitik Penelitian (AnalyticsPage.jsx):

Tabel dan grafik bersih berlatar putih yang merangkum hasil pengujian dari Supabase (SessionTelemetry): rata-rata waktu inferensi ($\text{ms}$), rata-rata confidence per huruf A–Z, serta tombol Unduh Laporan CSV untuk lampiran bab pengujian skripsi.

6. ATURAN AKSESIBILITAS & USABILITY (GUARDRAILS)

Kontras Warna Ketat: Jangan pernah menggunakan teks abu-abu muda di atas latar putih. Semua teks utama wajib menggunakan #0F172A atau #1E293B, dan teks biru menggunakan #2563EB atau #1D4ED8.

Keyboard & Screen Reader Friendly: Selain tombol klik di layar, fitur penyusun narasi wajib mendukung tombol fisik Space (tambah spasi), Backspace (hapus huruf), dan Enter (suarakan teks via Web Speech API id-ID).

Pencegahan Flickering Prediksi: Jangan langsung mengubah huruf utama di UI jika confidence di bawah ambang batas (< 65%). Tampilkan status "Arahkan tangan ke dalam kotak biru" ketika tangan belum terdeteksi secara yakin.
