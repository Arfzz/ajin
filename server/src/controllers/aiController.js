import { GoogleGenerativeAI } from "@google/generative-ai";

// Inisialisasi Gemini client, dibaca dari env saat runtime
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi di file .env server.");
  }
  return new GoogleGenerativeAI(apiKey);
}

// Model Gemini aktif (gemini-3.5-flash-lite memiliki latensi sangat rendah dan kuota gratis luas)
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

/**
 * POST /api/ai/interpret
 * Body: { letters: string[], contextHint?: string }
 *
 * letters: array huruf yang sudah dieja via SIBI, misal ["S","A","Y","A"," ","L","A","P","A","R"]
 * contextHint: opsional, konteks situasi ("salam", "perkenalan", "kebutuhan", dll)
 *
 * Response: { corrected, suggestion, alternatives[], explanation }
 */
export const interpretSignSpelling = async (req, res) => {
  try {
    const { letters = [], contextHint = "" } = req.body;

    if (!Array.isArray(letters) || letters.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Kolom 'letters' wajib diisi dan berupa array huruf.",
      });
    }

    const rawText = letters.join("").trim();
    if (rawText.replace(/\s+/g, "").length === 0) {
      return res.status(400).json({
        success: false,
        message: "Tidak ada huruf yang bisa diinterpretasikan.",
      });
    }

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const contextPart = contextHint
      ? `Konteks percakapan: "${contextHint}".`
      : "Konteks: percakapan umum Bahasa Indonesia.";

    const prompt = `Kamu adalah asisten interpretasi bahasa isyarat untuk aplikasi AJIN (pembelajaran Sistem Isyarat Bahasa Indonesia / SIBI).

Pengguna telah mengeja huruf-huruf berikut satu per satu via isyarat tangan di depan kamera:
"${rawText}"

${contextPart}

Tugasmu:
1. Perbaiki ejaan menjadi kalimat Bahasa Indonesia yang natural dan logis (koreksi salah deteksi yang mungkin terjadi akibat kesamaan visual huruf seperti K/Y, M/N, dsb).
2. Ekspansi menjadi kalimat lengkap yang sopan dan komunikatif (1-2 kalimat).
3. Berikan 2 alternatif interpretasi lain yang mungkin.
4. Jelaskan secara singkat apa yang kamu perbaiki atau ekspansi (dalam 1 kalimat singkat).

WAJIB balas dalam format JSON berikut tanpa teks tambahan di luar JSON:
{
  "corrected": "<teks yang dikoreksi ejaannya>",
  "suggestion": "<kalimat lengkap yang ekspansif dan natural>",
  "alternatives": ["<alternatif 1>", "<alternatif 2>"],
  "explanation": "<penjelasan singkat perubahan>"
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Ambil JSON dari respons
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Format respons Gemini tidak valid.");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return res.json({
      success: true,
      input: rawText,
      corrected: parsed.corrected || rawText,
      suggestion: parsed.suggestion || rawText,
      alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
      explanation: parsed.explanation || "",
    });
  } catch (err) {
    console.error("[AJIN AI] Error interpretasi isyarat:", err.message);

    if (err.message.includes("GEMINI_API_KEY")) {
      return res.status(503).json({
        success: false,
        message: "Layanan AI belum dikonfigurasi. Tambahkan GEMINI_API_KEY di file .env server.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Gagal memproses interpretasi AI. Coba lagi.",
    });
  }
};

/**
 * POST /api/ai/expand
 * Body: { text: string, mode: "formal"|"casual"|"question" }
 *
 * Ekspansi teks yang sudah ada menjadi variasi kalimat berbeda.
 */
export const expandText = async (req, res) => {
  try {
    const { text = "", mode = "casual" } = req.body;

    if (!text.trim()) {
      return res.status(400).json({ success: false, message: "Teks kosong." });
    }

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const modeDesc = {
      formal: "formal dan sopan (untuk komunikasi resmi)",
      casual: "santai dan sehari-hari (untuk percakapan teman)",
      question: "dalam bentuk pertanyaan balik atau konfirmasi",
    }[mode] || "santai dan sehari-hari";

    const prompt = `Kamu adalah asisten komunikasi untuk pengguna yang belajar Sistem Isyarat Bahasa Indonesia (SIBI).

