import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Navbar } from "./components/layout/Navbar";
import { SmoothScroll } from "./components/layout/SmoothScroll";
import { useSibiModel } from "./hooks/useSibiModel";

import { HomePage } from "./pages/HomePage";
import { DictionaryPage } from "./pages/DictionaryPage";
import { PracticePage } from "./pages/PracticePage";
import { AiCompanionPage } from "./pages/AiCompanionPage";
import { QuizPage } from "./pages/QuizPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { PhotoRecognitionPage } from "./pages/PhotoRecognitionPage";
import { CustomCursor } from "./components/creative/CustomCursor";
import { KineticPreloader } from "./components/creative/KineticPreloader";
import { AjinVoiceAssistant } from "./components/chat/AjinVoiceAssistant";
import { AuthProvider } from "./context/AuthContext";

export function App() {
  // Model hook terpusat: MediaPipe HandLandmarker + EfficientNet-B0 ONNX
  const modelHook = useSibiModel({
    modelPath: "/model/effnet_b0_sibi.onnx",
    handLandmarkerPath: "/model/hand_landmarker.task",
    labelsPath: "/model/labels.json",
    confidenceThreshold: 65,
    holdDurationMs: 1000,
  });

  return (
    <Router>
      <AuthProvider>
        {/* Creative Kinetic Neobrutalism Preloader saat pertama buka */}
        <KineticPreloader />

        <SmoothScroll>
          <div className="flex flex-col min-h-screen bg-paper text-ink">
            {/* Custom Neobrutalist Pointer Cursor */}
            <CustomCursor />

            {/* Asisten Suara & Chatbot Global AJIN */}
            <AjinVoiceAssistant />

            {/* Navbar Global */}
            <Navbar isSimulationMode={modelHook.isSimulationMode} />

            {/* Konten Utama Berdasarkan Rute */}
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<HomePage isSimulationMode={modelHook.isSimulationMode} />} />
                <Route path="/kamus" element={<DictionaryPage />} />
                <Route path="/latihan" element={<PracticePage modelHook={modelHook} />} />
                <Route path="/narasi" element={<AiCompanionPage modelHook={modelHook} />} />
                <Route path="/kuis" element={<QuizPage modelHook={modelHook} />} />
                <Route path="/analitik" element={<AnalyticsPage />} />
                <Route path="/foto" element={<PhotoRecognitionPage />} />
                <Route path="/scan" element={<PhotoRecognitionPage />} />
              </Routes>
            </main>

            {/* Footer Neobrutalism Berenergi */}
            <footer className="border-t-[3px] border-ink bg-paper-2 py-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                  {/* Brand & Mission */}
                <div className="md:col-span-5 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 bg-yellow border-2 border-ink shadow-[2px_2px_0_#111] flex items-center justify-center font-mono font-black text-base text-ink">
                      A
                    </span>
                    <span className="font-display font-black text-2xl text-ink tracking-tight">AJIN</span>
                  </div>
                  <p className="font-sans text-xs text-ink/70 max-w-sm font-medium leading-relaxed">
                    Platform pembelajaran Sistem Isyarat Bahasa Indonesia (SIBI) 26 alfabet langsung lewat kamera di browser.
                  </p>
                </div>

                {/* Nav Links Grid */}
                <div className="md:col-span-7 flex flex-wrap gap-x-8 gap-y-4 md:justify-end items-center">
                  {[
                    { label: "Kamus 3D", path: "/kamus" },
                    { label: "Latihan Kamera", path: "/latihan" },
                    { label: "Kuis Eja", path: "/kuis" },
                    { label: "Jembatan Narasi", path: "/narasi" },
                    { label: "Pindai Foto", path: "/foto" },
                    { label: "Rapor Belajar", path: "/analitik" },
                  ].map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="font-mono text-xs font-bold text-ink hover:text-coral border-b-2 border-ink/20 hover:border-coral transition-colors pb-0.5"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Bottom Copyright */}
              <div className="mt-10 pt-6 border-t-2 border-ink/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-[11px] text-ink/50 font-bold">
                <div className="flex items-center gap-2">
                  <span>© 2026 AJIN</span>
                  <span>•</span>
                  <span>Sistem Isyarat Bahasa Indonesia (SIBI)</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </SmoothScroll>
      </AuthProvider>
    </Router>
  );
}

export default App;
