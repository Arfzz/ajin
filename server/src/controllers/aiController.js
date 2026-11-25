import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase, isSupabaseConfigured } from "../config/supabase.js";

async function saveChatMessageToSupabase({
  userId = "guest-user",
  sessionId = null,
  source = "assistant",
  userMessage,
  aiReply,
  targetLetter = null,
  suggestedAction = null,
}) {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from("chat_messages").insert({
    user_id: String(userId || "guest-user").trim(),
    session_id: sessionId ? String(sessionId).trim() : null,
    source,
    user_message: String(userMessage || ""),
    ai_reply: String(aiReply || ""),
    target_letter: targetLetter ? String(targetLetter).slice(0, 5) : null,
    suggested_action: suggestedAction ? String(suggestedAction).slice(0, 50) : null,
  });

  if (error) {
    console.error(
      `[AJIN AI] Gagal simpan chat_messages ke Supabase (${error.code || "ERR"}):`,
      error.message
    );
  }
}

async function savePhotoScanToSupabase({
  userId = "guest-user",
  sessionId = null,
  result,
  latencyMs = 0,
}) {
  if (!isSupabaseConfigured || !supabase || !result) return;
  const normalizedUserId = String(userId || "guest-user").trim();

  const [scanRes, telRes] = await Promise.all([
    supabase.from("photo_scans").insert({
      user_id: normalizedUserId,
      session_id: sessionId ? String(sessionId).trim() : null,
      detected_letter: result.letter ? String(result.letter).slice(0, 5) : "?",
      is_sign: Boolean(result.isSign),
      confidence: Number(result.confidence || 0),
      gesture_type: result.gestureType === "dynamic" ? "dynamic" : "static",
      description: result.description || "",
      feedback: result.feedback || "",
      alternatives: Array.isArray(result.alternatives) ? result.alternatives : [],
    }),
    supabase.from("session_telemetries").insert({
      user_id: normalizedUserId,
      session_type: "photo",
      target_label: result.isSign && /^[A-Z]$/.test(result.letter) ? result.letter : null,
      predicted_label: result.letter ? String(result.letter).slice(0, 10) : "?",
      confidence: Number(result.confidence || 0),
      latency_ms: Number(latencyMs || 0),
      fps: 0,
      lighting_cond: "photo-upload",
      is_success: Boolean(result.isSign),
    }),
  ]);

  if (scanRes.error) {
    console.error(
      `[AJIN AI] Gagal simpan photo_scans ke Supabase (${scanRes.error.code || "ERR"}):`,
      scanRes.error.message
    );
  }
  if (telRes.error) {
    console.error(
      `[AJIN AI] Gagal simpan telemetri foto ke Supabase (${telRes.error.code || "ERR"}):`,
      telRes.error.message
    );
  }
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi di file .env server.");
  }
  return new GoogleGenerativeAI(apiKey.trim());
}

// Konfigurasi kandidat model berdasarkan hasil uji live:
// gemini-3-flash-preview dengan thinkingLevel "minimal" + JSON mode merespons ~2 detik dan stabil
// untuk teks maupun gambar multimodal, sementara gemini-3.1-flash-lite-preview & gemini-3.8-flash menjadi cadangan.
const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-3.8-flash",
].filter(Boolean);

const PRIMARY_QUALITY_MODEL = MODEL_CANDIDATES[0] || "gemini-3-flash-preview";
const PRIMARY_FAST_MODEL = MODEL_CANDIDATES[0] || "gemini-3-flash-preview";

function buildGenerationConfig(modelName, jsonMode = true) {
  const config = {};
  if (jsonMode) {
    config.responseMimeType = "application/json";
  }
  // thinkingLevel "minimal" didukung di seri 3.0 Flash (~2s); di 3.8 Flash memicu 400 Invalid Argument
  if (modelName.includes("gemini-3-flash")) {
    config.thinkingConfig = { thinkingLevel: "minimal" };
  }
  return config;
}

