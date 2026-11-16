import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  X,
  MessageSquare,
  Sparkles,
  ArrowRight,
  BookOpen,
  Camera,
  Award,
  RotateCcw,
} from "lucide-react";
import { sendAiChatMessage } from "../../services/api";

const QUICK_PROMPTS = [
  "Cara isyarat huruf B?",
  "Latihan huruf L",
  "Buka kamus SIBI",
  "Pindai foto tangan",
];

export const AjinVoiceAssistant = () => {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome-1",
      sender: "assistant",
      text: "Halo! Saya asisten pintar AJIN untuk Sistem Isyarat Bahasa Indonesia (SIBI). Kamu bisa mengetik pertanyaan atau menekan ikon mikrofon untuk berbicara langsung.",
      targetLetter: null,
      suggestedAction: null,
      tips: "Coba tanyakan 'Bagaimana cara isyarat huruf B?' atau katakan 'Latihan huruf L'.",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Periksa dukungan SpeechRecognition di browser
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "id-ID";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputValue(transcript);
          // Kirim otomatis pesan dari suara pengguna
          handleSendMessage(transcript);
        }
      };

      recognition.onerror = (err) => {
        console.warn("[AJIN Voice] Speech recognition error:", err.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Auto-scroll ke pesan terbaru saat bertambah
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Fungsi sintesis suara (Text-to-Speech)
  const speakText = (text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("[AJIN TTS] Gagal memutar suara:", err);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Toggle mikrofon untuk input suara
  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      alert("Browser kamu belum mendukung Web Speech API. Silakan gunakan Chrome, Edge, atau ketik langsung.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      stopSpeaking();
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn("[AJIN Voice] Gagal memulai recognition:", err);
      }
    }
  };

  // Kirim pesan percakapan
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    stopSpeaking();

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue("");
    setIsLoading(true);

    // Ambil maksimal 4 pesan terakhir untuk context history
    const historyPayload = newMessages
      .filter((m) => m.sender === "user" || m.sender === "assistant")
      .slice(-4)
      .map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        text: m.text,
      }));

    const response = await sendAiChatMessage(text, historyPayload);

    if (response && response.success) {
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        text: response.reply,
        targetLetter: response.targetLetter,
        suggestedAction: response.suggestedAction,
        tips: response.tips,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (ttsEnabled) {
        speakText(response.reply);
      }
    } else {
      const errorMessage = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        text: response?.reply || "Maaf, terjadi kesalahan saat menghubungi asisten AI AJIN.",
        targetLetter: null,
        suggestedAction: null,
        tips: "Silakan periksa koneksi internet atau coba kembali beberapa saat lagi.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  // Navigasi aksi cepat berdasarkan rekomendasi AI
  const handleActionClick = (action, letter) => {
    if (letter) {
      navigate(`/latihan?letter=${letter}`);
      return;
    }

    if (action === "practice") {
      navigate("/latihan");
    } else if (action === "dictionary") {
      navigate("/kamus");
    } else if (action === "photo") {
      navigate("/foto");
    } else if (action === "quiz") {
      navigate("/kuis");
    }
  };

  return (
    <>
      {/* Tombol Mengambang (Collapsed state) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-yellow text-ink border-[2.5px] border-ink shadow-[4px_4px_0_#111] hover:shadow-[2px_2px_0_#111] hover:translate-x-[2px] hover:translate-y-[2px] transition-all px-4 py-3 font-display font-black flex items-center gap-2.5 rounded-none group"
          aria-label="Buka Asisten Suara AJIN"
        >
          <div className="relative">
            <span className="w-8 h-8 bg-ink text-yellow border border-ink flex items-center justify-center font-mono font-black text-sm">
              AI
            </span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-coral rounded-full border border-ink animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-coral rounded-full border border-ink" />
          </div>
          <div className="text-left leading-tight hidden sm:block">
            <div className="text-xs uppercase tracking-wider font-mono">Tanya AJIN</div>
            <div className="text-[10px] text-ink/75 font-sans font-bold">Voice Assistant</div>
          </div>
          <Mic className="w-4 h-4 text-ink ml-1 group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* Jendela Percakapan Neobrutalist (Expanded state) */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] max-h-[86vh] bg-paper border-[3px] border-ink shadow-[8px_8px_0_#111] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header Titlebar */}
          <div className="bg-yellow border-b-[3px] border-ink px-3 py-2.5 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 items-center">
                <span className="w-3 h-3 bg-coral border border-ink inline-block" />
                <span className="w-3 h-3 bg-mint border border-ink inline-block" />
                <span className="w-3 h-3 bg-paper border border-ink inline-block" />
              </div>
              <span className="font-display font-black text-xs text-ink tracking-wide ml-1">
                AJIN VOICE // SIBI AI
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Toggle Audio TTS */}
              <button
                onClick={() => {
                  if (isSpeaking) stopSpeaking();
                  setTtsEnabled(!ttsEnabled);
                }}
                className={`p-1 border border-ink font-mono text-[10px] transition-colors ${
                  ttsEnabled ? "bg-mint text-ink" : "bg-paper text-ink/60"
                }`}
                title={ttsEnabled ? "Suara Aktif (Klik untuk Senyapkan)" : "Suara Disenyapkan (Klik untuk Aktifkan)"}
              >
                {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              {/* Tombol Tutup */}
              <button
                onClick={() => {
                  stopSpeaking();
                  if (isListening && recognitionRef.current) {
                    recognitionRef.current.stop();
                  }
                  setIsOpen(false);
                }}
                className="p-1 bg-coral text-white border border-ink hover:bg-coral/80 transition-colors font-mono font-bold"
                aria-label="Tutup asisten"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Area Pesan Percakapan */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-paper">
            {messages.map((msg) => {
              const isAssistant = msg.sender === "assistant";

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isAssistant ? "items-start" : "items-end"}`}
                >
                  <div
                    className={`max-w-[88%] p-3 text-xs leading-relaxed border-[2px] border-ink ${
                      isAssistant
                        ? "bg-white text-ink shadow-[2px_2px_0_#111]"
                        : "bg-ink text-paper shadow-[2px_2px_0_#coral]"
                    }`}
                  >
                    {/* Header kecil untuk pesan asisten */}
                    {isAssistant && (
                      <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-ink/20">
                        <span className="font-mono text-[10px] uppercase font-bold text-ink/75 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-yellow fill-yellow" />
                          AJIN Asisten
                        </span>
                        <button
                          onClick={() => speakText(msg.text)}
                          className="text-[10px] text-ink/60 hover:text-ink flex items-center gap-1 font-mono underline"
                          title="Putar suara"
                        >
                          <Volume2 className="w-3 h-3" />
                          Putar
                        </button>
                      </div>
                    )}

                    {/* Isi Pesan */}
                    <p className="font-sans font-medium whitespace-pre-wrap">{msg.text}</p>

                    {/* Tips Tambahan jika ada */}
                    {msg.tips && (
                      <div className="mt-2.5 p-2 bg-yellow/20 border border-ink/40 text-[11px] text-ink font-mono">
                        <span className="font-bold">Tips:</span> {msg.tips}
                      </div>
                    )}

                    {/* Action Card Relevan jika AI menyarankan latihan/kamus/foto */}
                    {(msg.targetLetter || msg.suggestedAction) && (
                      <div className="mt-3 pt-2 border-t border-dashed border-ink/30">
                        {msg.targetLetter ? (
                          <button
                            onClick={() => handleActionClick("practice", msg.targetLetter)}
                            className="w-full flex items-center justify-between gap-2 p-2 bg-mint text-ink font-bold border border-ink shadow-[2px_2px_0_#111] hover:translate-x-[1px] hover:translate-y-[1px] text-[11px] font-mono transition-transform"
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="w-5 h-5 bg-ink text-white flex items-center justify-center font-black text-xs">
                                {msg.targetLetter}
                              </span>
                              Latih Huruf {msg.targetLetter} di Kamera
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : msg.suggestedAction === "dictionary" ? (
                          <button
                            onClick={() => handleActionClick("dictionary")}
                            className="w-full flex items-center justify-between gap-2 p-2 bg-yellow text-ink font-bold border border-ink shadow-[2px_2px_0_#111] hover:translate-x-[1px] hover:translate-y-[1px] text-[11px] font-mono transition-transform"
                          >
                            <span className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5" />
                              Buka Kamus 26 Huruf SIBI
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : msg.suggestedAction === "photo" ? (
                          <button
                            onClick={() => handleActionClick("photo")}
                            className="w-full flex items-center justify-between gap-2 p-2 bg-coral text-white font-bold border border-ink shadow-[2px_2px_0_#111] hover:translate-x-[1px] hover:translate-y-[1px] text-[11px] font-mono transition-transform"
                          >
                            <span className="flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5" />
                              Pindai Foto Gestur Tangan
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : msg.suggestedAction === "quiz" ? (
                          <button
                            onClick={() => handleActionClick("quiz")}
                            className="w-full flex items-center justify-between gap-2 p-2 bg-yellow text-ink font-bold border border-ink shadow-[2px_2px_0_#111] hover:translate-x-[1px] hover:translate-y-[1px] text-[11px] font-mono transition-transform"
                          >
                            <span className="flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5" />
                              Mulai Kuis Tebak Isyarat
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Indikator Mengetik / Memproses */}
            {isLoading && (
              <div className="flex items-center gap-2 p-2.5 bg-white border border-ink shadow-[2px_2px_0_#111] w-fit">
                <span className="w-2 h-2 bg-ink animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-ink animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-ink animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="font-mono text-[10px] text-ink font-bold ml-1">AJIN sedang berpikir...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chip Bar */}
          <div className="bg-paper-2 border-t border-ink/30 px-3 py-1.5 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
            <span className="font-mono text-[9px] text-ink/60 uppercase font-bold shrink-0">
              Contoh:
            </span>
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="shrink-0 bg-white hover:bg-yellow border border-ink px-2 py-0.5 text-[10px] font-mono font-semibold text-ink transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar & Mic Trigger */}
          <div className="bg-paper border-t-[3px] border-ink p-2.5 space-y-1.5">
            {/* Status saat mikrofon sedang aktif */}
            {isListening && (
              <div className="flex items-center justify-between bg-coral/20 border border-coral px-2 py-1 text-[11px] font-mono text-ink">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-coral rounded-full animate-ping" />
                  <span className="font-bold">Mendengarkan suara kamu...</span>
                </div>
                <button
                  onClick={toggleListening}
                  className="text-[10px] underline font-bold hover:text-coral"
                >
                  Selesai
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-1.5"
            >
              {/* Tombol Mikrofon */}
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 border-[2px] border-ink transition-all ${
                  isListening
                    ? "bg-coral text-white animate-pulse"
                    : "bg-paper-2 text-ink hover:bg-yellow"
                }`}
                title={speechSupported ? "Bicara dengan mikrofon" : "Speech recognition tidak didukung di browser ini"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isListening ? "Mendengarkan suara..." : "Ketik pertanyaan tentang SIBI..."}
                disabled={isLoading}
                className="flex-1 bg-white border-[2px] border-ink px-2.5 py-1.5 text-xs font-mono text-ink focus:outline-none focus:bg-yellow/10"
              />

              {/* Tombol Kirim */}
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="p-2 bg-yellow text-ink border-[2px] border-ink shadow-[2px_2px_0_#111] hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-50 disabled:pointer-events-none transition-all"
                title="Kirim pesan"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