Teks asli dari ejaan isyarat: "${text}"

Buat 3 variasi kalimat Bahasa Indonesia yang ${modeDesc} dari teks tersebut. Pastikan tetap bermakna sama.

Balas hanya dengan JSON tanpa teks tambahan:
{
  "variations": ["<variasi 1>", "<variasi 2>", "<variasi 3>"]
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) throw new Error("Format respons tidak valid.");

    const parsed = JSON.parse(jsonMatch[0]);

    return res.json({
      success: true,
      original: text,
      variations: Array.isArray(parsed.variations) ? parsed.variations : [],
    });
  } catch (err) {
    console.error("[AJIN AI] Error ekspansi teks:", err.message);
    return res.status(500).json({ success: false, message: "Gagal mengekspansi teks." });
  }
};

/**
 * GET /api/ai/status
 * Cek apakah Gemini API key valid dan layanan aktif
 */
export const getAiStatus = async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    if (!apiKey) {
      return res.json({
        success: true,
        available: false,
        reason: "GEMINI_API_KEY belum terisi di server/.env",
      });
    }

    // Jika key tersedia, kembalikan status aktif tanpa menghabiskan kuota generateContent pada setiap reload
    return res.json({
      success: true,
      available: true,
      model: MODEL_NAME,
    });
  };

/**
 * POST /api/ai/quiz-words
 * Body: { category: string, difficulty: "easy"|"medium"|"hard", count: number }
 *
 * Menghasilkan kumpulan kata Bahasa Indonesia secara dinamis dengan Gemini AI
 * untuk kuis pengejaan isyarat huruf SIBI (A-Z).
 */
