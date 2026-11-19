-- ============================================================================
-- AJIN (Aplikasi Jembatan Bahasa Isyarat dan Narasi)
-- MIGRASI SKEMA DATABASE SUPABASE v2 (Aman & Idempoten)
-- ============================================================================
-- Jalankan SELURUH skrip ini satu kali di:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
--
-- Yang diperbaiki oleh migrasi ini:
-- 1. Mengubah user_id di user_progress & session_telemetries dari UUID menjadi TEXT
--    (agar ID Google OAuth seperti "114826648583079417232" dan ID tamu "guest_..."
--     dapat masuk tanpa ditolak PostgreSQL).
-- 2. Menghapus foreign key lama yang menunjuk ke tabel kosong public.profiles(id)
--    dan menghapus tabel public.profiles yang tidak terpakai.
-- 3. Menyempurnakan tabel user_progress dengan kolom letter, success_count,
--    last_practiced_at, dan constraint UNIQUE(user_id, letter).
-- 4. Menambahkan tabel baru public.photo_scans khusus fitur Pindai Foto (/foto).
-- 5. Menambahkan kolom source pada public.chat_messages ('assistant' / 'narrative').
-- 6. Menambahkan View v_user_letter_summary & memuat ulang cache skema PostgREST.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. PERBARUI TABEL public.users (Akun Google OAuth)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    picture TEXT,
    role VARCHAR(20) DEFAULT 'student',
    provider VARCHAR(20) DEFAULT 'google',
    last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ----------------------------------------------------------------------------
-- 2. PASTIKAN TABEL MASTER public.sibi_alphabets (26 Abjad A-Z)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sibi_alphabets (
    id SERIAL PRIMARY KEY,
    letter VARCHAR(2) NOT NULL UNIQUE,
    gesture_type VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    reference_image_url TEXT,
    difficulty VARCHAR(20) DEFAULT 'easy',
    tips TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. ROMBAK TABEL public.user_progress (Ubah user_id UUID -> TEXT & Tambah letter)
-- ----------------------------------------------------------------------------
-- Lepas semua foreign key lama pada user_progress.user_id (mis. yg menunjuk ke profiles.id)
DO $$
DECLARE
    fk_record RECORD;
BEGIN
    FOR fk_record IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = 'user_progress'
          AND kcu.column_name = 'user_id'
    LOOP
        EXECUTE format('ALTER TABLE public.user_progress DROP CONSTRAINT IF EXISTS %I', fk_record.constraint_name);
    END LOOP;
END $$;

-- Ubah tipe kolom user_id dari UUID menjadi TEXT agar menerima Google ID & Guest ID
ALTER TABLE public.user_progress
    ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Pastikan alphabet_id boleh nullable sementara saat migrasi (tetap terisi otomatis oleh server)
ALTER TABLE public.user_progress
    ALTER COLUMN alphabet_id DROP NOT NULL;

-- Tambah kolom letter, success_count, dan last_practiced_at agar mudah dibaca di Table Editor
ALTER TABLE public.user_progress
    ADD COLUMN IF NOT EXISTS letter VARCHAR(2),
    ADD COLUMN IF NOT EXISTS success_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_practiced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Isi kolom letter dari sibi_alphabets apabila sudah ada baris lama
UPDATE public.user_progress up
SET letter = sa.letter
FROM public.sibi_alphabets sa
WHERE up.alphabet_id = sa.id
  AND up.letter IS NULL;

-- Hapus baris rusak jika ada yang letter-nya masih NULL
DELETE FROM public.user_progress WHERE letter IS NULL;

ALTER TABLE public.user_progress
    ALTER COLUMN letter SET NOT NULL;

-- Buat constraint UNIQUE(user_id, letter) untuk upsert yang aman dan cepat
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_progress_user_id_letter_key'
          AND conrelid = 'public.user_progress'::regclass
    ) THEN
        ALTER TABLE public.user_progress
            ADD CONSTRAINT user_progress_user_id_letter_key UNIQUE (user_id, letter);
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. ROMBAK TABEL public.session_telemetries (Ubah user_id UUID -> TEXT)
-- ----------------------------------------------------------------------------
-- Lepas semua foreign key lama pada session_telemetries.user_id (yang menunjuk ke profiles.id)
DO $$
DECLARE
    fk_record RECORD;
BEGIN
    FOR fk_record IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = 'session_telemetries'
          AND kcu.column_name = 'user_id'
    LOOP
        EXECUTE format('ALTER TABLE public.session_telemetries DROP CONSTRAINT IF EXISTS %I', fk_record.constraint_name);
    END LOOP;
END $$;

-- Ubah tipe kolom user_id dari UUID menjadi TEXT
ALTER TABLE public.session_telemetries
    ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Beri nilai default 'guest-legacy' untuk baris lama yang user_id-nya masih NULL (opsional, agar mudah difilter)
UPDATE public.session_telemetries
SET user_id = 'guest-legacy'
WHERE user_id IS NULL;

