import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Download,
  BarChart3,
  Zap,
  CheckCircle,
  RefreshCw,
  ArrowUpRight,
  Trophy,
  User,
  ShieldCheck,
  LogIn,
} from "lucide-react";
import { fetchTelemetrySummary, getCurrentUserIdentifier } from "../services/api";
import { SIBI_ALPHABETS_FALLBACK } from "../services/fallbackData";
import { useAuth } from "../context/AuthContext";

export const AnalyticsPage = () => {
  const { user, isAuthenticated, loginWithGoogle } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewScope, setViewScope] = useState("user"); // "user" atau "global"

  const loadData = async (scope = viewScope) => {
    setIsLoading(true);
    try {
      const activeId = scope === "global" ? "all" : getCurrentUserIdentifier();
      const result = await fetchTelemetrySummary(activeId);
      if (result && result.summary) {
        setData(result.summary);
      } else {
        setData({
          totalFrames: 0,
          avgLatencyMs: 0,
          avgFps: 0,
          avgConfidence: 0,
          successRate: 0,
          classMetrics: [],
        });
      }
    } catch (err) {
      console.warn("[AJIN Analytics] Gagal memuat data:", err);
      setData({
        totalFrames: 0,
        avgLatencyMs: 0,
        avgFps: 0,
        avgConfidence: 0,
        successRate: 0,
        classMetrics: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(viewScope);
  }, [viewScope, user]);

  // Defensif: pastikan classMetrics selalu bertipe Array
  const classMetrics = Array.isArray(data?.classMetrics) ? data.classMetrics : [];
  const testedLettersCount = classMetrics.length;
  const masteredLettersCount = classMetrics.filter((c) => (c.accuracyPct || 0) >= 80).length;

  // Ekspor Data ke File CSV
  const handleExportCSV = () => {
    if (classMetrics.length === 0) {
      alert("Belum ada data pengujian latihan yang tersedia untuk diekspor.");
      return;
    }

    const headers = ["Huruf SIBI", "Jumlah Latihan", "Akurasi Sukses (%)", "Keyakinan Rata-Rata (%)"];
    const rows = classMetrics.map((item) => [
      item.letter,
      item.testsCount,
      item.accuracyPct,
      item.avgConfidencePct,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `ajin_rapor_progres_belajar_${viewScope}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-paper text-ink pt-20 pb-20">
      {/* Top Banner Header */}
      <div className="border-b-[3px] border-ink bg-paper-2 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-ink tracking-tight">
              Dashboard Progres &amp; <span className="highlight">Kemahiran SIBI</span>
            </h1>
            <p className="font-sans text-xs sm:text-sm text-ink/70 font-medium mt-1">
              Pantau total sesi latihan, evaluasi akurasi per alfabet Sistem Isyarat Bahasa Indonesia (SIBI), dan unduh data performa belajar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Scope Filter Switcher */}
            <div className="flex items-center border-[2px] border-ink bg-paper p-0.5 shadow-[2px_2px_0_#111]">
              <button
                type="button"
                onClick={() => setViewScope("user")}
                className={`px-3 py-1 text-xs font-mono font-bold transition-all ${
                  viewScope === "user"
                    ? "bg-yellow text-ink shadow-[1px_1px_0_#111]"
                    : "text-ink/60 hover:text-ink"
                }`}
              >
                Sesi Saya
              </button>
              <button
                type="button"
                onClick={() => setViewScope("global")}
                className={`px-3 py-1 text-xs font-mono font-bold transition-all ${
                  viewScope === "global"
                    ? "bg-yellow text-ink shadow-[1px_1px_0_#111]"
                    : "text-ink/60 hover:text-ink"
                }`}
              >
                Data Global
              </button>
            </div>

            <button
              onClick={() => loadData(viewScope)}
              className="p-2.5 border-2 border-ink bg-paper hover:bg-yellow shadow-[2px_2px_0_#111] transition-all"
              title="Perbarui Data"
              aria-label="Perbarui data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={handleExportCSV}
              className="btn btn-yellow text-xs font-mono py-2.5 px-4 flex items-center gap-2 shadow-[3px_3px_0_#111]"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Rapor (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Banner Status Sesi Pengguna */}
        <div className="card p-4 sm:p-5 bg-paper border-[2.5px] border-ink shadow-[4px_4px_0_#111] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {isAuthenticated && user?.picture ? (
              <img
                src={user.picture}
                alt={user.name || "Pengguna"}
                className="w-11 h-11 border-2 border-ink object-cover flex-shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-11 h-11 bg-yellow border-2 border-ink flex items-center justify-center font-mono font-bold text-ink flex-shrink-0 shadow-[2px_2px_0_#111]">
                <User className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink/70">
                  {viewScope === "global"
                    ? "Tampilan Agregat Global Sistem"
                    : isAuthenticated
                    ? "Sesi Akun Google Terhubung"
                    : "Sesi Tamu Peramban (Lokal)"}
                </span>
                {isAuthenticated && viewScope === "user" && (
                  <span className="inline-flex items-center gap-1 tag tag-mint text-[9px] font-bold py-0.5 px-1.5">
                    <ShieldCheck className="w-3 h-3" />
                    Tersinkron Cloud
                  </span>
                )}
              </div>
              <p className="font-display font-black text-base sm:text-lg text-ink">
                {viewScope === "global"
                  ? "Semua Sesi Pengguna AJIN"
                  : isAuthenticated
                  ? `${user.name} (${user.email})`
                  : "Pengguna Tamu (Guest Session)"}
              </p>
              <p className="font-sans text-xs text-ink/60 mt-0.5">
                {viewScope === "global"
                  ? "Statistik gabungan seluruh latihan dan kuis yang dilakukan di platform."
                  : isAuthenticated
                  ? "Metrik latihan dan kuis Anda tersimpan permanen di profil akun Anda."
                  : "Data sesi ini aktif di peramban saat ini. Masuk dengan akun Google untuk menyimpan progres secara permanen."}
              </p>
            </div>
          </div>

          {!isAuthenticated && viewScope === "user" && (
            <button
              type="button"
              onClick={loginWithGoogle}
              className="btn btn-yellow text-xs font-mono font-bold py-2 px-3.5 flex items-center gap-2 shadow-[2px_2px_0_#111] flex-shrink-0 self-stretch sm:self-auto justify-center"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk dengan Google</span>
            </button>
          )}
        </div>

        {/* 4 Kartu Metrik Utama */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Penguasaan Alfabet */}
          <div className="card p-5 bg-yellow flex flex-col justify-between nb-lift">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase font-black tracking-wider text-ink/70">
                Huruf Dikuasai
              </span>
              <Trophy className="w-5 h-5 text-ink" />
            </div>
            <div>
              <span className="text-4xl font-display font-black text-ink tabular-nums">
                {masteredLettersCount}
              </span>
              <span className="text-sm font-mono font-bold text-ink/70 ml-1">/ 26 Huruf</span>
            </div>
            <span className="text-xs font-mono font-bold text-ink/80 mt-3 pt-2 border-t border-ink/20">
              {testedLettersCount} huruf sudah dicoba
            </span>
          </div>

          {/* Total Isyarat Dites */}
          <div className="card p-5 bg-paper flex flex-col justify-between nb-lift">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase font-bold tracking-wider text-ink/60">
                Total Isyarat Diuji
              </span>
              <BarChart3 className="w-5 h-5 text-cobalt" />
            </div>
            <div>
              <span className="text-4xl font-display font-black text-ink tabular-nums">
                {data?.totalFrames || 0}
              </span>
              <span className="text-sm font-mono text-ink/60 ml-1">kali</span>
            </div>
            <span className="text-xs font-mono text-ink/60 mt-3 pt-2 border-t border-ink/15">
              Tingkat keberhasilan: {data?.successRate || 0}%
            </span>
          </div>

          {/* Rata-Rata Keyakinan Model */}
          <div className="card p-5 bg-paper flex flex-col justify-between nb-lift">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase font-bold tracking-wider text-ink/60">
                Akurasi Rata-Rata
              </span>
              <CheckCircle className="w-5 h-5 text-mint" />
            </div>
            <div>
              <span className="text-4xl font-display font-black text-ink tabular-nums">
                {data?.avgConfidence || 0}
              </span>
              <span className="text-sm font-mono text-ink/60 ml-1">%</span>
            </div>
            <span className="text-xs font-mono text-ink/60 mt-3 pt-2 border-t border-ink/15">
              Rata-rata keyakinan pengenalan gestur
            </span>
          </div>

          {/* Kecepatan Frame & Latensi */}
          <div className="card p-5 bg-paper flex flex-col justify-between nb-lift">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase font-bold tracking-wider text-ink/60">
                Kecepatan Deteksi
              </span>
              <Zap className="w-5 h-5 text-coral" />
            </div>
            <div>
              <span className="text-4xl font-display font-black text-ink tabular-nums">
                {data?.avgLatencyMs || 0}
              </span>
              <span className="text-sm font-mono text-ink/60 ml-1">
                ms ({data?.avgFps || 0} FPS)
              </span>
            </div>
            <span className="text-xs font-mono text-ink/60 mt-3 pt-2 border-t border-ink/15">
              Inferensi real-time ONNX Runtime WebGL
            </span>
          </div>
        </div>

        {/* Peta 26 Huruf SIBI: Visual Mastery Grid */}
        <div className="card p-6 bg-paper nb-thick">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b-2 border-ink pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="tag tag-yellow text-[10px]">PETA PENGUASAAN</span>
                <h3 className="font-display font-black text-xl text-ink">
                  Status Penguasaan 26 Alfabet SIBI
                </h3>
              </div>
              <p className="text-xs font-sans text-ink/60">
                Pilih kartu huruf mana saja untuk langsung melatihnya di depan webcam.
              </p>
            </div>

            {/* Legend Badges */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 bg-mint border border-ink" />
                <span>Dikuasai (≥80%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 bg-yellow border border-ink" />
                <span>Sedang Dilatih</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 bg-paper-2 border border-ink" />
                <span>Belum Dicoba</span>
              </div>
            </div>
          </div>

          {/* 26-Letter Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-13 gap-2.5">
            {SIBI_ALPHABETS_FALLBACK.map((alpha) => {
              const metric = classMetrics.find((m) => m.letter === alpha.letter);
              const isTested = !!metric && (metric.testsCount || 0) > 0;
              const isMastered = isTested && (metric.accuracyPct || 0) >= 80;
              const inProgress = isTested && !isMastered;

              return (
                <Link
                  key={alpha.letter}
                  to={`/latihan?letter=${alpha.letter}`}
                  className={`border-2 border-ink p-2 text-center transition-all hover:scale-105 hover:-translate-y-0.5 shadow-[2px_2px_0_#111] ${
                    isMastered
                      ? "bg-mint text-ink font-black"
                      : inProgress
                      ? "bg-yellow text-ink font-bold"
                      : "bg-paper-2 text-ink/60 hover:bg-paper-3"
                  }`}
                  title={`Latih huruf ${alpha.letter}`}
                >
                  <span className="font-display font-black text-xl block leading-none mb-1">
                    {alpha.letter}
                  </span>
                  <span className="text-[9px] font-mono block">
                    {isTested ? `${metric.accuracyPct}%` : "-"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Tabel Detail Performa Huruf SIBI */}
        <div className="card bg-paper overflow-hidden nb-thick">
          <div className="p-5 border-b-2 border-ink bg-paper-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-black text-lg text-ink">
                Tabel Rincian Hasil Latihan per Huruf
              </h3>
              <p className="text-xs font-mono text-ink/60">
                Catatan historis dari sesi latihan dan kuis mandirimu di AJIN.
              </p>
            </div>
            <Link
              to="/latihan"
              className="btn btn-yellow text-xs font-mono py-2 px-3 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>Mulai Latihan Baru</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper-2 text-xs font-mono font-bold text-ink uppercase border-b-2 border-ink">
                <tr>
                  <th className="px-6 py-3.5">Huruf SIBI</th>
                  <th className="px-6 py-3.5">Frekuensi Latihan</th>
                  <th className="px-6 py-3.5">Akurasi Keberhasilan</th>
                  <th className="px-6 py-3.5">Keyakinan Rata-Rata</th>
                  <th className="px-6 py-3.5">Tingkat Kemahiran</th>
                  <th className="px-6 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/10 font-mono text-xs">
                {classMetrics.length > 0 ? (
                  classMetrics.map((item) => (
                    <tr key={item.letter} className="hover:bg-paper-2 transition-colors">
                      <td className="px-6 py-3.5 font-display font-black text-ink text-base">
                        {item.letter}
                      </td>
                      <td className="px-6 py-3.5 text-ink/70 font-bold tabular-nums">
                        {item.testsCount} kali
                      </td>
                      <td className="px-6 py-3.5 font-black text-ink tabular-nums">
                        {item.accuracyPct}%
                      </td>
                      <td className="px-6 py-3.5 text-ink tabular-nums">
                        {item.avgConfidencePct}%
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`tag text-[10px] font-bold ${
                            item.accuracyPct >= 85
                              ? "tag-mint"
                              : item.accuracyPct >= 70
                              ? "tag-yellow"
                              : "tag-coral"
                          }`}
                        >
                          {item.accuracyPct >= 85
                            ? "Sangat Mahir"
                            : item.accuracyPct >= 70
                            ? "Lancar"
                            : "Perlu Diasah"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Link
                          to={`/latihan?letter=${item.letter}`}
                          className="btn bg-paper hover:bg-yellow text-[10px] font-mono py-1 px-2.5 shadow-[1px_1px_0_#111]"
                        >
                          Latih Ulang
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-ink/60 font-sans text-xs">
                      <p className="font-bold text-sm text-ink mb-1">Belum Ada Sesi Latihan yang Tercatat</p>
                      <p className="mb-4">
                        {viewScope === "user" && !isAuthenticated
                          ? "Sesi latihan di peramban ini masih kosong. Coba latih huruf di depan webcam sekarang!"
                          : "Belum ada rekaman pengujian untuk filter yang dipilih."}
                      </p>
                      <Link to="/latihan" className="btn btn-yellow text-xs font-mono py-2 px-4">
                        Mulai Sesi Latihan di Kamera
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
