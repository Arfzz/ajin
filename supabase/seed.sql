-- AJIN (Aplikasi Jembatan Bahasa Isyarat dan Narasi)
-- Supabase PostgreSQL DDL & Seeder Alfabet SIBI (A-Z)

-- 1. Create SibiAlphabet Table
CREATE TABLE IF NOT EXISTS public.sibi_alphabets (
    id SERIAL PRIMARY KEY,
    letter VARCHAR(2) NOT NULL UNIQUE,
    gesture_type VARCHAR(20) NOT NULL, -- 'static' atau 'dynamic'
    description TEXT NOT NULL,
    reference_image_url TEXT,
    difficulty VARCHAR(20) DEFAULT 'easy', -- 'easy', 'medium', 'hard'
    tips TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create User Profiles (Mirrors Supabase Auth Users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create User Progress
CREATE TABLE IF NOT EXISTS public.user_progress (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    alphabet_id INT NOT NULL REFERENCES public.sibi_alphabets(id) ON DELETE CASCADE,
    is_mastered BOOLEAN DEFAULT FALSE,
    best_confidence FLOAT DEFAULT 0.0,
    attempts_count INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, alphabet_id)
);

-- 4. Create Session Telemetry (Pengujian Empiris untuk Skripsi/Analitik)
CREATE TABLE IF NOT EXISTS public.session_telemetries (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    session_type VARCHAR(50) NOT NULL, -- 'practice', 'narrative', 'quiz'
    target_label VARCHAR(10),
    predicted_label VARCHAR(10),
    confidence FLOAT NOT NULL,
    latency_ms FLOAT NOT NULL,
    fps FLOAT NOT NULL,
    lighting_cond VARCHAR(50),
    is_success BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Seed 26 Alfabet SIBI (A-Z)
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