async function withTimeout(promise, timeoutMs, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const err = new Error(`Model ${label} melebihi batas waktu ${timeoutMs}ms.`);
          err.status = 408;
          reject(err);
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function generateWithGemini(contents, tier = "fast") {
  const genAI = getGeminiClient();
  const perAttemptMs = tier === "vision" ? 18000 : 12000;
  let lastError = null;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: buildGenerationConfig(modelName, true),
      });
      const result = await withTimeout(
        model.generateContent(contents),
        perAttemptMs,
        modelName
      );
      return result.response.text().trim();
    } catch (err) {
      lastError = err;
      console.warn(
        `[AJIN Gemini] Model ${modelName} gagal (${err.status || err.message}), mencoba cadangan...`
      );
    }
  }

  throw lastError || new Error("Seluruh kandidat model Gemini gagal merespons.");
}

// Kamus semantik kata dasar Bahasa Indonesia untuk fallback natural (tanpa kalimat kaku "Mohon izin menyampaikan: X")
const SEMANTIC_ROOT_DICTIONARY = {
  BACA: {
    suggestion: "Saya sedang membaca materi atau buku ini.",
    casual: [
      "Aku lagi baca materi ini dulu ya.",
      "Bentar ya, aku mau baca tulisannya dulu.",
      "Yuk kita baca bagian ini bareng-bareng.",
    ],
    formal: [
      "Saat ini saya sedang membaca dokumen tersebut.",
      "Mohon tunggu sebentar, saya ingin membaca petunjuknya terlebih dahulu.",
      "Saya sedang mempelajari dan membaca materi ini.",
    ],
    question: [
      "Apakah kamu sudah membaca materi ini?",
      "Bagian mana yang perlu kita baca sekarang?",
      "Boleh saya ikut membaca buku tersebut?",
    ],
  },
  TULIS: {
    suggestion: "Saya sedang menulis catatan terlebih dahulu.",
    casual: [
      "Aku catat dan tulis dulu ya.",
      "Bentar, aku lagi nulis sesuatu nih.",
      "Tolong tulis di kertas atau pesan ya biar jelas.",
    ],
    formal: [
      "Saya sedang menuliskan catatan penting terkait hal ini.",
      "Mohon dituliskan agar saya dapat membacanya dengan lebih jelas.",
      "Izinkan saya mencatat informasi tersebut terlebih dahulu.",
    ],
    question: [
      "Bisa tolong tuliskan maksudnya di sini?",
      "Apa saja poin yang perlu kita tulis?",
      "Apakah kamu sudah selesai menulis catatan itu?",
    ],
  },
  MAKAN: {
    suggestion: "Saya ingin makan terlebih dahulu.",
    casual: [
      "Yuk kita cari makan bareng sekarang.",
      "Aku lagi mau makan dulu ya.",
      "Udah jam makan nih, makan di mana kita?",
    ],
    formal: [
      "Saya izin beristirahat sebentar untuk makan.",
      "Mari kita makan bersama terlebih dahulu.",
      "Saat ini saya sedang berada di jam makan.",
    ],
    question: [
      "Apakah kamu sudah makan hari ini?",
      "Mau makan di mana kita setelah ini?",
      "Makanan apa yang ingin kamu pesan?",
    ],
  },
  LAPAR: {
    suggestion: "Saya sedang merasa lapar dan ingin mencari makanan.",
    casual: [
      "Aku udah lapar banget nih, cari makan yuk!",
      "Perutku lapar, beli cemilan atau makan dulu yuk.",
      "Lagi lapar nih, ada makanan nggak ya?",
    ],
    formal: [
      "Saat ini saya merasa lapar, izin mencari makan sebentar.",
      "Mohon maaf, saya ingin makan terlebih dahulu karena sudah lapar.",
      "Apakah ada tempat makan terdekat dari sini?",
    ],
    question: [
      "Apakah kamu juga sudah merasa lapar?",
      "Di mana kita bisa membeli makanan saat lapar begini?",
      "Mau ikut beli makanan bareng nggak?",
    ],
  },
  MINUM: {
    suggestion: "Saya merasa haus dan ingin mengambil air minum.",
    casual: [
      "Aku haus nih, mau minum air dulu ya.",
      "Beli minum dingin dulu yuk sebentar.",
      "Boleh minta air minumnya nggak?",
    ],
    formal: [
      "Mohon izin, saya ingin mengambil air minum sebentar.",
      "Bolehkah saya meminta air minum?",
      "Saya sedang merasa haus dan memerlukan air minum.",
    ],
    question: [
      "Apakah ada air minum di sekitar sini?",
      "Kamu mau pesan minuman apa?",
      "Boleh saya minta air minum sebentar?",
    ],
  },
  HAUS: {
    suggestion: "Saya sedang merasa haus dan butuh air minum.",
    casual: [
      "Haus banget nih, cari minum dulu yuk.",
      "Aku haus, mau ambil minum bentar ya.",
      "Ada air putih nggak? Aku lagi haus nih.",
    ],
    formal: [
      "Mohon izin, saya merasa haus dan ingin minum terlebih dahulu.",
      "Bolehkah saya mendapatkan air minum?",
      "Saya memerlukan air minum karena merasa haus.",
    ],
    question: [
      "Di mana saya bisa mengambil air minum?",
      "Apakah kamu membawa botol air minum?",
      "Mau ikut beli minuman segar di depan?",
    ],
  },
  BELAJAR: {
    suggestion: "Saya sedang belajar Sistem Isyarat Bahasa Indonesia (SIBI).",
    casual: [
      "Aku lagi asyik belajar bahasa isyarat SIBI nih.",
      "Yuk belajar gerakan tangan SIBI bareng aku!",
      "Lagi latihan dan belajar huruf isyarat di AJIN nih.",
    ],
    formal: [
      "Saat ini saya sedang mempelajari Sistem Isyarat Bahasa Indonesia (SIBI).",
      "Saya sedang berlatih komunikasi bahasa isyarat secara mandiri.",
      "Mari kita belajar bahasa isyarat bersama agar komunikasi lebih inklusif.",
    ],
    question: [
      "Apakah kamu mau ikut belajar bahasa isyarat SIBI bersama saya?",
      "Huruf isyarat apa yang sedang kamu pelajari hari ini?",
      "Bisa bantu saya belajar gerakan isyarat ini?",
    ],
  },
  TOLONG: {
    suggestion: "Mohon bantuannya sebentar, saya membutuhkan pertolongan.",
    casual: [
      "Tolong bantuin aku sebentar dong.",
      "Eh, boleh minta tolong nggak?",
      "Bantuin aku cek bagian ini sebentar ya.",
    ],
    formal: [
      "Permisi, bolehkah saya meminta bantuan Anda sebentar?",
      "Mohon bantuannya untuk membantu saya menyelesaikan hal ini.",
      "Saya sedang memerlukan sedikit bantuan, mohon arahannya.",
    ],
    question: [
      "Apakah Anda memiliki waktu untuk membantu saya sebentar?",
      "Bolehkah saya meminta tolong terkait hal ini?",
      "Siapa yang bisa saya mintai bantuan di sini?",
    ],
  },
  BANTU: {
    suggestion: "Saya memerlukan bantuan untuk menyelesaikan hal ini.",
    casual: [
      "Boleh bantuin aku sebentar nggak?",
      "Makasih ya udah mau bantu aku!",
      "Yuk saling bantu biar cepat selesai.",
    ],
    formal: [
      "Bolehkah saya memohon bantuan Anda sebentar?",
      "Terima kasih atas kesediaan Anda untuk membantu saya.",
      "Saya siap membantu jika ada yang diperlukan.",
    ],
    question: [
      "Ada yang bisa saya bantu untukmu?",
      "Bisa tolong bantu saya menjelaskan bagian ini?",
      "Bagaimana cara terbaik agar kita bisa saling membantu?",
    ],
  },
  PAHAM: {
    suggestion: "Saya sudah paham dan mengerti penjelasannya.",
    casual: [
      "Oke sip, sekarang aku udah paham!",
      "Oh gitu, aku ngerti maksudmu sekarang.",
      "Mantap, penjelasannya jelas banget dan aku paham.",
    ],
    formal: [
      "Terima kasih, saya sudah memahami penjelasan tersebut dengan baik.",
      "Informasi yang disampaikan sudah sangat jelas dan dapat saya pahami.",
      "Baik, saya mengerti maksud dan arahannya.",
    ],
    question: [
      "Apakah penjelasan saya tadi sudah cukup mudah dipahami?",
      "Bagian mana yang menurutmu masih belum dipahami?",
      "Sudah paham dengan langkah latihan ini?",
    ],
  },
  BINGUNG: {
    suggestion: "Saya masih sedikit bingung, boleh tolong dijelaskan kembali?",
    casual: [
      "Duh, aku masih agak bingung nih sama bagian ini.",
      "Bisa jelasin pelan-pelan lagi nggak? Aku masih bingung.",
      "Aku bingung cara bentuk jarinya, ajarin dong.",
    ],
    formal: [
      "Mohon maaf, saya masih belum sepenuhnya memahami bagian ini.",
      "Bolehkah Anda menjelaskan ulang secara perlahan karena saya masih bingung?",
      "Saya memerlukan arahan lebih lanjut mengenai hal tersebut.",
    ],
    question: [
      "Boleh tolong jelaskan ulang bagian yang membuat bingung ini?",
      "Bagaimana cara membedakan gerakan ini supaya tidak bingung?",
      "Apakah ada contoh lain agar lebih mudah dimengerti?",
    ],
  },
  TANYA: {
    suggestion: "Permisi, saya ingin bertanya mengenai sesuatu.",
    casual: [
      "Eh, aku mau nanya sesuatu dong.",
      "Boleh tanya sebentar nggak?",
      "Aku ada pertanyaan nih soal materi tadi.",
    ],
    formal: [
      "Permisi, bolehkah saya mengajukan satu pertanyaan?",
      "Mohon izin bertanya mengenai hal yang sedang dibahas.",
      "Saya ingin menanyakan beberapa informasi lebih lanjut.",
    ],
    question: [
      "Bolehkah saya bertanya kepada Anda sebentar?",
      "Kepada siapa saya bisa menanyakan informasi ini?",
      "Apakah ada hal yang ingin kamu tanyakan kepadaku?",
    ],
  },
  PULANG: {
    suggestion: "Saya ingin berpamitan untuk pulang sekarang.",
    casual: [
      "Aku pamit pulang duluan ya, hati-hati di jalan!",
      "Udah selesai nih, yuk kita pulang sekarang.",
      "Sampai ketemu besok ya, aku pulang dulu.",
    ],
    formal: [
      "Mohon izin, saya ingin berpamitan untuk pulang terlebih dahulu.",
      "Terima kasih atas waktunya hari ini, saya izin pulang.",
      "Kegiatan sudah selesai, mari kita bersiap untuk pulang.",
    ],
    question: [
      "Jam berapa kamu berencana pulang hari ini?",
      "Apakah kita sudah boleh pulang sekarang?",
      "Mau pulang bareng ke arah sana nggak?",
    ],
  },
  HALO: {
    suggestion: "Halo! Senang bisa bertemu dan menyapamu hari ini.",
    casual: [
      "Halo! Apa kabar kamu hari ini?",
      "Hai, senang banget bisa ketemu kamu di sini!",
      "Halo teman, lagi sibuk apa sekarang?",
    ],
    formal: [
      "Halo, selamat datang dan salam kenal.",
      "Selamat pagi/siang, senang dapat berjumpa dengan Anda.",
      "Halo, semoga kabar Anda sehat dan baik hari ini.",
    ],
    question: [
      "Halo, bagaimana kabarmu hari ini?",
      "Halo, apakah kamu sedang luang untuk mengobrol sebentar?",
      "Halo, bolehkah kita berkenalan?",
    ],
  },
  "TERIMA KASIH": {
    suggestion: "Terima kasih banyak atas bantuan dan perhatiannya.",
    casual: [
      "Makasih banyak ya udah bantuin aku!",
      "Wah, terima kasih banyak teman!",
      "Makasih ya, kamu baik banget.",
    ],
    formal: [
      "Terima kasih banyak atas waktu dan bantuan yang Anda berikan.",
      "Saya mengucapkan terima kasih yang sebesar-besarnya.",
      "Terima kasih atas kerja sama dan pengertiannya.",
    ],
    question: [
      "Bagaimana cara saya membalas kebaikanmu? Terima kasih banyak ya!",
      "Apakah sudah diterima semuanya? Terima kasih banyak!",
      "Boleh saya ucapkan terima kasih sekali lagi atas bantuannya?",
    ],
  },
  MAAF: {
    suggestion: "Mohon maaf apabila ada kesalahan atau kekeliruan dari saya.",
    casual: [
      "Maaf banget ya kalau aku ada salah tadi.",
      "Eh sorry ya, aku minta maaf bikin kamu nunggu.",
      "Maaf ya, coba aku ulangi isyaratnya pelan-pelan.",
    ],
    formal: [
      "Mohon maaf yang sebesar-besarnya atas kekeliruan saya.",
      "Permisi, mohon maaf apabila saya mengganggu waktu Anda sebentar.",
      "Saya memohon maaf jika penyampaian isyarat saya kurang tepat.",
    ],
    question: [
      "Mohon maaf, bolehkah saya mengulangi penjelasan tadi?",
      "Maaf mengganggu, apakah Anda sedang ada waktu luang?",
      "Apakah kamu mau memaafkan kekeliruan saya tadi?",
    ],
  },
};

