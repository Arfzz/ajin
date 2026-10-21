import { useState, useEffect, useCallback, useRef } from "react";
import { Volume2, Delete, RotateCcw, CornerDownLeft, Sparkles, Sliders, MessageSquare, Hand, Check } from "lucide-react";

import { WebcamCanvas } from "../components/vision/WebcamCanvas";
import { TelemetryBar } from "../components/vision/TelemetryBar";
import { DecryptedText } from "../components/reactbits/DecryptedText";
import { FloatingDock } from "../components/reactbits/FloatingDock";
import { sendTelemetry } from "../services/api";

const INDONESIAN_DICTIONARY = [
  "HALO", "HARI", "HARUS", "HATI",
  "SAYA", "SATU", "SAAT", "SUDAH",
  "KITA", "KAMU", "KATA", "KAMI",
  "BUKU", "BISA", "BAIK", "BARU",
  "AJIN", "ISYARAT", "BAHASA", "INDONESIA",
  "TEMAN", "TERIMA", "KASIH", "BELAJAR"
];

const QUICK_STARTERS = ["HALO", "SAYA", "TERIMA KASIH", "BISA", "BELAJAR", "KITA"];

export const NarrativePage = ({ modelHook }) => {
  const [narrativeText, setNarrativeText] = useState("");
  const [lastAddedLetter, setLastAddedLetter] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [holdSliderValue, setHoldSliderValue] = useState(1.5);
  const textEndRef = useRef(null);

  // Rekomendasi kata cepat berdasarkan kata terakhir yang sedang diketik
  const words = narrativeText.split(" ");
  const currentPartialWord = words[words.length - 1].toUpperCase();

  const wordSuggestions = currentPartialWord.length >= 2
    ? INDONESIAN_DICTIONARY.filter(
        (w) => w.startsWith(currentPartialWord) && w !== currentPartialWord
      ).slice(0, 4)
    : [];

  // Tangani saat huruf baru terkunci dari kamera
  const handleLetterLocked = useCallback(
    (letter) => {
      setLastAddedLetter(letter);
      setNarrativeText((prev) => prev + letter);

      // Catat telemetri
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

  // Fungsi Text-to-Speech (TTS id-ID)
  const speakNarrative = useCallback(() => {
    if (!narrativeText.trim()) return;

    if (!("speechSynthesis" in window)) {
      alert("Peramban Anda belum mendukung fitur sintesis suara Web Speech API.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(narrativeText);
    utterance.lang = "id-ID";
    utterance.rate = 0.95;

    // Cari suara bahasa Indonesia jika tersedia
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find((v) => v.lang.includes("id") || v.lang.includes("ID"));
    if (idVoice) utterance.voice = idVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [narrativeText]);

  // Tombol aksi teks
  const handleAddSpace = () => {
    setNarrativeText((prev) => (prev.endsWith(" ") ? prev : prev + " "));
  };

  const handleDeleteLast = () => {
    setNarrativeText((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (narrativeText && window.confirm("Hapus seluruh kalimat narasi?")) {
      setNarrativeText("");
      setLastAddedLetter("");
    }
  };

  const handleApplySuggestion = (word) => {
    const tokens = narrativeText.trimEnd().split(" ");
    tokens[tokens.length - 1] = word;
    setNarrativeText(tokens.join(" ") + " ");
  };

  const handleAddQuickStarter = (word) => {
    setNarrativeText((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${word} ` : `${word} `;
    });
  };

  // Pintasan Keyboard Fisik (Space, Backspace, Enter)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        handleAddSpace();
      } else if (e.code === "Backspace") {
        e.preventDefault();
        handleDeleteLast();
      } else if (e.code === "Enter") {
        e.preventDefault();
        speakNarrative();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [speakNarrative]);

  // Floating dock items
  const dockItems = [
    {
      title: "Tambah Spasi [Space]",
      icon: CornerDownLeft,
      onClick: handleAddSpace,
    },
    {
      title: "Hapus Huruf [Backspace]",
      icon: Delete,
      onClick: handleDeleteLast,
      disabled: narrativeText.length === 0,
    },
    {
      title: "Suarakan Narasi [Enter]",
      icon: Volume2,
      onClick: speakNarrative,
      active: isSpeaking,
      disabled: narrativeText.trim().length === 0,
    },
    {
      title: "Bersihkan Semua",
      icon: RotateCcw,
      onClick: handleClear,
      disabled: narrativeText.length === 0,
    },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink pt-20 pb-28">
      {/* Top Banner Header */}
      <div className="border-b-[3px] border-ink bg-paper-2 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="sticker sticker-cobalt px-2.5 py-0.5 text-xs font-mono uppercase rotated-label">
                🗣️ Isyarat ke Suara
              </span>
              <span className="sticker sticker-yellow px-2.5 py-0.5 text-xs font-mono uppercase">
                ⚡ Text-to-Speech id-ID
              </span>
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-ink tracking-tight">
              Studio Narasi <span className="highlight">Rangkai Kalimat</span>
            </h1>
            <p className="font-sans text-xs sm:text-sm text-ink/70 font-medium mt-1">
              Bentuk isyarat huruf demi huruf di kamera untuk merangkai kata, lalu tekan tombol Suara untuk membacanya otomatis!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={speakNarrative}
              disabled={!narrativeText.trim()}
              className="btn btn-yellow text-xs font-mono py-3 px-5 flex items-center gap-2 shadow-[4px_4px_0_#111] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Volume2 className="w-4 h-4" />
              <span>{isSpeaking ? "Sedang Bersuara..." : "Suarakan Teks (Enter)"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Kolom Kiri (6 Kolom): Papan Narasi */}
          <div className="lg:col-span-6 space-y-6">
            <div className="card p-6 bg-paper min-h-[22rem] flex flex-col justify-between nb-thick relative">
              <div>
                <div className="flex items-center justify-between border-b-2 border-ink pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="tag tag-yellow text-[10px]">
                      PAPAN CERITA & SUARA
                    </span>
                    {lastAddedLetter && (
                      <span className="sticker sticker-coral text-[10px] px-1.5 py-0.2">
                        +{lastAddedLetter}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs font-bold text-ink/60">
                    {narrativeText.length} Karakter ({words.filter(Boolean).length} Kata)
                  </span>
                </div>

                {/* Display Output Area */}
                <div className="min-h-32">
                  {narrativeText ? (
                    <p className="text-2xl sm:text-3xl font-mono font-black text-ink leading-relaxed tracking-wide">
                      <DecryptedText text={narrativeText} />
                    </p>
                  ) : (
                    <div className="p-4 bg-paper-2 border-2 border-dashed border-ink/30 text-ink/50 text-sm font-sans font-medium">
                      👋 Belum ada teks. Arahkan isyarat tanganmu ke kamera di sebelah kanan.
                      Tahan posisi tangan 1.5 detik untuk mengetikkan huruf ke papan ini!
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Helpers & Quick Words */}
              <div className="pt-4 border-t-2 border-ink">
                {/* Word Autocomplete Suggestions */}
                {wordSuggestions.length > 0 && (
                  <div className="mb-3">
                    <span className="text-[10px] font-mono font-bold uppercase text-ink/50 block mb-1.5">
                      Rekomendasi Lanjutan Kata:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {wordSuggestions.map((word) => (
                        <button
                          key={word}
                          onClick={() => handleApplySuggestion(word)}
                          className="btn btn-yellow text-xs font-mono py-1 px-2.5 shadow-[2px_2px_0_#111]"
                        >
                          + {word}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Word Starters */}
                <div className="mb-3">
                  <span className="text-[10px] font-mono font-bold uppercase text-ink/50 block mb-1.5">
                    Sisip Kata Cepat:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_STARTERS.map((starter) => (
                      <button
                        key={starter}
                        onClick={() => handleAddQuickStarter(starter)}
                        className="btn bg-paper-2 hover:bg-paper-3 text-[11px] font-mono py-1 px-2 border border-ink shadow-[1px_1px_0_#111]"
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Keyboard Shortcut Hints */}
                <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-ink/60 pt-2 border-t border-ink/15">
                  <span>Pintasan: Space (Spasi) • Backspace (Hapus) • Enter (Suara)</span>
                  {lastAddedLetter && (
                    <span className="font-bold text-coral">
                      Terakhir: [{lastAddedLetter}]
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Hold Duration Slider */}
            <div className="card p-4 bg-paper-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cobalt" />
                <span className="font-bold text-ink">Durasi Tahan Isyarat:</span>
                <span className="tag tag-yellow text-xs font-black">{holdSliderValue}s</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="3.0"
                step="0.1"
                value={holdSliderValue}
                onChange={(e) => setHoldSliderValue(parseFloat(e.target.value))}
                className="w-full sm:w-48 accent-ink"
              />
            </div>
          </div>

          {/* Kolom Kanan (6 Kolom): Webcam & HUD */}
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

            <div className="p-3 bg-paper-2 border border-ink text-xs font-mono text-ink/70 flex items-center justify-between">
              <span>Status Suara: {isSpeaking ? "🔊 Membaca Teks..." : "Siap Bersuara"}</span>
              <span className="tag tag-mint text-[10px]">Speech Engine id-ID</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Tactical Dock di Bawah Layar */}
      <FloatingDock items={dockItems} />
    </div>
  );
};
