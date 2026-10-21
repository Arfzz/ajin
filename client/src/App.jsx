import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Navbar } from "./components/layout/Navbar";
import { SmoothScroll } from "./components/layout/SmoothScroll";
import { useSibiModel } from "./hooks/useSibiModel";

import { HomePage } from "./pages/HomePage";
import { DictionaryPage } from "./pages/DictionaryPage";
import { PracticePage } from "./pages/PracticePage";
import { NarrativePage } from "./pages/NarrativePage";
import { QuizPage } from "./pages/QuizPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { CustomCursor } from "./components/creative/CustomCursor";

export function App() {
  // Model hook terpusat untuk efisiensi WebGL & cache memori
  const modelHook = useSibiModel({
    modelPath: "/model/model.json",
    labelsPath: "/model/labels.json",
    imgSize: 224,
    defaultChannelMode: "rgb",
    confidenceThreshold: 75,
    holdDurationMs: 1500,
  });

  return (
    <Router>
      <SmoothScroll>
        <div className="flex flex-col min-h-screen bg-paper text-ink">
          {/* Custom Neobrutalist Pointer Cursor */}
          <CustomCursor />

          {/* Navbar Global */}
          <Navbar isSimulationMode={modelHook.isSimulationMode} />

          {/* Konten Utama Berdasarkan Rute */}
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<HomePage isSimulationMode={modelHook.isSimulationMode} />} />
              <Route path="/kamus" element={<DictionaryPage />} />
              <Route path="/latihan" element={<PracticePage modelHook={modelHook} />} />
              <Route path="/narasi" element={<NarrativePage modelHook={modelHook} />} />
              <Route path="/kuis" element={<QuizPage modelHook={modelHook} />} />
              <Route path="/analitik" element={<AnalyticsPage />} />
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
                    <span className="sticker sticker-coral text-[10px] px-2 py-0.2 font-mono uppercase rotated-label">
                      B2C Learning
                    </span>
                  </div>
                  <p className="font-sans text-xs text-ink/70 max-w-sm font-medium leading-relaxed">
                    Aplikasi interaktif belajar bahasa isyarat SIBI berbasis kecerdasan buatan dan visi komputer langsung dari peramban. Belajar isyarat jadi menyenangkan dan mudah diakses siapa saja!
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="tag tag-yellow text-[9px]">26 Huruf SIBI</span>
                    <span className="tag tag-mint text-[9px]">Deteksi Real-Time</span>
                    <span className="tag tag-cobalt text-[9px]">Text-to-Speech</span>
                  </div>
                </div>

                {/* Nav Links Grid */}
                <div className="md:col-span-7 flex flex-wrap gap-x-8 gap-y-4 md:justify-end items-center">
                  {[
                    { label: "Kamus Isyarat (A–Z)", path: "/kamus" },
                    { label: "Latihan Kamera", path: "/latihan" },
                    { label: "Studio Narasi", path: "/narasi" },
                    { label: "Kuis Eja Cepat", path: "/kuis" },
                    { label: "Dashboard Progres", path: "/analitik" },
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

              {/* Bottom Copyright & Tech Badges */}
              <div className="mt-10 pt-6 border-t-2 border-ink/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-[11px] text-ink/50 font-bold">
                <div className="flex items-center gap-2">
                  <span>© 2026 AJIN</span>
                  <span>•</span>
                  <span>Sistem Isyarat Bahasa Indonesia (SIBI)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-mint" />
                  <span>TensorFlow.js WebGL Acceleration</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </SmoothScroll>
    </Router>
  );
}

export default App;