export function buildContextualIndonesianFallback(rawText, mode = "casual") {
  const cleaned = (rawText || "")
    .toUpperCase()
    .replace(/[^A-Z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim() || "HALO";

  const preset = SEMANTIC_ROOT_DICTIONARY[cleaned];
  if (preset) {
    return {
      success: true,
      input: rawText,
      corrected: cleaned,
      suggestion: preset.suggestion,
      variations: preset[mode] || preset.casual,
      alternatives: preset.casual.slice(0, 2),
      explanation: `Kata isyarat "${cleaned}" diperluas menjadi kalimat percakapan Bahasa Indonesia yang natural.`,
      isFallback: true,
    };
  }

  // Jika frasa terdiri dari beberapa kata (misal "SAYA BACA BUKU" atau "NAMA SAYA ADIT")
  const words = cleaned.split(" ");
  const lowerPhrase = cleaned.toLowerCase();
  const sentenceCase = lowerPhrase.charAt(0).toUpperCase() + lowerPhrase.slice(1);

  let naturalStatement = `${sentenceCase}.`;
  let casualList = [];
  let formalList = [];
  let questionList = [];

  if (words.length === 1) {
    // 1 kata tunggal yang tidak ada di preset: buat kalimat percakapan aktif yang masuk akal
    naturalStatement = `Saya sedang melakukan atau membahas tentang ${lowerPhrase}.`;
    casualList = [
      `Aku lagi fokus soal ${lowerPhrase} dulu ya.`,
      `Yuk kita bahas atau lakukan ${lowerPhrase} sekarang.`,
      `Ini berkaitan sama ${lowerPhrase} yang tadi aku maksud.`,
    ];
    formalList = [
      `Saat ini saya sedang melakukan kegiatan terkait ${lowerPhrase}.`,
      `Saya ingin menyampaikan hal mengenai ${lowerPhrase}.`,
      `Mari kita menindaklanjuti hal yang berkaitan dengan ${lowerPhrase}.`,
    ];
    questionList = [
      `Bagaimana pendapatmu mengenai ${lowerPhrase} ini?`,
      `Apakah kamu sudah mengetahui tentang ${lowerPhrase}?`,
      `Bisa bantu saya terkait ${lowerPhrase} sekarang?`,
    ];
  } else {
    naturalStatement = /^(saya|aku|kami|kita|halo|terima|tolong|mohon|selamat)/i.test(cleaned)
      ? `${sentenceCase}.`
      : `Saya ingin menyampaikan bahwa ${lowerPhrase}.`;

    casualList = [
      `${sentenceCase} ya.`,
      `Aku mau bilang kalau ${lowerPhrase} nih.`,
      `Yuk, ${lowerPhrase} bareng-bareng.`,
    ];
    formalList = [
      `Saya ingin menyampaikan bahwa ${lowerPhrase}.`,
      `Mohon perhatiannya, saat ini ${lowerPhrase}.`,
      `Terima kasih, ${lowerPhrase}.`,
    ];
    questionList = [
      `Apakah benar bahwa ${lowerPhrase}?`,
      `Bagaimana menurutmu mengenai ${lowerPhrase}?`,
      `Bisa tolong bantu terkait ${lowerPhrase}?`,
    ];
  }

  const chosenVariations =
    mode === "formal"
      ? formalList
      : mode === "question"
      ? questionList
      : casualList;

  return {
    success: true,
    input: rawText,
    corrected: cleaned,
    suggestion: naturalStatement,
    variations: chosenVariations,
    alternatives: casualList.slice(0, 2),
    explanation: `Disusun menjadi kalimat Bahasa Indonesia percakapan dari isyarat "${cleaned}".`,
    isFallback: true,
  };
}

/**
 * POST /api/ai/interpret
 * Body: { letters: string[], contextHint?: string }
 */
export const interpretSignSpelling = async (req, res) => {
  const { letters = [], contextHint = "", userId = "guest-user", sessionId = null } = req.body || {};

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

  try {
    const contextPart = contextHint
      ? `Konteks situasi: "${contextHint}".`
      : "Konteks: komunikasi sehari-hari Bahasa Indonesia.";

    const prompt = `Kamu adalah juru bahasa dan asisten komunikasi cerdas untuk aplikasi AJIN (Sistem Isyarat Bahasa Indonesia / SIBI).

Pengguna mengeja kata kunci atau huruf-huruf berikut melalui bahasa isyarat tangan:
"${rawText}"

${contextPart}

PENTING:
Dalam bahasa isyarat (SIBI), pengguna sering hanya mengeja 1 atau 2 KATA DASAR (telegraphic keywords) tanpa imbuhan lengkap, misalnya:
- "BACA" maksudnya adalah "Saya sedang membaca buku/materi ini."
- "MINUM" maksudnya adalah "Saya merasa haus, boleh minta air minum?"
- "TANYA TUGAS" maksudnya adalah "Saya ingin bertanya mengenai tugas ini."

Tugasmu:
1. "corrected": Perbaiki jika ada salah ketik/typo akibat kemiripan bentuk jari SIBI (misal K/V/Y, M/N/S, A/E). Gunakan HURUF KAPITAL.
2. "suggestion": Ubah kata dasar tersebut menjadi 1 kalimat percakapan Bahasa Indonesia sudut pandang orang pertama ("Saya..." atau sapaan langsung) yang utuh, berimbuhan lengkap (me-, ber-, dsb.), alami, dan langsung nyambung dipakai berbicara! JANGAN PERNAH hanya mengembalikan 1 kata seperti "Baca."!
3. "alternatives": Berikan 2 kalimat alternatif yang juga natural dan kontekstual.
4. "explanation": Penjelasan singkat 1 kalimat.

WAJIB balas HANYA dalam JSON valid tanpa markdown:
{
  "corrected": "<KATA/FRASA TERKOREKSI KAPITAL>",
  "suggestion": "<kalimat lengkap berimbuhan yang natural>",
  "alternatives": ["<alternatif kalimat natural 1>", "<alternatif kalimat natural 2>"],
  "explanation": "<penjelasan singkat>"
}`;

    const responseText = await generateWithGemini(prompt);
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Format respons Gemini tidak valid.");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const finalSuggestion =
      parsed.suggestion || buildContextualIndonesianFallback(rawText).suggestion;

    await saveChatMessageToSupabase({
      userId,
      sessionId,
      source: "narrative",
      userMessage: rawText,
      aiReply: finalSuggestion,
      targetLetter: null,
      suggestedAction: "narrative",
    });

    return res.json({
      success: true,
      input: rawText,
      corrected: parsed.corrected || rawText,
      suggestion: finalSuggestion,
      alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
      explanation: parsed.explanation || "",
    });
  } catch (err) {
    console.warn("[AJIN AI] Interpret fallback digunakan:", err.message);
    const fb = buildContextualIndonesianFallback(rawText, "casual");
    await saveChatMessageToSupabase({
      userId,
      sessionId,
      source: "narrative",
      userMessage: rawText,
      aiReply: fb.suggestion,
      targetLetter: null,
      suggestedAction: "narrative",
    });
    return res.json(fb);
  }
};

/**
 * POST /api/ai/expand
 * Body: { text: string, mode: "formal"|"casual"|"question" }
 */
export const expandText = async (req, res) => {
  const { text = "", mode = "casual" } = req.body || {};

  if (!text.trim()) {
    return res.status(400).json({ success: false, message: "Teks kosong." });
  }

  try {
    const modeDesc = {
      casual: "gaya SANTAI dan akrab sehari-hari (gunakan 'aku/kamu', bahasa lisan yang luwes dan hangat)",
      formal: "gaya FORMAL, sopan, dan santun (gunakan 'saya/Anda', imbuhan baku yang wajar, BUKAN kalimat birokrasi kaku seperti 'Mohon izin menyampaikan: BACA')",
      question: "bentuk kalimat PERTANYAAN komunikatif yang menanyakan atau mengonfirmasi topik tersebut kepada lawan bicara",
    }[mode] || "gaya santai sehari-hari";

    const prompt = `Kamu adalah juru bahasa komunikasi untuk pengguna Sistem Isyarat Bahasa Indonesia (SIBI).

Kata kunci dari ejaan isyarat tangan pengguna: "${text}"

Buat 3 variasi kalimat percakapan Bahasa Indonesia singkat (5 sampai 11 kata per kalimat) dengan ${modeDesc}.
ATURAN KETAT:
1. Jika input hanya 1 kata dasar (misal "BACA", "MAKAN", "TOLONG", "PULANG"), ubah menjadi kata berimbuhan yang wajar ("membaca", "makan", "menolong", "pulang") dengan subjek orang pertama ("aku"/"saya"/"kita").
2. Tetap fokus langsung pada makna kata "${text}" saat ini. JANGAN mengarang cerita tambahan di luar konteks (jangan menambah topik WhatsApp, novel kemarin, atau detail fiktif lain).
3. DILARANG membuat kalimat template kaku seperti "Mohon izin menyampaikan: BACA" atau "Dengan hormat, maksud kami adalah baca".

Balas HANYA dengan JSON valid tanpa markdown:
{
  "variations": ["<kalimat singkat 1>", "<kalimat singkat 2>", "<kalimat singkat 3>"]
}`;

    const responseText = await generateWithGemini(prompt);
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Format respons tidak valid.");

    const parsed = JSON.parse(jsonMatch[0]);

    return res.json({
      success: true,
      original: text,
      mode,
      variations: Array.isArray(parsed.variations) && parsed.variations.length > 0
        ? parsed.variations
        : buildContextualIndonesianFallback(text, mode).variations,
    });
  } catch (err) {
    console.warn("[AJIN AI] Expand fallback digunakan:", err.message);
    const fb = buildContextualIndonesianFallback(text, mode);
    return res.json({
      success: true,
      original: text,
      mode,
      variations: fb.variations,
      isFallback: true,
    });
  }
};

/**
 * GET /api/ai/status
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

  return res.json({
    success: true,
    available: true,
    model: PRIMARY_QUALITY_MODEL,
    fastModel: PRIMARY_FAST_MODEL,
  });
};

/**
 * POST /api/ai/quiz-words
 */
export const generateQuizWords = async (req, res) => {
  const { category = "umum", difficulty = "easy", count = 5 } = req.body || {};

  const fallbackPool = {
    easy: ["BUKU", "SAYA", "KITA", "AJIN", "BAIK", "HARI", "MEJA", "BOLA", "APEL", "AYAM", "ROTI", "KOPI"],
    medium: ["RUMAH", "BURUNG", "SEPATU", "SEKOLAH", "PINTAR", "BELAJAR", "TEMAN", "TANGAN", "ISYARAT"],
    hard: ["INDONESIA", "SEMANGAT", "KELUARGA", "KREATIF", "PRESTASI", "GENERASI", "HARAPAN"],
  };

  const getFallback = () => {
    const list = fallbackPool[difficulty] || fallbackPool.easy;
    return [...list].sort(() => 0.5 - Math.random()).slice(0, Number(count) || 5);
  };

  try {
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

    const responseText = await generateWithGemini(prompt, "quality");
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
 */
export const recognizeSignFromImage = async (req, res) => {
  const startedAt = Date.now();
  try {
    const {
      image,
      mimeType = "image/jpeg",
      userId = "guest-user",
      sessionId = null,
    } = req.body || {};

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        success: false,
        message: "Data gambar (base64) wajib dikirimkan pada kolom 'image'.",
      });
    }

    const cleanBase64 = image.includes(",") ? image.split(",")[1] : image;
    const detectedMime = image.includes(";") && image.includes(":")
      ? image.split(";")[0].replace("data:", "")
      : mimeType;

    const imagePart = {
      inlineData: {
        data: cleanBase64,
        mimeType: detectedMime || "image/jpeg",
      },
    };

    const prompt = `Analisis foto tangan untuk abjad Sistem Isyarat Bahasa Indonesia (SIBI, huruf A sampai Z).

Tugas:
1. Tentukan apakah foto menampilkan gestur tangan manusia ("isSign": true/false).
2. Jika ya, kenali huruf SIBI (A-Z), estimasi keyakinan (0-100), tipe gestur ("static" atau "dynamic" untuk J/Z).
3. Tulis "description" singkat (1 kalimat posisi jari yang terlihat) dan "feedback" praktis (1 kalimat koreksi jari agar lebih tepat) WAJIB dalam Bahasa Indonesia.
4. Berikan maksimal 3 huruf alternatif di "alternatives" jika gesturnya mirip huruf lain.

Balas HANYA JSON valid:
{
  "isSign": true,
  "letter": "A-Z atau ?",
  "confidence": 0-100,
  "gestureType": "static atau dynamic",
  "description": "deskripsi singkat Bahasa Indonesia",
  "feedback": "saran singkat Bahasa Indonesia",
  "alternatives": ["X"]
}`;

    const responseText = await generateWithGemini([prompt, imagePart], "vision");
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Gagal membaca struktur respons analisis dari model.");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const finalResult = {
      isSign: parsed.isSign !== false,
      letter: parsed.letter ? String(parsed.letter).toUpperCase().trim() : "?",
      confidence: Number(parsed.confidence) || 85,
      gestureType: parsed.gestureType === "dynamic" ? "dynamic" : "static",
      description: parsed.description || "Posisi jemari terdeteksi sesuai kaidah SIBI.",
      feedback: parsed.feedback || "Gestur tangan berhasil dikenali dengan baik.",
      alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
    };

    await savePhotoScanToSupabase({
      userId,
      sessionId,
      result: finalResult,
      latencyMs: Date.now() - startedAt,
    });

    return res.json({
      success: true,
      result: finalResult,
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
 */
export const chatWithAi = async (req, res) => {
  try {
    const {
      message,
      history = [],
      userId = "guest-user",
      sessionId = null,
    } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Pesan percakapan tidak boleh kosong.",
      });
    }

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

    const responseText = await generateWithGemini(prompt, "quality");
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Gagal membaca struktur respons JSON dari model.");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const finalReply =
      parsed.reply ||
      "Halo! Ada yang bisa saya bantu seputar pembelajaran Sistem Isyarat Bahasa Indonesia (SIBI)?";
    const finalTargetLetter = parsed.targetLetter
      ? String(parsed.targetLetter).toUpperCase().trim()
      : null;
    const finalSuggestedAction = parsed.suggestedAction || null;

    await saveChatMessageToSupabase({
      userId,
      sessionId,
      source: "assistant",
      userMessage: message.trim(),
      aiReply: finalReply,
      targetLetter: finalTargetLetter,
      suggestedAction: finalSuggestedAction,
    });

    return res.json({
      success: true,
      reply: finalReply,
      targetLetter: finalTargetLetter,
      suggestedAction: finalSuggestedAction,
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

    return res.json({
      success: true,
      reply: "Maaf, koneksi AI sedang sibuk. Namun kamu tetap bisa menjelajahi 26 alfabet SIBI di menu Kamus Huruf atau langsung berlatih di depan webcam pada menu Latih Kamera!",
      targetLetter: null,
      suggestedAction: "practice",
      tips: "Coba ulangi pertanyaanmu dalam beberapa saat.",
    });
  }
};