export const generateQuizWords = async (req, res) => {
  const { category = "umum", difficulty = "easy", count = 5 } = req.body;

  // Fallback cadangan jika API offline
  const fallbackPool = {
    easy: ["BUKU", "SAYA", "KITA", "AJIN", "BAIK", "HARI", "MEJA", "BOLA", "APEL", "AYAM", "ROTI", "KOPI"],
    medium: ["RUMAH", "BURUNG", "SEPATU", "SEKOLAH", "PINTAR", "BELAJAR", "TEMAN", "TANGAN", "ISYARAT"],
    hard: ["INDONESIA", "SEMANGAT", "KELUARGA", "KREATIF", "PRESTASI", "GENERASI", "HARAPAN"],
  };

  const getFallback = () => {
    const list = fallbackPool[difficulty] || fallbackPool.easy;
    const shuffled = [...list].sort(() => 0.5 - Math.random()).slice(0, Number(count) || 5);
    return shuffled;
  };

  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const diffGuide = {
      easy: "kata sederhana 3-4 huruf (contoh: BUKU, MEJA, BOLA, IKAN, APEL, AYAM, SUSU)",
      medium: "kata 5-6 huruf (contoh: RUMAH, SEPATU, BURUNG, MAKAN, KELAS, TANGAN)",
      hard: "kata 7-8 huruf yang inspiratif (contoh: SEMANGAT, KELUARGA, PANCASILA, PRESTASI)",
    }[difficulty] || "kata sederhana 3-4 huruf";

    const prompt = `Kamu adalah pembuat bank soal kuis untuk aplikasi AJIN (pembelajaran Sistem Isyarat Bahasa Indonesia / SIBI).
Buatkan ${count} kata bahasa Indonesia untuk latihan mengeja isyarat huruf demi huruf (A-Z).

Kategori tema: "${category}".
Tingkat kesulitan: "${difficulty}" (${diffGuide}).

Aturan ketat:
1. Setiap kata HANYA boleh berupa satu kata tunggal tanpa spasi.
2. Setiap kata HANYA berisi huruf alfabet A sampai Z (tanpa angka, tanpa tanda baca, tanpa strip).
3. Huruf wajib UPPERCASE.
4. Kosakata wajib umum, baku, dan lazim digunakan di Indonesia.
5. Panjang kata harus sesuai tingkat kesulitan.

Balas WAJIB HANYA dalam format JSON berikut tanpa teks tambahan di luar JSON:
{
  "words": ["KATA1", "KATA2", "KATA3", "KATA4", "KATA5"],
  "category": "${category}",
  "difficulty": "${difficulty}"
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) throw new Error("Format JSON respons tidak ditemukan.");

    const parsed = JSON.parse(jsonMatch[0]);
    const cleanWords = (parsed.words || [])
      .map((w) => String(w).toUpperCase().replace(/[^A-Z]/g, "").trim())
      .filter((w) => w.length >= 2);

    if (cleanWords.length === 0) throw new Error("Kata hasil generate tidak valid.");

    return res.json({
      success: true,
      words: cleanWords.slice(0, Number(count) || 5),
      category,
      difficulty,
      isAiGenerated: true,
    });
  } catch (err) {
    console.warn("[AJIN AI] Gagal generate kata kuis dengan Gemini, menggunakan fallback:", err.message);
    return res.json({
      success: true,
      words: getFallback(),
      category,
      difficulty,
      isAiGenerated: false,
      reason: err.message,
    });
  }
};

/**
 * POST /api/ai/recognize-image
 * Body: { image: string (base64), mimeType?: string }
 *
 * Menganalisis foto gestur tangan dan menentukan huruf SIBI (A-Z)
 * menggunakan model multimodal Google Gemini.
 */
export const recognizeSignFromImage = async (req, res) => {
  try {
    const { image, mimeType = "image/jpeg" } = req.body;

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        success: false,
        message: "Data gambar (base64) wajib dikirimkan pada kolom 'image'.",
      });
    }

    // Bersihkan prefix data URL (misal: 'data:image/jpeg;base64,')
    const cleanBase64 = image.includes(",") ? image.split(",")[1] : image;
    const detectedMime = image.includes(";") && image.includes(":")
      ? image.split(";")[0].replace("data:", "")
      : mimeType;

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const imagePart = {
      inlineData: {
        data: cleanBase64,
        mimeType: detectedMime || "image/jpeg",
      },
    };

    const prompt = `Kamu adalah pakar bahasa isyarat Sistem Isyarat Bahasa Indonesia (SIBI) dan penglihatan komputer (computer vision) untuk aplikasi AJIN.

Tugasmu adalah menganalisis foto tangan ini yang membentuk alfabet SIBI (A sampai Z).

Lakukan analisis seksama terhadap:
1. Huruf SIBI apa yang dibentuk oleh tangan pada foto (A-Z)?
2. Tingkat keyakinan / confidence (persentase bilangan bulat 0-100).
3. Tipe gestur: "static" (statis) atau "dynamic" (dinamis, seperti J atau Z).
4. Deskripsi posisi jemari yang teramati pada foto (misal: posisi ibu jari, telunjuk, jari tengah, kelingking).
5. Saran / feedback presisi: apakah posisinya sudah akurat sesuai standar SIBI atau ada koreksi jari yang perlu diperbaiki agar lebih jelas terbaca.
6. Huruf alternatif (jika gesturnya ambigu atau mirip dengan huruf lain, misal K dengan V/Y, atau M dengan N/S).

Jika foto BUKAN gestur tangan manusia atau tidak terbaca sama sekali, berikan "isSign": false dan jelaskan pada kolom "feedback".

WAJIB balas HANYA dalam format JSON valid berikut tanpa blok markdown tambahan dan tanpa teks lain di luar kurung kurawal:
{
  "isSign": true,
  "letter": "<HURUF A-Z>",
  "confidence": <angka 0-100>,
  "gestureType": "<static atau dynamic>",
  "description": "<deskripsi posisi jemari>",
  "feedback": "<masukan ketepatan posisi jari>",
  "alternatives": ["<huruf mirip>", "..."]
}`;

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text().trim();

    // Ambil blok JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Gagal membaca struktur respons analisis dari model.");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return res.json({
      success: true,
      result: {
        isSign: parsed.isSign !== false,
        letter: parsed.letter ? String(parsed.letter).toUpperCase().trim() : "?",
        confidence: Number(parsed.confidence) || 85,
        gestureType: parsed.gestureType === "dynamic" ? "dynamic" : "static",
        description: parsed.description || "Posisi jemari terdeteksi sesuai kaidah SIBI.",
        feedback: parsed.feedback || "Gestur tangan berhasil dikenali dengan baik.",
        alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
      },
    });
  } catch (err) {
    console.error("[AJIN AI] Error mengenali gestur dari foto:", err.message);

    if (err.message.includes("GEMINI_API_KEY")) {
      return res.status(503).json({
        success: false,
        message: "Layanan AI belum dikonfigurasi. Tambahkan GEMINI_API_KEY di file .env server.",
      });
    }

    return res.status(500).json({
      success: false,
      message: `Gagal menganalisis foto SIBI: ${err.message}`,
    });
  }
};

/**
 * POST /api/ai/chat
 * Body: { message: string, history?: Array<{ role: string, text: string }> }
 *
 * Chatbot percakapan & asisten suara cerdas untuk pembelajaran SIBI
 */
export const chatWithAi = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Pesan percakapan tidak boleh kosong.",
      });
    }

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Format riwayat percakapan terkini jika ada
    const historyContext = Array.isArray(history) && history.length > 0
      ? history
          .slice(-6)
          .map((h) => `${h.role === "user" ? "Pengguna" : "Asisten"}: ${h.text}`)
          .join("\n")
      : "Belum ada percakapan sebelumnya.";

    const prompt = `Kamu adalah AJIN Voice Assistant & Chatbot, asisten pintar dan ramah untuk platform pembelajaran Sistem Isyarat Bahasa Indonesia (SIBI).

Karakter & Gaya Komunikasi:
- Ramah, empatik, suportif, dan sangat menguasai kaidah 26 alfabet SIBI resmi (posisi jari, orientasi telapak, perbedaan huruf yang rawan tertukar).
- Berbicara dalam Bahasa Indonesia yang alami, ringkas, dan jelas (tidak bertele-tele).
- Jika pengguna bertanya cara membentuk huruf, jelaskan posisi jemari secara visual dan praktis.
- Jika pengguna meminta untuk latihan (misal: "saya mau latihan huruf B" atau "buka latihan"), tentukan "targetLetter" dan "suggestedAction": "practice".
- Jika pengguna meminta melihat kamus, tentukan "suggestedAction": "dictionary".
- Jika pengguna meminta scan/foto, tentukan "suggestedAction": "photo".

Riwayat percakapan terkini:
${historyContext}

Pesan terbaru dari pengguna:
"${message.trim()}"

WAJIB balas HANYA dalam format JSON valid berikut tanpa blok markdown tambahan dan tanpa teks lain di luar kurung kurawal:
{
  "reply": "<jawaban percakapan yang ramah, informatif, dan ringkas>",
  "targetLetter": "<huruf A-Z kapital jika topik mengerucut ke huruf tertentu, atau null>",
  "suggestedAction": "<'practice' | 'dictionary' | 'photo' | 'quiz' | null>",
  "tips": "<tips singkat 1 kalimat terkait gestur jika relevan, atau null>"
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Gagal membaca struktur respons JSON dari model.");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return res.json({
      success: true,
      reply: parsed.reply || "Halo! Ada yang bisa saya bantu seputar pembelajaran Sistem Isyarat Bahasa Indonesia (SIBI)?",
      targetLetter: parsed.targetLetter ? String(parsed.targetLetter).toUpperCase().trim() : null,
      suggestedAction: parsed.suggestedAction || null,
      tips: parsed.tips || null,
    });
  } catch (err) {
    console.error("[AJIN AI] Error chatbot percakapan:", err.message);

    if (err.message.includes("GEMINI_API_KEY")) {
      return res.status(503).json({
        success: false,
        message: "Layanan AI belum dikonfigurasi. Tambahkan GEMINI_API_KEY di file .env server.",
      });
    }

    // Fallback ramah jika model timeout
    return res.json({
      success: true,
      reply: "Maaf, koneksi AI sedang sibuk. Namun kamu tetap bisa menjelajahi 26 alfabet SIBI di menu Kamus Huruf atau langsung berlatih di depan webcam pada menu Latih Kamera!",
      targetLetter: null,
      suggestedAction: "practice",
      tips: "Coba ulangi pertanyaanmu dalam beberapa saat.",
    });
  }
};

