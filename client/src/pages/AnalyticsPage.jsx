import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Download, BarChart3, Zap, Activity, CheckCircle, RefreshCw, Flame, Award, ArrowUpRight, Trophy } from "lucide-react";
import { fetchTelemetrySummary } from "../services/api";
import { SIBI_ALPHABETS_FALLBACK } from "../services/fallbackData";

export const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const result = await fetchTelemetrySummary();
    if (result && result.summary) {
      setData(result.summary);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Ekspor Data ke File CSV
  const handleExportCSV = () => {
    if (!data || !data.classMetrics || data.classMetrics.length === 0) {
      alert("Belum ada data pengujian latihan yang tersedia.");
      return;
    }

    const headers = ["Huruf SIBI", "Jumlah Latihan", "Akurasi Sukses (%)", "Keyakinan Rata-Rata (%)"];
    const rows = data.classMetrics.map((item) => [
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
    link.setAttribute("download", `ajin_rapor_progres_belajar_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Hitung jumlah huruf yang sudah pernah dilatih
  const testedLettersCount = data?.classMetrics?.length || 0;
  const masteredLettersCount = data?.classMetrics?.filter((c) => c.accuracyPct >= 80).length || 0;

  return (
    <div className="min-h-screen bg-paper text-ink pt-20 pb-20">
      {/* Top Banner Header */}
      <div className="border-b-[3px] border-ink bg-paper-2 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="sticker sticker-yellow px-2.5 py-0.5 text-xs font-mono uppercase rotated-label">
                📊 Rapor Belajar SIBI
              </span>
              <span className="sticker sticker-mint px-2.5 py-0.5 text-xs font-mono uppercase">
                🎯 Evaluasi Akurasi
              </span>
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-ink tracking-tight">
              Dashboard Progres &amp; <span className="highlight">Kemahiran SIBI</span>
            </h1>
            <p className="font-sans text-xs sm:text-sm text-ink/70 font-medium mt-1">
              Pantau total sesi latihan, evaluasi akurasi per huruf alfabet, dan unduh data performa belajar dalam format CSV.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
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
              <span>Unduh Rapor Belajar (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* 4 Kartu Metrik Utama */}
        {data && (
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
                  {data.totalFrames}
                </span>
                <span className="text-sm font-mono text-ink/60 ml-1">kali</span>
              </div>
              <span className="text-xs font-mono text-ink/60 mt-3 pt-2 border-t border-ink/15">
                Tingkat keberhasilan: {data.successRate}%
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
                  {data.avgConfidence}
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
                  {data.avgLatencyMs}
                </span>
                <span className="text-sm font-mono text-ink/60 ml-1">ms ({data.avgFps} FPS)</span>
              </div>
              <span className="text-xs font-mono text-ink/60 mt-3 pt-2 border-t border-ink/15">
                Inferensi instan browser (TensorFlow.js)
              </span>
            </div>
          </div>
        )}

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
              const metric = data?.classMetrics?.find((m) => m.letter === alpha.letter);
              const isTested = !!metric && metric.testsCount > 0;
              const isMastered = isTested && metric.accuracyPct >= 80;
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
                {data && data.classMetrics && data.classMetrics.length > 0 ? (
                  data.classMetrics.map((item) => (
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
                            ? "★ Sangat Mahir"
                            : item.accuracyPct >= 70
                            ? "👍 Lancar"
                            : "⚡ Perlu Diasah"}
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
                      <p className="mb-4">Buka halaman Latihan Kamera atau Kuis Eja untuk mulai merekam progres belajarmu.</p>
                      <Link to="/latihan" className="btn btn-yellow text-xs font-mono py-2 px-4">
                        Mulai Sesi Latihan Baru
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
