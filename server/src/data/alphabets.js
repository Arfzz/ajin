// Data 26 Alfabet Sistem Isyarat Bahasa Indonesia (SIBI) A-Z
// Fallback in-memory database untuk memastikan server langsung berjalan tanpa ketergantungan DB eksternal

export const SIBI_ALPHABETS = [
  {
    id: 1,
    letter: "A",
    gestureType: "static",
    description: "Kepalkan empat jari rapat ke telapak tangan, ibu jari tegak lurus menempel di samping jari telunjuk.",
    difficulty: "easy",
    tips: "Pastikan ibu jari tidak menekuk ke depan empat jari agar tidak tertukar dengan huruf E."
  },
  {
    id: 2,
    letter: "B",
    gestureType: "static",
    description: "Buka empat jari lurus ke atas dan rapat. Tekuk ibu jari melintang di depan telapak tangan.",
    difficulty: "easy",
    tips: "Jaga empat jari tetap tegak lurus dan rapat vertikal."
  },
  {
    id: 3,
    letter: "C",
    gestureType: "static",
    description: "Lengkungkan kelima jari membentuk setengah lingkaran menyerupai huruf C dari sudut pandang kamera.",
    difficulty: "easy",
    tips: "Arahkan lengkungan tangan menghadap samping sedikit diagonal."
  },
  {
    id: 4,
    letter: "D",
    gestureType: "static",
    description: "Tegakkan jari telunjuk ke atas. Temukan ujung ibu jari dengan jari tengah, manis, dan kelingking membentuk lingkaran di bawah.",
    difficulty: "easy",
    tips: "Pastikan hanya telunjuk yang tegak lurus."
  },
  {
    id: 5,
    letter: "E",
    gestureType: "static",
    description: "Tekuk semua ujung empat jari ke bawah menyentuh ujung ibu jari yang terlipat di bawahnya.",
    difficulty: "medium",
    tips: "Perhatikan perbedaan dengan huruf A: pada E, ibu jari terlipat di bawah ujung-ujung jari."
  },
  {
    id: 6,
    letter: "F",
    gestureType: "static",
    description: "Temukan ujung ibu jari dan telunjuk membentuk lingkaran. Tiga jari lainnya (tengah, manis, kelingking) tegak lurus terbuka.",
    difficulty: "medium",
    tips: "Jangan sampai tertukar dengan gestur D: pada F ada tiga jari yang tegak."
  },
  {
    id: 7,
    letter: "G",
    gestureType: "static",
    description: "Arahkan jari telunjuk dan ibu jari mendatar ke samping membentuk capit sejajar horizontal.",
    difficulty: "medium",
    tips: "Orientasikan tangan secara horizontal ke arah kiri atau kanan kamera."
  },
  {
    id: 8,
    letter: "H",
    gestureType: "static",
    description: "Arahkan jari telunjuk dan jari tengah rapat mendatar ke samping. Dua jari lainnya dan ibu jari terlipat.",
    difficulty: "medium",
    tips: "Pastikan telunjuk dan tengah benar-benar rapat horizontal."
  },
  {
    id: 9,
    letter: "I",
    gestureType: "static",
    description: "Kepalkan semua jari kecuali jari kelingking yang tegak lurus ke atas.",
    difficulty: "easy",
    tips: "Ibu jari menahan jari telunjuk, tengah, dan manis."
  },
  {
    id: 10,
    letter: "J",
    gestureType: "dynamic",
    description: "Mulai dari posisi huruf I (kelingking tegak), lalu gerakkan kelingking membentuk lengkungan kait huruf J di udara.",
    difficulty: "hard",
    tips: "Isyarat dinamis: lakukan lintasan kait kelingking dengan stabil di dalam area panduan."
  },
  {
    id: 11,
    letter: "K",
    gestureType: "static",
    description: "Tegakkan telunjuk dan jari tengah membentuk huruf V, selipkan ibu jari di antara pangkal kedua jari tersebut.",
    difficulty: "medium",
    tips: "Mirip visual dengan V dan Y: perhatikan posisi ibu jari di tengah."
  },
  {
    id: 12,
    letter: "L",
    gestureType: "static",
    description: "Buka ibu jari dan telunjuk membentuk sudut 90 derajat menyerupai huruf L tegak.",
    difficulty: "easy",
    tips: "Tiga jari lainnya terlipat rapat ke telapak tangan."
  },
  {
    id: 13,
    letter: "M",
    gestureType: "static",
    description: "Lipat ibu jari ke dalam, lalu tutup dengan tiga jari (telunjuk, tengah, manis) di atasnya, kelingking terlipat.",
    difficulty: "hard",
    tips: "Perbedaan M dan N: M menggunakan 3 jari di atas jempol, N menggunakan 2 jari."
  },
  {
    id: 14,
    letter: "N",
    gestureType: "static",
    description: "Lipat ibu jari ke dalam, lalu tutup dengan dua jari (telunjuk dan tengah) di atasnya.",
    difficulty: "hard",
    tips: "Pastikan hanya dua jari yang menutupi ibu jari."
  },
  {
    id: 15,
    letter: "O",
    gestureType: "static",
    description: "Satukan seluruh ujung jari dengan ibu jari membentuk rongga lingkaran bulat sempurna.",
    difficulty: "easy",
    tips: "Tampilkan lingkaran dari sudut yang jelas terhadap kamera."
  },
  {
    id: 16,
    letter: "P",
    gestureType: "static",
    description: "Arahkan posisi gestur huruf K menghadap ke bawah diagonal (telunjuk menunjuk ke bawah).",
    difficulty: "hard",
    tips: "Sudut kemiringan tangan ke bawah sangat penting untuk membedakan P dari K."
  },
  {
    id: 17,
    letter: "Q",
    gestureType: "static",
    description: "Arahkan posisi gestur huruf G menghadap ke bawah vertikal.",
    difficulty: "medium",
    tips: "Arahkan capit jempol dan telunjuk lurus ke arah lantai."
  },
  {
    id: 18,
    letter: "R",
    gestureType: "static",
    description: "Silangkan jari tengah di atas atau di belakang jari telunjuk yang tegak lurus.",
    difficulty: "medium",
    tips: "Pastikan silangan jari telunjuk dan tengah terlihat kontras."
  },
  {
    id: 19,
    letter: "S",
    gestureType: "static",
    description: "Kepalkan seluruh jari rapat, dengan ibu jari melintang di depan kepalan jari telunjuk dan tengah.",
    difficulty: "easy",
    tips: "Ibu jari berada di depan kepalan, berbeda dari A (jempol di samping)."
  },
  {
    id: 20,
    letter: "T",
    gestureType: "static",
    description: "Kepalkan tangan dengan menyelipkan ibu jari di antara jari telunjuk dan jari tengah.",
    difficulty: "medium",
    tips: "Hanya ujung ibu jari yang menyembul di antara telunjuk dan jari tengah."
  },
  {
    id: 21,
    letter: "U",
    gestureType: "static",
    description: "Tegakkan jari telunjuk dan jari tengah rapat lurus ke atas. Ibu jari menahan dua jari lainnya.",
    difficulty: "easy",
    tips: "Jari telunjuk dan tengah wajib rapat lurus."
  },
  {
    id: 22,
    letter: "V",
    gestureType: "static",
    description: "Tegakkan jari telunjuk dan jari tengah terbuka membentuk sudut V (tanda peace).",
    difficulty: "easy",
    tips: "Rentangkan jarak antara telunjuk dan jari tengah secara tegas."
  },
  {
    id: 23,
    letter: "W",
    gestureType: "static",
    description: "Tegakkan tiga jari (telunjuk, tengah, manis) terbuka menyebar ke atas membentuk huruf W.",
    difficulty: "easy",
    tips: "Ibu jari menahan kelingking di telapak tangan."
  },
  {
    id: 24,
    letter: "X",
    gestureType: "static",
    description: "Kepalkan tangan lalu tekuk jari telunjuk menyerupai kait atau pengait kecil.",
    difficulty: "medium",
    tips: "Bentuk kait telunjuk harus tampak jelas dari samping atau depan kamera."
  },
  {
    id: 25,
    letter: "Y",
    gestureType: "static",
    description: "Rentangkan ibu jari dan kelingking terbuka lebar, tiga jari di tengah terlipat rapat.",
    difficulty: "easy",
    tips: "Bentuk menyerupai gestur telepon atau shaka sign."
  },
  {
    id: 26,
    letter: "Z",
    gestureType: "dynamic",
    description: "Tegakkan jari telunjuk lalu gerakkan di udara membentuk lintasan zig-zag huruf Z.",
    difficulty: "hard",
    tips: "Isyarat dinamis: tarik garis horizontal ke kanan, diagonal ke kiri bawah, dan horizontal ke kanan."
  }
];
