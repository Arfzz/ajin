import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Download,
  RefreshCw,
  ArrowUpRight,
  User,
  ShieldCheck,
  LogIn,
  Camera,
  CheckCircle2,
  Compass,
} from "lucide-react";
import { fetchTelemetrySummary, getCurrentUserIdentifier } from "../services/api";
import { SIBI_ALPHABETS_FALLBACK } from "../services/fallbackData";
import { useAuth } from "../context/AuthContext";
import {
  HAND_CONNECTIONS,
  GROUP_COLORS,
  NODE_COLORS,
  getSibiHandPose3D,
} from "../components/creative/Hero3DSibiStage";

/**
 * Pasangan huruf SIBI yang bentuk jarinya mirip untuk membantu pengguna
 * memahami perbedaan posisi jari di depan kamera.
 */
const CONFUSED_WITH = {
  A: ["S", "T", "E"],
  B: ["F", "W"],
  C: ["O", "E"],
  D: ["Z", "I"],
  E: ["A", "S", "C"],
  F: ["B", "W"],
  G: ["Q", "H"],
  H: ["U", "V", "G"],
  I: ["J", "Y"],
  J: ["I", "Z"],
  K: ["P", "V"],
  L: ["D", "G"],
  M: ["N", "T", "S"],
  N: ["M", "T"],
  O: ["C", "E"],
  P: ["K", "Q"],
  Q: ["G", "P"],
  R: ["U", "V"],
  S: ["A", "E", "M"],
  T: ["N", "M", "A"],
  U: ["V", "R", "H"],
  V: ["U", "K", "W"],
  W: ["B", "F", "V"],
  X: ["D", "T"],
  Y: ["I", "L"],
  Z: ["D", "J"],
};

/**
 * Ilustrasi Kerangka Tangan 21 Titik Sendi yang jelas dan mudah dilihat.
 */
const ReadableHandDiagramSvg = ({ letter }) => {
  const geometry = useMemo(() => {
    const pose = getSibiHandPose3D(letter);
    const rotX = 0.14 + (pose.viewPitch || 0);
    const rotY = -0.22 + (pose.viewYaw || 0);

    const projectPt = ([vx, vy, vz]) => {
      const cy = Math.cos(rotY);
      const sy = Math.sin(rotY);
      const x1 = vx * cy + vz * sy;
      const z1 = -vx * sy + vz * cy;

      const cx = Math.cos(rotX);
      const sx = Math.sin(rotX);
      const y2 = vy * cx - z1 * sx;
      const z2 = vy * sx + z1 * cx;

      const cameraDist = 2.8;
      const scale = cameraDist / (cameraDist - z2);
      return {
        x: 60 + x1 * 50 * scale,
        y: 66 - y2 * 50 * scale,
        z: z2,
      };
    };

    const pts = pose.points.map(projectPt);

    const bones = HAND_CONNECTIONS.map((conn, idx) => {
      const a = pts[conn.from];
      const b = pts[conn.to];
      return {
        id: `b-${idx}`,
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        z: (a.z + b.z) / 2,
        color: GROUP_COLORS[conn.group],
        width: conn.group === "palm" ? 4.4 : 5.0,
      };
    }).sort((u, v) => u.z - v.z);

    const joints = pts
      .map((node, idx) => ({
        id: `j-${idx}`,
        x: node.x,
        y: node.y,
        z: node.z,
        color: NODE_COLORS[idx],
        isTip: idx === 4 || idx === 8 || idx === 12 || idx === 16 || idx === 20,
        isWrist: idx === 0,
      }))
      .sort((u, v) => u.z - v.z);

    return { bones, joints, dynamic: pose.dynamic };
  }, [letter]);

  return (
    <svg
      viewBox="0 0 120 120"
      className="w-28 h-28 sm:w-32 sm:h-32 shrink-0 border-[2.5px] border-ink bg-paper shadow-[3px_3px_0_#111]"
      aria-label={`Ilustrasi posisi jari huruf ${letter}`}
    >
      <line x1="14" y1="102" x2="106" y2="102" stroke="#111111" strokeOpacity="0.15" strokeWidth="1" />
      <line x1="60" y1="12" x2="60" y2="108" stroke="#111111" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="2 2" />

      {geometry.dynamic === "J" && (
        <path
          d="M 84 28 L 84 66 Q 84 86 62 86 Q 45 86 48 68"
          fill="none"
          stroke="#FF4D4D"
          strokeWidth="2.5"
          strokeDasharray="4 2"
        />
      )}
      {geometry.dynamic === "Z" && (
        <path
          d="M 38 28 L 82 28 L 38 64 L 84 64"
          fill="none"
          stroke="#111111"
          strokeWidth="2.5"
          strokeDasharray="4 2"
        />
      )}

      {geometry.bones.map((b) => (
        <g key={b.id}>
          <line
            x1={b.x1}
            y1={b.y1}
            x2={b.x2}
            y2={b.y2}
            stroke="#111111"
            strokeWidth={b.width + 2.2}
            strokeLinecap="round"
          />
          <line
            x1={b.x1}
            y1={b.y1}
            x2={b.x2}
            y2={b.y2}
            stroke={b.color}
            strokeWidth={b.width}
            strokeLinecap="round"
          />
        </g>
      ))}

      {geometry.joints.map((j) => (
        <circle
          key={j.id}
          cx={j.x}
          cy={j.y}
          r={j.isWrist ? 4.6 : j.isTip ? 4.1 : 3.0}
          fill={j.isTip ? "#FFD000" : j.color}
          stroke="#111111"
          strokeWidth="1.7"
        />
      ))}

      <rect x="6" y="6" width="24" height="18" fill="#111111" />
      <text
        x="18"
        y="19"
        textAnchor="middle"
        fill="#FFD000"
        fontSize="11"
        fontWeight="900"
        fontFamily="JetBrains Mono, monospace"
      >
        {letter}
      </text>
    </svg>
  );
};

