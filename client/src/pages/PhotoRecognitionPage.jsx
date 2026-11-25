import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Upload,
  Camera,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Volume2,
  ArrowRight,
  Lightbulb,
  X,
  Layers,
  ChevronRight,
} from "lucide-react";
import { recognizeSignFromImage } from "../services/api";

export const PhotoRecognitionPage = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Mode kamera langsung untuk jepret foto
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Matikan stream kamera jika unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Mulai kamera webcam untuk jepret foto
  const startCamera = async () => {
    setErrorMessage(null);
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("[AJIN Photo] Gagal mengakses webcam:", err);
      setIsCameraActive(false);
      setErrorMessage("Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.");
    }
  };

  // Tangkap satu frame foto dari webcam (dikecilkan ke maks 640px agar proses AI cepat)
  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    let width = video.videoWidth || 640;
    let height = video.videoHeight || 480;
    const maxDim = 640;
    if (width > maxDim || height > maxDim) {
      if (width >= height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);
    const base64 = canvas.toDataURL("image/jpeg", 0.78);

    setSelectedImage(base64);
    setMimeType("image/jpeg");
    setAnalysisResult(null);
    setErrorMessage(null);

    // Hentikan stream kamera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Batalkan mode kamera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Kompresi otomatis gambar ke maksimal 640px (JPEG ~40-80 KB) agar cepat dipindai & aman dari timeout
  const compressDataUrl = (dataUrl, maxDimension = 640, quality = 0.78) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });

  // Tangani upload berkas dari disk
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Berkas harus berupa gambar (JPG, PNG, atau WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("Ukuran gambar maksimal adalah 10 MB.");
      return;
    }

    setErrorMessage(null);
    setAnalysisResult(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const compressed = await compressDataUrl(reader.result);
      setMimeType("image/jpeg");
      setSelectedImage(compressed);
    };
    reader.readAsDataURL(file);
  };

  // Jalankan analisis foto ke backend Gemini
  const handleAnalyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const res = await recognizeSignFromImage(selectedImage, mimeType);
      if (res && res.success && res.result) {
        setAnalysisResult(res.result);
      } else {
        setErrorMessage(res.message || "Gagal mengenali isyarat dari foto.");
      }
    } catch (err) {
      setErrorMessage("Terjadi gangguan koneksi ke server AI.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Pelafalan suara huruf
  const handleSpeak = (letter) => {
    try {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(`Huruf ${letter}`);
        utterance.lang = "id-ID";
        utterance.rate = 0.95;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      setIsSpeaking(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink pt-20 pb-20">
      {/* Top Banner Header */}
      <div className="border-b-[3px] border-ink bg-paper-2 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-ink tracking-tight">
              Pindai Foto <span className="highlight">Bahasa Isyarat</span>
            </h1>
            <p className="font-sans text-xs sm:text-sm text-ink/70 font-medium mt-1 max-w-2xl">
              Unggah foto gestur tangan atau potret langsung dari webcam. Model AI multimodal akan mengidentifikasi alfabet Sistem Isyarat Bahasa Indonesia (SIBI) dan memberikan evaluasi posisi jari Anda.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/latihan"
              className="btn btn-paper text-xs font-mono py-2.5 px-4 shadow-[3px_3px_0_#111] hover:bg-yellow flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Mode Kamera Live</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Kolom Kiri (6 Kolom): Area Unggah / Ambil Foto */}
          <div className="lg:col-span-6 space-y-6">
            <div className="card p-6 bg-paper border-[3px] border-ink shadow-[6px_6px_0_#111]">
              <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-ink">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-yellow border-[1.5px] border-ink rounded-full" />
                  <h3 className="font-mono text-xs font-black uppercase tracking-wider text-ink">
                    Sumber Foto Tangan
                  </h3>
                </div>
                {selectedImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setAnalysisResult(null);
                      setErrorMessage(null);
                    }}
                    className="text-xs font-mono font-bold text-coral hover:underline flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reset
                  </button>
                )}
              </div>

              {/* Mode 1: Kamera Aktif untuk Snapshot */}
              {isCameraActive ? (
                <div className="space-y-4">
                  <div className="relative border-[2.5px] border-ink bg-black overflow-hidden shadow-[4px_4px_0_#111]">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-72 object-cover mirror-mode"
                    />
                    <div className="absolute top-3 left-3 bg-paper border border-ink px-2 py-0.5 text-[10px] font-mono font-bold text-ink">
                      Webcam Aktif
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={captureSnapshot}
                      className="btn btn-coral flex-1 text-xs font-mono font-bold py-3 shadow-[3px_3px_0_#111] flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Jepret Foto Sekarang</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="btn bg-paper-2 text-ink border-[2px] border-ink text-xs font-mono font-bold py-3 px-4 shadow-[2px_2px_0_#111]"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : selectedImage ? (
                /* Mode 2: Foto Sudah Dipilih / Diambil */
                <div className="space-y-4">
                  <div className="relative border-[2.5px] border-ink bg-paper-2 p-2 shadow-[4px_4px_0_#111] text-center">
                    <img
                      src={selectedImage}
                      alt="Pratinjau Gestur SIBI"
                      className="w-full max-h-80 object-contain mx-auto border border-ink"
                    />
                    <span className="sticker sticker-mint text-[10px] font-mono absolute top-4 right-4 shadow-[2px_2px_0_#111]">
                      Foto Siap Analisis
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={handleAnalyzeImage}
                      disabled={isAnalyzing}
                      className="btn btn-coral flex-1 text-xs font-mono font-bold uppercase tracking-wider py-3.5 shadow-[4px_4px_0_#111] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>AI Sedang Menganalisis...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Identifikasi Huruf SIBI</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn bg-paper text-ink border-[2px] border-ink text-xs font-mono font-bold py-3 px-4 shadow-[2px_2px_0_#111] hover:bg-yellow transition-colors"
                    >
                      Ganti Foto
                    </button>
                  </div>
                </div>
              ) : (
                /* Mode 3: Dropzone Unggah / Pilih Berkas */
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-[2.5px] border-dashed border-ink p-8 sm:p-10 text-center bg-paper-2 hover:bg-yellow/10 transition-colors cursor-pointer group shadow-[3px_3px_0_#111]"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-14 h-14 bg-yellow border-2 border-ink shadow-[2px_2px_0_#111] flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                      <Upload className="w-7 h-7 text-ink" />
                    </div>
                    <p className="font-display font-black text-base text-ink mb-1">
                      Klik untuk Pilih Foto Tangan SIBI
                    </p>
                    <p className="font-sans text-xs text-ink/60 max-w-xs mx-auto">
                      Format didukung: JPG, PNG, atau WebP (maksimal 10 MB).
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-[2px] bg-ink/15 flex-1" />
                    <span className="font-mono text-xs font-bold uppercase text-ink/40">atau</span>
                    <div className="h-[2px] bg-ink/15 flex-1" />
                  </div>

                  <button
                    type="button"
                    onClick={startCamera}
                    className="btn btn-yellow w-full text-xs font-mono font-bold py-3 flex items-center justify-center gap-2 shadow-[3px_3px_0_#111]"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Jepret Langsung dari Kamera Webcam</span>
                  </button>
                </div>
              )}

              {/* Pesan Galat jika ada */}
              {errorMessage && (
                <div className="mt-4 p-3 bg-coral text-white border-2 border-ink shadow-[3px_3px_0_#111] flex items-start gap-2.5 text-xs font-mono font-bold animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{errorMessage}</p>
                </div>
              )}
            </div>

            {/* Tips Pengambilan Foto yang Optimal */}
            <div className="p-4 bg-yellow/20 border-2 border-ink shadow-[3px_3px_0_#111] flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-coral shrink-0 mt-0.5" />
              <div className="text-xs text-ink space-y-1">
                <p className="font-mono font-bold uppercase tracking-wider">
                  Tips Hasil Analisis Maksimal:
                </p>
                <p className="text-ink/80 leading-relaxed font-medium">
                  Pastikan telapak tangan dan kelima jari berada dalam fokus yang tajam, tidak blur karena gerakan, dan memiliki pencahayaan cukup dengan latar belakang yang tidak terlalu ramai.
                </p>
              </div>
            </div>
          </div>

          {/* Kolom Kanan (6 Kolom): Hasil Analisis AI */}
          <div className="lg:col-span-6 space-y-6">
            {analysisResult ? (
              <div className="card p-6 bg-paper border-[3px] border-ink shadow-[6px_6px_0_#111] animate-in fade-in slide-in-from-bottom-2 space-y-5">
                {/* Header Hasil */}
                <div className="flex items-center justify-between pb-3 border-b-2 border-ink">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-mint" />
                    <span className="font-mono text-xs font-black uppercase tracking-wider text-ink">
                      Hasil Analisis:
                    </span>
                  </div>
                  <span className="tag tag-mint text-[10px] font-bold">
                    Tingkat Keyakinan: {analysisResult.confidence}%
                  </span>
                </div>

                {analysisResult.isSign ? (
                  <>
                    {/* Kartu Huruf Utama */}
                    <div className="bg-paper-2 border-[2.5px] border-ink p-5 shadow-[3px_3px_0_#111] flex items-center justify-between gap-4">
                      <div className="flex items-baseline gap-3">
                        <span className="font-display font-black text-7xl sm:text-8xl text-ink leading-none tracking-tight">
                          {analysisResult.letter}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-ink/60 font-bold uppercase">
                            Huruf SIBI Terdeteksi
                          </span>
                          <span className="tag tag-yellow text-[9px] font-bold uppercase w-fit mt-1">
                            {analysisResult.gestureType === "dynamic" ? "Gestur Dinamis" : "Gestur Statis"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSpeak(analysisResult.letter)}
                        className={`btn border-[2px] border-ink p-3 shadow-[2px_2px_0_#111] flex flex-col items-center justify-center gap-1 transition-all ${isSpeaking ? "bg-coral text-white" : "bg-yellow hover:bg-yellow-dark text-ink"
                          }`}
                        title="Dengarkan pelafalan huruf"
                        aria-label="Dengarkan pelafalan huruf"
                      >
                        <Volume2 className="w-5 h-5" />
                        <span className="font-mono text-[9px] font-black uppercase">
                          {isSpeaking ? "Bunyi..." : "Dengar"}
                        </span>
                      </button>
                    </div>

                    {/* Rincian Posisi Jemari */}
                    <div className="space-y-1.5">
                      <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-ink/70">
                        Deskripsi Posisi Jari:
                      </h4>
                      <p className="font-sans text-xs sm:text-sm font-semibold text-ink p-3 bg-paper border-[2px] border-ink/40 shadow-[2px_2px_0_#111] leading-relaxed">
                        {analysisResult.description}
                      </p>
                    </div>

                    {/* Masukan Ketepatan (Feedback) */}
                    <div className="space-y-1.5">
                      <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-ink/70">
                        Umpan Balik Akurasi:
                      </h4>
                      <div className="p-3 bg-mint/20 border-[2px] border-ink shadow-[2px_2px_0_#111] flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-mint shrink-0 mt-0.5" />
                        <p className="font-sans text-xs sm:text-sm font-bold text-ink leading-relaxed">
                          {analysisResult.feedback}
                        </p>
                      </div>
                    </div>

                    {/* Huruf Mirip / Alternatif jika ada */}
                    {analysisResult.alternatives && analysisResult.alternatives.length > 0 && (
                      <div className="pt-2 border-t border-ink/15">
                        <span className="font-mono text-[10px] font-bold text-ink/60 uppercase block mb-1.5">
                          Kemungkinan Huruf Serupa:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {analysisResult.alternatives.map((alt) => (
                            <Link
                              key={alt}
                              to={`/latihan?letter=${alt}`}
                              className="px-2.5 py-1 bg-paper border border-ink text-xs font-mono font-bold text-ink hover:bg-yellow shadow-[1px_1px_0_#111] transition-colors"
                            >
                              Huruf {alt}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tombol Latihan Langsung */}
                    <Link
                      to={`/latihan?letter=${analysisResult.letter}`}
                      className="btn btn-coral w-full py-3.5 text-xs font-mono font-black uppercase tracking-wider shadow-[4px_4px_0_#111] hover:shadow-[2px_2px_0_#111] flex items-center justify-center gap-2 mt-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Latih Huruf &ldquo;{analysisResult.letter}&rdquo; di Depan Webcam</span>
                    </Link>
                  </>
                ) : (
                  /* Jika bukan gestur SIBI */
                  <div className="p-6 bg-paper-2 border-[2px] border-ink text-center space-y-3">
                    <AlertCircle className="w-10 h-10 text-coral mx-auto" />
                    <p className="font-display font-black text-base text-ink">
                      Gestur SIBI Tidak Terdeteksi
                    </p>
                    <p className="font-sans text-xs text-ink/70 max-w-sm mx-auto">
                      {analysisResult.feedback || "Foto tidak menampilkan bentuk tangan alfabet SIBI yang jelas. Silakan coba unggah foto dengan sudut dan pencahayaan lain."}
                    </p>
                  </div>
                )}
              </div>
            ) : isAnalyzing ? (
              /* Loading State */
              <div className="card p-12 bg-paper border-[3px] border-ink shadow-[6px_6px_0_#111] text-center space-y-4">
                <div className="w-16 h-16 bg-yellow border-2 border-ink shadow-[3px_3px_0_#111] flex items-center justify-center mx-auto animate-bounce">
                  <Sparkles className="w-8 h-8 text-ink" />
                </div>
                <h3 className="font-display font-black text-xl text-ink">
                  Menganalisis Gestur Tangan...
                </h3>
                <p className="font-sans text-xs text-ink/70 max-w-xs mx-auto">
                  Model AI multimodal sedang memeriksa orientasi jari, bentuk telapak, dan mencocokkannya dengan kaidah alfabet SIBI resmi.
                </p>
              </div>
            ) : (
              /* Placeholder Awal saat belum ada foto */
              <div className="card p-10 bg-paper border-[3px] border-ink shadow-[6px_6px_0_#111] text-center space-y-4">
                <div className="w-16 h-16 bg-paper-2 border-2 border-ink shadow-[3px_3px_0_#111] flex items-center justify-center mx-auto">
                  <ImageIcon className="w-8 h-8 text-ink/40" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-ink mb-1">
                    Panel Hasil Deteksi Foto
                  </h3>
                  <p className="font-sans text-xs text-ink/60 max-w-xs mx-auto leading-relaxed">
                    Setelah Anda mengunggah atau menjepret foto di panel sebelah kiri, hasil identifikasi huruf SIBI dan analisis posisi jari akan muncul di sini.
                  </p>
                </div>
                <div className="pt-4 border-t border-ink/15 flex items-center justify-center gap-2 text-xs font-mono font-bold text-ink/60">
                  <span>Ditenagai oleh Google Gemini Multimodal</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

