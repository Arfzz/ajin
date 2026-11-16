import { useState, useEffect, useCallback, useRef } from "react";
import {
  Sparkles, Volume2, Delete, RotateCcw, CornerDownLeft,
  Wand2, MessageSquare, AlertTriangle, CheckCircle2, Loader2,
  RefreshCw, ChevronRight, Sliders
} from "lucide-react";

import { WebcamCanvas } from "../components/vision/WebcamCanvas";
import { TelemetryBar } from "../components/vision/TelemetryBar";
import { DecryptedText } from "../components/reactbits/DecryptedText";
import { FloatingDock } from "../components/reactbits/FloatingDock";
import { sendTelemetry, interpretSigns, expandTextVariations, checkAiStatus } from "../services/api";

const EXPAND_MODES = [
  { id: "casual", label: "Santai", desc: "Percakapan sehari-hari" },
  { id: "formal", label: "Formal", desc: "Komunikasi resmi" },
  { id: "question", label: "Tanya Balik", desc: "Bentuk pertanyaan" },
];

const CONTEXT_HINTS = [
  { id: "", label: "Umum" },
  { id: "salam", label: "Salam" },
  { id: "perkenalan", label: "Perkenalan" },
  { id: "kebutuhan", label: "Kebutuhan" },
  { id: "darurat", label: "Darurat" },
];