export const AnalyticsPage = () => {
  const { user, isAuthenticated, loginWithGoogle } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewScope, setViewScope] = useState("user");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedLetter, setSelectedLetter] = useState("A");

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
      console.warn("[AJIN Rapor] Gagal memuat data:", err);
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

  const classMetrics = useMemo(
    () => (Array.isArray(data?.classMetrics) ? data.classMetrics : []),
    [data]
  );

  // Gabungkan 26 abjad SIBI dengan hasil latihan nyata
  const enrichedAlphabets = useMemo(() => {
    return SIBI_ALPHABETS_FALLBACK.map((alpha) => {
      const metric = classMetrics.find((m) => m.letter === alpha.letter);
      const testsCount = metric?.testsCount || 0;
      const accuracyPct = metric?.accuracyPct || 0;
      const isTested = testsCount > 0;
      const status = !isTested
        ? "untested"
        : accuracyPct >= 80
        ? "mastered"
        : "in_progress";

      return {
        ...alpha,
        testsCount,
        accuracyPct,
        isTested,
        status,
      };
    });
  }, [classMetrics]);

  const masteredLetters = useMemo(
    () => enrichedAlphabets.filter((a) => a.status === "mastered"),
    [enrichedAlphabets]
  );
  const inProgressLetters = useMemo(
    () => enrichedAlphabets.filter((a) => a.status === "in_progress"),
    [enrichedAlphabets]
  );
  const untestedLetters = useMemo(
    () => enrichedAlphabets.filter((a) => a.status === "untested"),
    [enrichedAlphabets]
  );

  // Saran 1 huruf paling tepat untuk dilatih berikutnya
  const priorityRecommendation = useMemo(() => {
    if (inProgressLetters.length > 0) {
      const weakest = [...inProgressLetters].sort(
        (a, b) => a.accuracyPct - b.accuracyPct
      )[0];
      return {
        item: weakest,
        tag: `Perlu Diulang (${weakest.accuracyPct}%)`,
        tagColor: "bg-coral text-white",
        reason: `Kamu sudah melatih huruf ${weakest.letter} sebanyak ${weakest.testsCount} kali, tetapi tingkat keberhasilannya masih ${weakest.accuracyPct}%. Yuk, latih lagi sampai mencapai minimal 80%.`,
      };
    }

    const vowelOrder = ["A", "I", "U", "E", "O"];
    const nextUntestedVowel = vowelOrder
      .map((v) => enrichedAlphabets.find((a) => a.letter === v))
      .find((a) => a && a.status === "untested");

    if (nextUntestedVowel) {
      return {
        item: nextUntestedVowel,
        tag: "Huruf Vokal Dasar",
        tagColor: "bg-paper text-ink",
        reason: `Huruf vokal ${nextUntestedVowel.letter} belum pernah kamu coba di kamera. Mulailah dari 5 huruf vokal (A, I, U, E, O) karena bentuk jarinya paling mudah diingat.`,
      };
    }

    if (untestedLetters.length > 0) {
      const nextAlpha = untestedLetters[0];
      return {
        item: nextAlpha,
        tag: "Huruf Baru",
        tagColor: "bg-paper text-ink",
        reason: `Huruf-huruf sebelumnya sudah kamu kuasai dengan baik. Sekarang saatnya mencoba huruf ${nextAlpha.letter} di depan kamera.`,
      };
    }

    const firstAlpha = enrichedAlphabets[0];
    return {
      item: firstAlpha,
      tag: "Semua Huruf Lancar",
      tagColor: "bg-mint text-ink",
      reason: `Selamat! Kamu sudah menguasai seluruh 26 huruf SIBI. Pertahankan ingatanmu dengan mencoba Kuis Eja Kata.`,
    };
  }, [inProgressLetters, untestedLetters, enrichedAlphabets]);

  useEffect(() => {
    if (priorityRecommendation?.item?.letter) {
      setSelectedLetter(priorityRecommendation.item.letter);
    }
  }, [priorityRecommendation?.item?.letter]);

  const inspectedItem = useMemo(
    () =>
      enrichedAlphabets.find((a) => a.letter === selectedLetter) ||
      enrichedAlphabets[0],
    [enrichedAlphabets, selectedLetter]
  );

  const filteredAlphabets = useMemo(() => {
    if (filterStatus === "all") return enrichedAlphabets;
    return enrichedAlphabets.filter((item) => item.status === filterStatus);
  }, [enrichedAlphabets, filterStatus]);

  const testedList = useMemo(() => {
    return enrichedAlphabets
      .filter((a) => a.isTested)
      .sort((a, b) => b.accuracyPct - a.accuracyPct || b.testsCount - a.testsCount);
  }, [enrichedAlphabets]);

  const masteryPercentage = Math.round((masteredLetters.length / 26) * 100);

  const handleExportCSV = () => {
    if (classMetrics.length === 0) {
      alert("Belum ada riwayat latihan untuk diunduh. Coba latih minimal 1 huruf di kamera terlebih dahulu.");
      return;
    }

    const headers = [
      "Huruf SIBI",
      "Jumlah Latihan",
      "Tingkat Keberhasilan (%)",
    ];
    const rows = classMetrics.map((item) => [
      item.letter,
      item.testsCount,
      item.accuracyPct,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `ajin_rapor_belajar_${viewScope}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-paper text-ink pt-20 pb-20">
      {/* Header Rapor Belajar yang Bersih dan Mudah Dibaca */}
      <div className="border-b-[3px] border-ink bg-paper-2 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-wider text-cobalt mb-1.5">
              RAPOR BELAJAR SIBI // 26 HURUF A-Z
            </p>
            <h1 className="font-display font-black text-3xl sm:text-5xl text-ink tracking-tight leading-tight">
              Rapor &amp; Progres Belajar
            </h1>
            <p className="font-sans text-sm sm:text-base text-ink/80 font-medium mt-2 max-w-2xl leading-relaxed">
              Lihat huruf apa saja yang sudah kamu kuasai, huruf yang masih perlu diulang, serta rekomendasi latihan berikutnya.
            </p>
          </div>

          {/* Kontrol Filter Sesi & Unduh Rapor */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex items-center border-2 border-ink bg-paper p-0.5 shadow-[2px_2px_0_#111]">
              <button
                type="button"
                onClick={() => setViewScope("user")}
                className={`px-3.5 py-1.5 text-xs font-mono font-black transition-colors cursor-pointer ${
                  viewScope === "user"
                    ? "bg-yellow text-ink"
                    : "text-ink/65 hover:text-ink"
                }`}
              >
                Progres Saya
              </button>
              <button
                type="button"
                onClick={() => setViewScope("global")}
                className={`px-3.5 py-1.5 text-xs font-mono font-black transition-colors cursor-pointer ${
                  viewScope === "global"
                    ? "bg-yellow text-ink"
                    : "text-ink/65 hover:text-ink"
                }`}
              >
                Semua Pengguna
              </button>
            </div>

            <button
              type="button"
              onClick={() => loadData(viewScope)}
              className="p-2.5 border-2 border-ink bg-paper hover:bg-yellow shadow-[2px_2px_0_#111] transition-colors cursor-pointer"
              title="Perbarui data rapor"
              aria-label="Perbarui data rapor"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2 border-2 border-ink bg-ink text-yellow hover:bg-cobalt hover:text-white text-xs font-mono font-black flex items-center gap-2 shadow-[2px_2px_0_#111] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Rapor (CSV)</span>
            </button>
          </div>
        </div>

        {/* Status Penyimpanan Akun */}
        <div className="max-w-7xl mx-auto mt-6 pt-4 border-t-2 border-ink/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            {isAuthenticated && user?.picture ? (
              <img
                src={user.picture}
                alt={user.name || "Pengguna"}
                className="w-7 h-7 border-2 border-ink object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 bg-yellow border-2 border-ink flex items-center justify-center">
                <User className="w-4 h-4 text-ink" />
              </div>
            )}

            <span className="font-sans font-semibold text-ink text-xs sm:text-sm">
              {viewScope === "global"
                ? "Menampilkan gabungan latihan dari seluruh pengguna AJIN."
                : isAuthenticated
                ? `Progres tersimpan di akun Google: ${user.name}`
                : "Kamu sedang menggunakan Sesi Tamu. Progres tersimpan di peramban perangkat ini."}
            </span>

            {isAuthenticated && viewScope === "user" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-mint border border-ink font-mono text-[10px] font-black text-ink">
                <ShieldCheck className="w-3 h-3" />
                Tersimpan
              </span>
            )}
          </div>

          {!isAuthenticated && viewScope === "user" && (
            <button
              type="button"
              onClick={loginWithGoogle}
              className="px-3.5 py-1.5 bg-yellow border-2 border-ink font-mono text-xs font-black text-ink hover:bg-ink hover:text-yellow transition-colors flex items-center gap-1.5 shadow-[2px_2px_0_#111] self-start sm:self-auto cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Simpan Permanen dengan Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Konten Utama dengan Jarak Antar-Bagian yang Lega */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* BAGIAN 1: Ringkasan Progres 26 Huruf & Saran Latihan Berikutnya */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Kiri (7 Kolom): Ringkasan Penguasaan 26 Huruf */}
          <div className="lg:col-span-7 border-[3px] border-ink bg-paper p-6 sm:p-7 shadow-[6px_6px_0_#111] flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <div>
                  <span className="font-mono text-xs font-bold uppercase text-ink/60 block mb-1">
                    RINGKASAN PENGUASAAN HURUF
                  </span>
                  <h2 className="font-display font-black text-2xl sm:text-3xl text-ink">
                    {masteredLetters.length} dari 26 Huruf Sudah Lancar
                  </h2>
                </div>
                <span className="font-mono text-sm font-black px-3 py-1 bg-yellow border-2 border-ink tabular-nums">
                  {masteryPercentage}% Dikuasai
                </span>
              </div>

              {/* Bar Progres Utama */}
              <div className="w-full h-6 border-2 border-ink bg-paper-2 p-0.5 shadow-[2px_2px_0_#111] flex mb-6">
                {masteredLetters.length > 0 && (
                  <div
                    className="h-full bg-mint border-r border-ink transition-all duration-300"
                    style={{ width: `${(masteredLetters.length / 26) * 100}%` }}
                    title={`Sudah Lancar: ${masteredLetters.length} huruf`}
                  />
                )}
                {inProgressLetters.length > 0 && (
                  <div
                    className="h-full bg-yellow border-r border-ink transition-all duration-300"
                    style={{ width: `${(inProgressLetters.length / 26) * 100}%` }}
                    title={`Perlu Diulang: ${inProgressLetters.length} huruf`}
                  />
                )}
              </div>

              {/* 3 Kartu Status Besar yang Mudah Dibaca */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 border-2 border-ink bg-mint/30 shadow-[3px_3px_0_#111]">
                  <span className="font-mono text-xs font-black uppercase text-ink block mb-1">
                    Sudah Lancar
                  </span>
                  <div className="font-display font-black text-3xl text-ink tabular-nums">
                    {masteredLetters.length}{" "}
                    <span className="text-sm font-mono font-bold">Huruf</span>
                  </div>
                  <p className="font-sans text-xs text-ink/75 mt-1">
                    Akurasi 80% ke atas saat diuji di kamera
                  </p>
                </div>

                <div className="p-4 border-2 border-ink bg-yellow/40 shadow-[3px_3px_0_#111]">
                  <span className="font-mono text-xs font-black uppercase text-ink block mb-1">
                    Perlu Diulang
                  </span>
                  <div className="font-display font-black text-3xl text-ink tabular-nums">
                    {inProgressLetters.length}{" "}
                    <span className="text-sm font-mono font-bold">Huruf</span>
                  </div>
                  <p className="font-sans text-xs text-ink/75 mt-1">
                    Sudah dicoba, tetapi akurasi masih di bawah 80%
                  </p>
                </div>

                <div className="p-4 border-2 border-ink bg-paper-2 shadow-[3px_3px_0_#111]">
                  <span className="font-mono text-xs font-black uppercase text-ink/70 block mb-1">
                    Belum Dicoba
                  </span>
                  <div className="font-display font-black text-3xl text-ink tabular-nums">
                    {untestedLetters.length}{" "}
                    <span className="text-sm font-mono font-bold">Huruf</span>
                  </div>
                  <p className="font-sans text-xs text-ink/75 mt-1">
                    Belum pernah diperagakan di depan kamera
                  </p>
                </div>
              </div>
            </div>

            {/* Ringkasan Aktivitas Sederhana (Tanpa Istilah Teknis Rumit) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t-2 border-ink/15 font-sans text-sm">
              <div className="p-3 bg-paper-2 border-2 border-ink flex items-center justify-between">
                <span className="font-semibold text-ink/80">Total Latihan di Kamera</span>
                <span className="font-mono font-black text-base text-ink tabular-nums">
                  {data?.totalFrames || 0} kali
                </span>
              </div>
              <div className="p-3 bg-paper-2 border-2 border-ink flex items-center justify-between">
                <span className="font-semibold text-ink/80">Rata-Rata Keberhasilan</span>
                <span className="font-mono font-black text-base text-ink tabular-nums">
                  {data?.successRate || 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Kanan (5 Kolom): Saran Latihan Berikutnya */}
          <div className="lg:col-span-5 border-[3px] border-ink bg-yellow p-6 sm:p-7 shadow-[6px_6px_0_#111] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b-2 border-ink">
                <span className="font-mono text-xs font-black uppercase text-ink flex items-center gap-1.5">
                  <Compass className="w-4 h-4" />
                  Saran Latihan Berikutnya
                </span>
                <span
                  className={`font-mono text-[11px] font-black px-2.5 py-0.5 border-2 border-ink ${priorityRecommendation.tagColor}`}
                >
                  {priorityRecommendation.tag}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-4 mb-5">
                <ReadableHandDiagramSvg letter={priorityRecommendation.item.letter} />

                <div className="flex-1">
                  <h3 className="font-display font-black text-3xl sm:text-4xl text-ink leading-none">
                    Huruf {priorityRecommendation.item.letter}
                  </h3>
                  <span className="font-mono text-xs font-bold text-ink/75 block mt-1">
                    Tingkat: {priorityRecommendation.item.difficulty} (
                    {priorityRecommendation.item.gestureType === "dynamic"
                      ? "Gerak Dinamis"
                      : "Posisi Statis"}
                    )
                  </span>
                  <p className="font-sans text-sm font-medium text-ink mt-2.5 leading-relaxed">
                    {priorityRecommendation.reason}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-paper border-2 border-ink shadow-[3px_3px_0_#111] mb-6">
                <span className="font-mono text-xs font-black uppercase text-ink/70 block mb-1">
                  Cara Membentuk Jari Huruf {priorityRecommendation.item.letter}:
                </span>
                <p className="font-sans text-sm text-ink leading-relaxed">
                  {priorityRecommendation.item.description}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                to={`/latihan?letter=${priorityRecommendation.item.letter}`}
                className="flex-1 py-3 px-4 bg-ink text-yellow hover:bg-cobalt hover:text-white border-2 border-ink font-mono text-xs font-black uppercase text-center shadow-[3px_3px_0_#111] transition-colors flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Latih Huruf {priorityRecommendation.item.letter} Sekarang</span>
              </Link>
              <Link
                to="/kuis"
                className="py-3 px-4 bg-paper hover:bg-paper-2 text-ink border-2 border-ink font-mono text-xs font-black uppercase text-center shadow-[3px_3px_0_#111] transition-colors"
              >
                Coba Kuis Eja
              </Link>
            </div>
          </div>
        </div>

        {/* BAGIAN 2: Peta 26 Huruf A-Z & Kartu Detail Huruf yang Dipilih */}
        <div className="border-[3px] border-ink bg-paper p-6 sm:p-7 shadow-[6px_6px_0_#111]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 mb-6 border-b-2 border-ink">
            <div>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-ink">
                Peta 26 Huruf SIBI (A sampai Z)
              </h2>
              <p className="font-sans text-sm text-ink/75 mt-1">
                Klik salah satu kotak huruf di bawah untuk melihat panduan jari dan hasil latihanmu pada huruf tersebut.
              </p>
            </div>

            {/* Filter Kategori yang Sederhana */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              {[
                { id: "all", label: `Semua (26)` },
                { id: "mastered", label: `Sudah Lancar (${masteredLetters.length})` },
                { id: "in_progress", label: `Perlu Diulang (${inProgressLetters.length})` },
                { id: "untested", label: `Belum Dicoba (${untestedLetters.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterStatus(tab.id)}
                  className={`px-3 py-1.5 border-2 border-ink font-bold transition-all cursor-pointer ${
                    filterStatus === tab.id
                      ? "bg-ink text-yellow font-black shadow-[2px_2px_0_#111]"
                      : "bg-paper-2 text-ink hover:bg-yellow"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Kiri (7 Kolom): Grid Kotak Huruf A-Z yang Bersih dan Lega */}
            <div className="lg:col-span-7">
              {filteredAlphabets.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-3">
                  {filteredAlphabets.map((item) => {
                    const isSelected = item.letter === inspectedItem.letter;
                    const tileStyle =
                      item.status === "mastered"
                        ? "bg-mint text-ink"
                        : item.status === "in_progress"
                        ? "bg-yellow text-ink"
                        : "bg-paper-2 text-ink";

                    return (
                      <button
                        key={item.letter}
                        type="button"
                        onClick={() => setSelectedLetter(item.letter)}
                        className={`p-3 border-2 border-ink text-center transition-all cursor-pointer flex flex-col items-center justify-between ${tileStyle} ${
                          isSelected
                            ? "ring-4 ring-cobalt shadow-[4px_4px_0_#111] -translate-y-1"
                            : "shadow-[2px_2px_0_#111] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#111]"
                        }`}
                      >
                        <span className="font-display font-black text-2xl sm:text-3xl leading-none mb-1.5">
                          {item.letter}
                        </span>
                        <span className="font-mono text-[11px] font-black tabular-nums">
                          {item.isTested ? `${item.accuracyPct}%` : "Belum"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 border-2 border-ink bg-paper-2 text-center">
                  <p className="font-sans font-bold text-base text-ink mb-3">
                    Belum ada huruf pada kategori ini.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFilterStatus("all")}
                    className="px-4 py-2 bg-yellow border-2 border-ink font-mono text-xs font-black cursor-pointer shadow-[2px_2px_0_#111]"
                  >
                    Tampilkan Semua 26 Huruf
                  </button>
                </div>
              )}

              {/* Keterangan Warna di Bawah Grid */}
              <div className="mt-5 pt-4 border-t-2 border-ink/15 flex flex-wrap items-center gap-5 text-xs font-sans font-semibold text-ink/80">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-mint border-2 border-ink inline-block" />
                  <span>Hijau: Sudah Lancar (Akurasi 80% ke atas)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-yellow border-2 border-ink inline-block" />
                  <span>Kuning: Perlu Diulang (Di bawah 80%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-paper-2 border-2 border-ink inline-block" />
                  <span>Putih: Belum Pernah Dicoba</span>
                </div>
              </div>
            </div>

            {/* Kanan (5 Kolom): Kartu Detail Huruf yang Dipilih */}
            <div className="lg:col-span-5 border-[2.5px] border-ink bg-paper-2 p-5 sm:p-6 shadow-[4px_4px_0_#111]">
              <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-ink">
                <div>
                  <span className="font-mono text-xs font-bold uppercase text-ink/60 block">
                    Detail Huruf Terpilih
                  </span>
                  <h3 className="font-display font-black text-3xl text-ink">
                    Huruf {inspectedItem.letter}
                  </h3>
                </div>

                <span
                  className={`px-3 py-1 border-2 border-ink font-mono text-xs font-black ${
                    inspectedItem.status === "mastered"
                      ? "bg-mint text-ink"
                      : inspectedItem.status === "in_progress"
                      ? "bg-yellow text-ink"
                      : "bg-paper text-ink/75"
                  }`}
                >
                  {inspectedItem.status === "mastered"
                    ? "Sudah Lancar"
                    : inspectedItem.status === "in_progress"
                    ? "Perlu Diulang"
                    : "Belum Dicoba"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-5">
                <ReadableHandDiagramSvg letter={inspectedItem.letter} />

                <div className="flex-1 w-full space-y-2.5">
                  <div className="p-3 border-2 border-ink bg-paper flex items-center justify-between">
                    <span className="font-sans text-xs font-semibold text-ink/75">
                      Tingkat Keberhasilan
                    </span>
                    <span className="font-mono text-base font-black text-ink tabular-nums">
                      {inspectedItem.isTested
                        ? `${inspectedItem.accuracyPct}%`
                        : "Belum diuji"}
                    </span>
                  </div>

                  <div className="p-3 border-2 border-ink bg-paper flex items-center justify-between">
                    <span className="font-sans text-xs font-semibold text-ink/75">
                      Jumlah Latihan
                    </span>
                    <span className="font-mono text-sm font-black text-ink tabular-nums">
                      {inspectedItem.testsCount} kali
                    </span>
                  </div>

                  <div className="p-3 border-2 border-ink bg-paper flex items-center justify-between">
                    <span className="font-sans text-xs font-semibold text-ink/75">
                      Tingkat Kesulitan
                    </span>
                    <span className="font-mono text-xs font-black text-ink">
                      {inspectedItem.difficulty}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cara Membentuk Jari */}
              <div className="space-y-3 mb-5">
                <div className="p-3.5 bg-paper border-2 border-ink">
                  <span className="font-mono text-xs font-black uppercase text-ink/70 block mb-1">
                    Cara Membentuk Jari:
                  </span>
                  <p className="font-sans text-sm text-ink leading-relaxed">
                    {inspectedItem.description}
                  </p>
                </div>

                {inspectedItem.tip && (
                  <div className="p-3.5 bg-yellow/30 border-2 border-ink font-sans text-xs sm:text-sm text-ink">
                    <strong>Tips di Kamera:</strong> {inspectedItem.tip}
                  </div>
                )}

                {CONFUSED_WITH[inspectedItem.letter] && (
                  <div className="p-3 bg-paper border border-ink font-sans text-xs text-ink/80">
                    <strong>Bentuk Jari Mirip Dengan:</strong> Huruf{" "}
                    <strong>{CONFUSED_WITH[inspectedItem.letter].join(", ")}</strong>.
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <Link
                  to={`/latihan?letter=${inspectedItem.letter}`}
                  className="flex-1 py-3 px-4 bg-yellow hover:bg-ink hover:text-yellow text-ink border-2 border-ink font-mono text-xs font-black uppercase text-center shadow-[3px_3px_0_#111] transition-colors flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Latih Huruf {inspectedItem.letter}</span>
                </Link>
                <Link
                  to="/kamus"
                  className="py-3 px-4 bg-paper hover:bg-paper-3 text-ink border-2 border-ink font-mono text-xs font-bold text-center transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Lihat di Kamus 3D</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* BAGIAN 3: Riwayat Huruf yang Sudah Pernah Dilatih */}
        <div className="border-[3px] border-ink bg-paper p-6 sm:p-7 shadow-[6px_6px_0_#111]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b-2 border-ink">
            <div>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-ink">
                Riwayat Huruf yang Sudah Dilatih ({testedList.length} Huruf)
              </h2>
              <p className="font-sans text-sm text-ink/75 mt-1">
                Daftar huruf yang sudah pernah kamu peragakan di depan kamera, diurutkan dari yang paling lancar.
              </p>
            </div>

            <Link
              to="/latihan"
              className="px-4 py-2.5 bg-yellow border-2 border-ink font-mono text-xs font-black text-ink hover:bg-ink hover:text-yellow shadow-[2px_2px_0_#111] transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>Latih Huruf Lainnya</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {testedList.length > 0 ? (
            <div className="space-y-3">
              {testedList.map((item) => {
                const isStable = item.accuracyPct >= 80;
                return (
                  <div
                    key={item.letter}
                    className="p-4 border-2 border-ink bg-paper-2 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Huruf & Jumlah Latihan */}
                    <div className="flex items-center gap-3.5 md:w-56 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedLetter(item.letter)}
                        className={`w-12 h-12 border-2 border-ink font-display font-black text-2xl flex items-center justify-center shadow-[2px_2px_0_#111] cursor-pointer ${
                          isStable ? "bg-mint text-ink" : "bg-yellow text-ink"
                        }`}
                      >
                        {item.letter}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-black text-lg text-ink">
                            Huruf {item.letter}
                          </span>
                          <span
                            className={`px-2 py-0.5 border border-ink font-mono text-[10px] font-black ${
                              isStable
                                ? "bg-mint text-ink"
                                : "bg-yellow text-ink"
                            }`}
                          >
                            {isStable ? "Sudah Lancar" : "Perlu Diulang"}
                          </span>
                        </div>
                        <span className="font-sans text-xs text-ink/75 block mt-0.5">
                          Sudah dilatih {item.testsCount} kali
                        </span>
                      </div>
                    </div>

                    {/* Satu Bar Progres Keberhasilan yang Jelas */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between font-sans text-xs font-bold mb-1.5">
                        <span>Tingkat Keberhasilan</span>
                        <span className="font-mono text-sm font-black tabular-nums">
                          {item.accuracyPct}%
                        </span>
                      </div>
                      <div className="w-full h-4 border-2 border-ink bg-paper overflow-hidden">
                        <div
                          className={`h-full ${
                            isStable ? "bg-mint" : "bg-yellow"
                          }`}
                          style={{ width: `${item.accuracyPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Tombol Latih Lagi */}
                    <div className="shrink-0">
                      <Link
                        to={`/latihan?letter=${item.letter}`}
                        className="inline-block px-4 py-2 border-2 border-ink bg-paper hover:bg-yellow font-mono text-xs font-black text-ink shadow-[2px_2px_0_#111] transition-colors"
                      >
                        Latih Lagi
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 border-2 border-ink bg-paper-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="max-w-xl">
                <h3 className="font-display font-black text-xl text-ink mb-1.5">
                  Belum Ada Riwayat Latihan
                </h3>
                <p className="font-sans text-sm text-ink/80 leading-relaxed">
                  Kamu belum mencoba memperagakan huruf di depan kamera pada sesi ini. Yuk, mulai dari huruf A atau mainkan Kuis Eja Kata agar progres belajarmu tercatat di rapor ini.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Link
                  to="/latihan?letter=A"
                  className="px-4 py-3 bg-yellow hover:bg-ink hover:text-yellow border-2 border-ink font-mono text-xs font-black text-ink shadow-[3px_3px_0_#111] transition-colors flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Latih Huruf A Sekarang</span>
                </Link>
                <Link
                  to="/kuis"
                  className="px-4 py-3 bg-paper hover:bg-paper-3 border-2 border-ink font-mono text-xs font-bold text-ink shadow-[3px_3px_0_#111] transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Coba Kuis Eja</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