-- ----------------------------------------------------------------------------
-- 5. PERBARUI TABEL public.chat_messages (Chatbot Asisten & Jembatan Narasi)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    session_id VARCHAR(100),
    source VARCHAR(30) DEFAULT 'assistant', -- 'assistant' atau 'narrative'
    user_message TEXT NOT NULL,
    ai_reply TEXT NOT NULL,
    target_letter VARCHAR(5),
    suggested_action VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.chat_messages
    ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'assistant';

-- ----------------------------------------------------------------------------
-- 6. BUAT TABEL BARU public.photo_scans (Riwayat Fitur Pindai Foto /foto)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.photo_scans (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    session_id VARCHAR(100),
    detected_letter VARCHAR(5),
    is_sign BOOLEAN DEFAULT TRUE,
    confidence DOUBLE PRECISION DEFAULT 0,
    gesture_type VARCHAR(20) DEFAULT 'static',
    description TEXT,
    feedback TEXT,
    alternatives TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. HAPUS TABEL LAMA public.profiles YANG KOSONG & TIDAK DIGUNAKAN
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ----------------------------------------------------------------------------
-- 8. INDEKS PERFORMA UNTUK QUERY RAPOR BELAJAR & ANALITIK
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_telemetries_user_id ON public.session_telemetries(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetries_session_type ON public.session_telemetries(session_type);
CREATE INDEX IF NOT EXISTS idx_telemetries_created_at ON public.session_telemetries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetries_target_label ON public.session_telemetries(target_label);

CREATE INDEX IF NOT EXISTS idx_progress_user ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_letter ON public.user_progress(letter);

CREATE INDEX IF NOT EXISTS idx_chat_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_created_at ON public.chat_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_photo_scans_user_id ON public.photo_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_scans_created_at ON public.photo_scans(created_at DESC);

-- ----------------------------------------------------------------------------
-- 9. VIEW RINGKASAN RAPOR BELAJAR PER PENGGUNA (Mudah dicek di Supabase)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_user_letter_summary AS
SELECT
    st.user_id,
    COALESCE(NULLIF(st.target_label, '-'), st.predicted_label) AS letter,
    COUNT(*)::INT AS total_tests,
    SUM(CASE WHEN st.is_success THEN 1 ELSE 0 END)::INT AS success_tests,
    ROUND((AVG(CASE WHEN st.is_success THEN 100.0 ELSE 0.0 END))::NUMERIC, 1) AS accuracy_pct,
    ROUND(AVG(st.confidence)::NUMERIC, 1) AS avg_confidence_pct,
    MAX(st.created_at) AS last_tested_at
FROM public.session_telemetries st
WHERE COALESCE(NULLIF(st.target_label, '-'), st.predicted_label) IS NOT NULL
GROUP BY st.user_id, COALESCE(NULLIF(st.target_label, '-'), st.predicted_label);

-- ----------------------------------------------------------------------------
-- 10. PASTIKAN 26 DATA MASTER ALFABET SIBI TERISI LENGKAP
-- ----------------------------------------------------------------------------
INSERT INTO public.sibi_alphabets (letter, gesture_type, description, difficulty, tips) VALUES
('A', 'static', 'Kepalkan empat jari rapat ke telapak tangan, ibu jari tegak lurus menempel di samping jari telunjuk.', 'easy', 'Pastikan ibu jari tidak menekuk ke depan empat jari agar tidak tertukar dengan huruf E.'),
('B', 'static', 'Buka empat jari lurus ke atas dan rapat. Tekuk ibu jari melintang di depan telapak tangan.', 'easy', 'Jaga empat jari tetap tegak lurus dan rapat vertikal.'),
('C', 'static', 'Lengkungkan kelima jari membentuk setengah lingkaran menyerupai huruf C dari sudut pandang kamera.', 'easy', 'Arahkan lengkungan tangan menghadap samping sedikit diagonal.'),
('D', 'static', 'Tegakkan jari telunjuk ke atas. Temukan ujung ibu jari dengan jari tengah, manis, dan kelingking membentuk lingkaran di bawah.', 'easy', 'Pastikan hanya telunjuk yang tegak lurus.'),
('E', 'static', 'Tekuk semua ujung empat jari ke bawah menyentuh ujung ibu jari yang terlipat di bawahnya.', 'medium', 'Perhatikan perbedaan dengan huruf A: pada E, ibu jari terlipat di bawah ujung-ujung jari.'),
('F', 'static', 'Temukan ujung ibu jari dan telunjuk membentuk lingkaran. Tiga jari lainnya (tengah, manis, kelingking) tegak lurus terbuka.', 'medium', 'Jangan sampai tertukar dengan gestur D; pada F ada tiga jari yang tegak.'),
('G', 'static', 'Arahkan jari telunjuk dan ibu jari mendatar ke samping membentuk capit sejajar horizontal.', 'medium', 'Orientasikan tangan secara horizontal ke arah kiri/kanan kamera.'),
('H', 'static', 'Arahkan jari telunjuk dan jari tengah rapat mendatar ke samping. Dua jari lainnya dan ibu jari terlipat.', 'medium', 'Pastikan telunjuk dan tengah benar-benar rapat horizontal.'),
('I', 'static', 'Kepalkan semua jari kecuali jari kelingking yang tegak lurus ke atas.', 'easy', 'Ibu jari menahan jari telunjuk, tengah, dan manis.'),
('J', 'dynamic', 'Mulai dari posisi huruf I (kelingking tegak), lalu gerakkan kelingking membentuk lengkungan kait huruf J di udara.', 'hard', 'Isyarat dinamis: lakukan lintasan kait kelingking dengan stabil di dalam area panduan.'),
('K', 'static', 'Tegakkan telunjuk dan jari tengah membentuk huruf V, selipkan ibu jari di antara pangkal kedua jari tersebut.', 'medium', 'Mirip visual dengan V dan Y; perhatikan posisi ibu jari di tengah.'),
('L', 'static', 'Buka ibu jari dan telunjuk membentuk sudut 90 derajat menyerupai huruf L tegak.', 'easy', 'Tiga jari lainnya terlipat rapat ke telapak tangan.'),
('M', 'static', 'Lipat ibu jari ke dalam, lalu tutup dengan tiga jari (telunjuk, tengah, manis) di atasnya, kelingking terlipat.', 'hard', 'Perbedaan M dan N: M menggunakan 3 jari di atas jempol, N menggunakan 2 jari.'),
('N', 'static', 'Lipat ibu jari ke dalam, lalu tutup dengan dua jari (telunjuk dan tengah) di atasnya.', 'hard', 'Pastikan hanya dua jari yang menutupi ibu jari.'),
('O', 'static', 'Satukan seluruh ujung jari dengan ibu jari membentuk rongga lingkaran bulat sempurna.', 'easy', 'Tampilkan lingkaran dari sudut yang jelas terhadap kamera.'),
('P', 'static', 'Arahkan posisi gestur huruf K menghadap ke bawah diagonal (telunjuk menunjuk ke bawah).', 'hard', 'Sudut kemiringan tangan ke bawah sangat penting untuk membedakan P dari K.'),
('Q', 'static', 'Arahkan posisi gestur huruf G menghadap ke bawah vertikal.', 'medium', 'Arahkan capit jempol dan telunjuk lurus ke arah lantai.'),
('R', 'static', 'Silangkan jari tengah di atas/belakang jari telunjuk yang tegak lurus.', 'medium', 'Pastikan silangan jari telunjuk dan tengah terlihat kontras.'),
('S', 'static', 'Kepalkan seluruh jari rapat, dengan ibu jari melintang di depan kepalan jari telunjuk dan tengah.', 'easy', 'Ibu jari berada di depan kepalan, berbeda dari A (jempol di samping).'),
('T', 'static', 'Kepalkan tangan dengan menyelipkan ibu jari di antara jari telunjuk dan jari tengah.', 'medium', 'Hanya ujung ibu jari yang menyembul di antara telunjuk dan jari tengah.'),
('U', 'static', 'Tegakkan jari telunjuk dan jari tengah rapat lurus ke atas. Ibu jari menahan dua jari lainnya.', 'easy', 'Jari telunjuk dan tengah wajib rapat lurus.'),
('V', 'static', 'Tegakkan jari telunjuk dan jari tengah terbuka membentuk sudut V (tanda peace).', 'easy', 'Rentangkan jarak antara telunjuk dan jari tengah secara tegas.'),
('W', 'static', 'Tegakkan tiga jari (telunjuk, tengah, manis) terbuka menyebar ke atas membentuk huruf W.', 'easy', 'Ibu jari menahan kelingking di telapak tangan.'),
('X', 'static', 'Kepalkan tangan lalu tekuk jari telunjuk menyerupai kait atau pengait kecil.', 'medium', 'Bentuk kait telunjuk harus tampak jelas dari samping/depan kamera.'),
('Y', 'static', 'Rentangkan ibu jari dan kelingking terbuka lebar, tiga jari di tengah terlipat rapat.', 'easy', 'Bentuk menyerupai gestur telepon atau shaka sign.'),
('Z', 'dynamic', 'Tegakkan jari telunjuk lalu gerakkan di udara membentuk lintasan zig-zag huruf Z.', 'hard', 'Isyarat dinamis: tarik garis horizontal ke kanan, diagonal ke kiri bawah, dan horizontal ke kanan.')
ON CONFLICT (letter) DO UPDATE SET
    gesture_type = EXCLUDED.gesture_type,
    description = EXCLUDED.description,
    difficulty = EXCLUDED.difficulty,
    tips = EXCLUDED.tips;

COMMIT;

-- Muat ulang cache skema PostgREST agar perubahan tipe kolom UUID -> TEXT langsung aktif
NOTIFY pgrst, 'reload schema';