export const AiCompanionPage = ({ modelHook }) => {
  // === State Papan Isyarat ===
  const [rawLetters, setRawLetters] = useState([]);         // Array huruf mentah dari kamera
  const [lastAddedLetter, setLastAddedLetter] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [holdSliderValue] = useState(1.5);

  // === State AI ===
  const [aiResult, setAiResult] = useState(null);           // Respons Gemini
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiAvailable, setAiAvailable] = useState(null);     // null = belum dicek
  const [aiReason, setAiReason] = useState("");
  const [contextHint, setContextHint] = useState("");
  const [expandMode, setExpandMode] = useState("casual");
  const [expandResult, setExpandResult] = useState(null);

  // === Computed ===
  const rawText = rawLetters.join("");
  const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).filter(Boolean).length : 0;

  // === Cek status AI saat mount ===
  useEffect(() => {
    checkAiStatus().then((status) => {
      setAiAvailable(status.available);
      if (status.reason) {
        setAiReason(status.reason);
      }
    });
  }, []);

  // === Tangani huruf terkunci dari kamera ===
  const handleLetterLocked = useCallback(
    (letter) => {
      setLastAddedLetter(letter);
      setRawLetters((prev) => [...prev, letter]);
      setAiResult(null);
      setExpandResult(null);

      sendTelemetry({
        sessionType: "narrative",
        targetLabel: letter,
        predictedLabel: letter,
        confidence: modelHook.telemetry.confidence,
        latencyMs: modelHook.telemetry.latencyMs,
        fps: modelHook.telemetry.fps,
        isSuccess: true,
      });
    },
    [modelHook.telemetry]
  );

  // === Kontrol teks manual ===
  const handleAddSpace = () => {
    setRawLetters((prev) => [...prev, " "]);
    setLastAddedLetter("_");
  };

  const handleDeleteLast = () => {
    setRawLetters((prev) => prev.slice(0, -1));
    setAiResult(null);
    setExpandResult(null);
  };

  const handleClear = () => {
    if (rawLetters.length === 0) return;
    if (window.confirm("Hapus seluruh isyarat dan hasil interpretasi?")) {
      setRawLetters([]);
      setLastAddedLetter("");
      setAiResult(null);
      setExpandResult(null);
      setAiError("");
    }
  };

  // === TTS ===
  const speakText = useCallback((text) => {
    if (!text?.trim()) return;
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find((v) => v.lang.includes("id"));
    if (idVoice) utterance.voice = idVoice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  // === Interpretasi AI ===
  const handleInterpret = async () => {
    if (rawLetters.filter((l) => l.trim()).length === 0) return;
    setIsInterpreting(true);
    setAiError("");
    setAiResult(null);
    setExpandResult(null);

    const result = await interpretSigns(rawLetters, contextHint);
    setIsInterpreting(false);

    if (result.success) {
      setAiResult(result);
    } else {
      setAiError(result.message || "Gagal menginterpretasikan isyarat.");
    }
  };

  // === Ekspansi variasi kalimat ===
  const handleExpand = async (sourceText) => {
    if (!sourceText?.trim()) return;
    setIsExpanding(true);
    setAiError("");
    setExpandResult(null);

    const result = await expandTextVariations(sourceText, expandMode);
    setIsExpanding(false);

    if (result.success) {
      setExpandResult(result);
    } else {
      setAiError(result.message || "Gagal mengekspansi teks.");
    }
  };

  // === Keyboard shortcuts ===
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.code === "Space") { e.preventDefault(); handleAddSpace(); }
      else if (e.code === "Backspace") { e.preventDefault(); handleDeleteLast(); }
      else if (e.code === "Enter") { e.preventDefault(); if (aiResult?.suggestion) speakText(aiResult.suggestion); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [aiResult, speakText]);

  // === Floating dock ===
  const dockItems = [
    { title: "Tambah Spasi [Space]", icon: CornerDownLeft, onClick: handleAddSpace },
    { title: "Hapus Huruf [Backspace]", icon: Delete, onClick: handleDeleteLast, disabled: rawLetters.length === 0 },
    {
      title: "Suarakan Interpretasi [Enter]", icon: Volume2,
      onClick: () => speakText(aiResult?.suggestion || rawText),
      active: isSpeaking,
      disabled: !rawText.trim(),
    },
    { title: "Bersihkan Semua", icon: RotateCcw, onClick: handleClear, disabled: rawLetters.length === 0 },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink pt-20 pb-28">
      {/* Header */}
      <div className="border-b-[3px] border-ink bg-paper-2 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {/* Status badge AI */}
              {aiAvailable === true && (
                <span className="tag tag-mint text-xs font-mono uppercase flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink inline-block" />
                  AI Aktif
                </span>
              )}
              {aiAvailable === false && (
                <span className="tag tag-coral text-xs font-mono uppercase flex items-center gap-1 font-bold">
                  <AlertTriangle className="w-3 h-3" /> AI Nonaktif
                </span>
              )}
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-ink tracking-tight">
              Asisten SIBI: <span className="highlight">Interpretasi Isyarat</span>
            </h1>
            <p className="font-sans text-xs sm:text-sm text-ink/70 font-medium mt-1">
              Eja kata lewat isyarat tangan di kamera, lalu biarkan Gemini AI memperbaiki ejaan dan membentuk kalimat Bahasa Indonesia yang natural.
            </p>
          </div>

          <button
            onClick={handleInterpret}
            disabled={rawLetters.filter((l) => l.trim()).length === 0 || isInterpreting || aiAvailable === false}
            className="btn btn-yellow text-xs font-mono py-3 px-6 flex items-center gap-2 shadow-[4px_4px_0_#111] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isInterpreting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Interpretasikan Isyarat</>
            )}
          </button>
        </div>
      </div>

      {/* Warning jika AI atau Server tidak tersedia */}
      {aiAvailable === false && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
          <div className="border-2 border-coral bg-coral/10 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" />
            <div className="text-sm font-sans">
              <span className="font-black text-ink font-mono block mb-1">
                {aiReason?.includes("Server tidak dapat dijangkau")
                  ? "Server Backend (Port 5000) Belum Dijalankan"
                  : "AI Belum Dikonfigurasi"}
              </span>
              <span className="text-ink/70">
                {aiReason?.includes("Server tidak dapat dijangkau") ? (
                  <>
                    Server Express belum aktif. Buka terminal baru dan jalankan{" "}
                    <code className="bg-paper-3 px-1.5 py-0.5 font-mono text-xs font-bold text-ink border border-ink/20">
                      npm run server
                    </code>{" "}
                    (atau <code className="bg-paper-3 px-1.5 py-0.5 font-mono text-xs font-bold text-ink border border-ink/20">npm run dev</code> untuk menjalankan server dan client sekaligus).
                  </>
                ) : (
                  <>
                    {aiReason || "Tambahkan GEMINI_API_KEY ke file server/.env lalu restart server Express."}
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* === Kolom Kiri: Papan + AI Output === */}
          <div className="lg:col-span-6 space-y-5">

            {/* Papan Isyarat Mentah */}
            <div className="card p-5 bg-paper nb-thick">
              <div className="flex items-center justify-between border-b-2 border-ink pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="tag tag-ink text-[10px]">ISYARAT MENTAH</span>
                  {lastAddedLetter && lastAddedLetter !== "_" && (
                    <span className="sticker sticker-coral text-[10px] px-1.5">+{lastAddedLetter}</span>
                  )}
                </div>
                <span className="font-mono text-xs font-bold text-ink/60">
                  {rawLetters.filter((l) => l.trim()).length} Huruf / {wordCount} Kata
                </span>
              </div>

              <div className="min-h-20 mb-4">
                {rawText ? (
                  <p className="text-2xl sm:text-3xl font-mono font-black text-ink leading-relaxed tracking-widest">
                    <DecryptedText text={rawText} />
                  </p>
                ) : (
                  <div className="p-4 bg-paper-2 border-2 border-dashed border-ink/30 text-ink/50 text-sm font-sans font-medium">
                    Belum ada isyarat. Arahkan tangan ke kamera di kanan, tahan gestur 1 detik untuk mengetik huruf.
                  </div>
                )}
              </div>

              {/* Tombol aksi baris teks */}
              <div className="flex flex-wrap gap-2 pt-3 border-t-2 border-ink">
                <button onClick={handleAddSpace} className="btn bg-paper-2 text-[11px] font-mono py-1.5 px-3">
                  + Spasi
                </button>
                <button onClick={handleDeleteLast} disabled={rawLetters.length === 0} className="btn bg-paper-2 text-[11px] font-mono py-1.5 px-3 disabled:opacity-40">
                  ← Hapus
                </button>
                <button onClick={handleClear} disabled={rawLetters.length === 0} className="btn bg-paper-2 text-[11px] font-mono py-1.5 px-3 disabled:opacity-40">
                  Bersihkan
                </button>
                <span className="ml-auto text-[10px] font-mono text-ink/40 self-center">
                  Space • Backspace
                </span>
              </div>
            </div>

            {/* Pengaturan Konteks AI */}
            <div className="card p-4 bg-paper-2 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-ink/15">
                <Sliders className="w-4 h-4 text-cobalt" />
                <span className="font-mono text-xs font-black text-ink">Pengaturan Interpretasi AI</span>
              </div>

              <div className="flex flex-wrap gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-mono font-bold text-ink/70 block text-[11px] uppercase tracking-wider">Konteks</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CONTEXT_HINTS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setContextHint(c.id)}
                        className={`btn text-[10px] font-mono py-1 px-2.5 ${contextHint === c.id ? "btn-cobalt" : "bg-paper hover:bg-paper-3"}`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono font-bold text-ink/70 block text-[11px] uppercase tracking-wider">Mode Ekspansi</label>
                  <div className="flex flex-wrap gap-1.5">
                    {EXPAND_MODES.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setExpandMode(m.id)}
                        title={m.desc}
                        className={`btn text-[10px] font-mono py-1 px-2.5 ${expandMode === m.id ? "btn-yellow" : "bg-paper hover:bg-paper-3"}`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Error banner */}
            {aiError && (
              <div className="border-2 border-coral bg-coral/10 p-3 flex items-center gap-2 text-sm font-mono font-bold text-coral">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {aiError}
              </div>
            )}

            {/* === Hasil Interpretasi Gemini === */}
            {(isInterpreting || aiResult) && (
              <div className="card p-5 bg-paper nb-thick space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-ink pb-3">
                  <Sparkles className="w-4 h-4 text-cobalt" />
                  <span className="tag tag-cobalt text-[10px]">INTERPRETASI GEMINI</span>
                  {isInterpreting && <Loader2 className="w-3.5 h-3.5 animate-spin text-ink/60 ml-auto" />}
                </div>

                {isInterpreting ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-3 text-ink/50">
                    <Loader2 className="w-8 h-8 animate-spin text-cobalt" />
                    <span className="text-xs font-mono">Gemini sedang menganalisis isyarat...</span>
                  </div>
                ) : aiResult && (
                  <div className="space-y-4">
                    {/* Koreksi Ejaan */}
                    {aiResult.corrected !== aiResult.input && (
                      <div className="p-3 bg-yellow/30 border border-yellow border-ink/20">
                        <span className="text-[10px] font-mono font-black uppercase text-ink/60 block mb-1">
                          Koreksi Ejaan
                        </span>
                        <span className="font-mono font-black text-sm text-ink">
                          {aiResult.input} → <span className="text-cobalt">{aiResult.corrected}</span>
                        </span>
                      </div>
                    )}

                    {/* Kalimat Utama */}
                    <div>
                      <span className="text-[10px] font-mono font-black uppercase text-ink/60 block mb-2">
                        Kalimat Lengkap
                      </span>
                      <p className="text-xl font-mono font-black text-ink leading-relaxed">
                        {aiResult.suggestion}
                      </p>
                    </div>

                    {/* Tombol aksi kalimat utama */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => speakText(aiResult.suggestion)}
                        className="btn btn-mint text-xs font-mono py-1.5 px-3 flex items-center gap-1.5"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        {isSpeaking ? "Membaca..." : "Suarakan"}
                      </button>
                      <button
                        onClick={() => handleExpand(aiResult.suggestion)}
                        disabled={isExpanding}
                        className="btn btn-cobalt text-xs font-mono py-1.5 px-3 flex items-center gap-1.5"
                      >
                        {isExpanding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                        {expandMode === "casual" ? "Variasi Santai" : expandMode === "formal" ? "Versi Formal" : "Jadikan Pertanyaan"}
                      </button>
                    </div>

                    {/* Penjelasan AI */}
                    {aiResult.explanation && (
                      <div className="text-xs font-sans text-ink/60 border-t border-ink/10 pt-3 flex items-start gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{aiResult.explanation}</span>
                      </div>
                    )}

                    {/* Alternatif Interpretasi */}
                    {aiResult.alternatives?.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[10px] font-mono font-black uppercase text-ink/60 block mb-2">
                          Alternatif Interpretasi
                        </span>
                        <div className="space-y-1.5">
                          {aiResult.alternatives.map((alt, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between gap-3 p-2.5 bg-paper-2 border border-ink/15 group"
                            >
                              <span className="text-sm font-mono text-ink/80">{alt}</span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => speakText(alt)}
                                  className="p-1 hover:text-cobalt transition-colors"
                                  title="Suarakan"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleExpand(alt)}
                                  className="p-1 hover:text-cobalt transition-colors"
                                  title="Ekspansi"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* === Hasil Ekspansi Variasi === */}
            {(isExpanding || expandResult) && (
              <div className="card p-5 bg-paper border-cobalt nb-thick space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-ink pb-3">
                  <Wand2 className="w-4 h-4 text-cobalt" />
                  <span className="tag tag-yellow text-[10px]">VARIASI KALIMAT</span>
                  {isExpanding && <Loader2 className="w-3.5 h-3.5 animate-spin text-ink/60 ml-auto" />}
                </div>

                {isExpanding ? (
                  <div className="flex flex-col items-center justify-center py-5 gap-2 text-ink/50">
                    <Loader2 className="w-6 h-6 animate-spin text-cobalt" />
                    <span className="text-xs font-mono">Membuat variasi kalimat...</span>
                  </div>
                ) : expandResult?.variations && (
                  <div className="space-y-2">
                    {expandResult.variations.map((v, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 p-3 bg-paper-2 border border-ink/15 group">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="font-mono font-black text-cobalt text-xs flex-shrink-0 mt-0.5">{i + 1}.</span>
                          <span className="text-sm font-mono text-ink">{v}</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={() => speakText(v)} className="p-1 hover:text-cobalt transition-colors" title="Suarakan">
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tombol Interpretasi ulang jika ada hasil */}
            {aiResult && !isInterpreting && (
              <button
                onClick={handleInterpret}
                className="btn bg-paper-2 text-xs font-mono py-2 px-4 flex items-center gap-2 w-full justify-center"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Interpretasikan Ulang
              </button>
            )}
          </div>

          {/* === Kolom Kanan: Webcam === */}
          <div className="lg:col-span-6 space-y-4">
            <WebcamCanvas
              modelHook={modelHook}
              onLetterLocked={handleLetterLocked}
              className="w-full"
            />

            <TelemetryBar
              fps={modelHook.telemetry.fps}
              latencyMs={modelHook.telemetry.latencyMs}
              confidence={modelHook.telemetry.confidence}
              predictedLetter={modelHook.telemetry.predictedLetter}
              isHolding={modelHook.telemetry.isHolding}
              isLocked={modelHook.telemetry.isLocked}
              isSimulationMode={modelHook.isSimulationMode}
            />

            {/* Panduan cara penggunaan */}
            <div className="card p-4 bg-paper-2 text-xs font-mono space-y-3">
              <div className="font-black text-ink uppercase tracking-wider text-[10px] pb-2 border-b border-ink/15">
                Cara Menggunakan
              </div>
              {[
                ["1", "Eja kata lewat isyarat tangan di dalam kotak panduan kamera", "text-cobalt"],
                ["2", "Tekan tombol 'Interpretasikan Isyarat' atau tunggu jeda otomatis", "text-yellow"],
                ["3", "Gemini AI akan koreksi ejaan dan ekspansi menjadi kalimat lengkap", "text-mint"],
                ["4", "Tekan 'Suarakan' untuk memutar pelafalan Bahasa Indonesia", "text-coral"],
              ].map(([num, text, color]) => (
                <div key={num} className="flex items-start gap-2.5">
                  <span className={`font-black ${color} flex-shrink-0`}>{num}.</span>
                  <span className="text-ink/70">{text}</span>
                </div>
              ))}
            </div>

            {/* Pintasan keyboard */}
            <div className="p-3 bg-paper-2 border border-ink/20 text-[11px] font-mono text-ink/60 flex flex-wrap items-center justify-between gap-2">
              <span>Space: Spasi • Backspace: Hapus • Enter: Suarakan</span>
              <span className="tag tag-mint text-[9px]">id-ID TTS</span>
            </div>
          </div>
        </div>
      </div>

      <FloatingDock items={dockItems} />
    </div>
  );
};

