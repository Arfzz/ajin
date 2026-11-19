import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Pastikan selalu memuat server/.env meskipun server dijalankan dari folder root ajin
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

import authRoutes from "./routes/authRoutes.js";
import alphabetRoutes from "./routes/alphabetRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import telemetryRoutes from "./routes/telemetryRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import { googleAuthCallback } from "./controllers/authController.js";

const app = express();
const PORT = process.env.PORT || 5001;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Diperlukan di belakang reverse proxy hosting (Render, Koyeb, Railway)
app.set("trust proxy", 1);

// Konfigurasi CORS siap produksi + development lokal
const configuredOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  ...configuredOrigins,
]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan server-to-server, curl, healthcheck, atau browser tanpa origin header
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/$/, "");
      if (
        allowedOrigins.has(cleanOrigin) ||
        cleanOrigin.endsWith(".vercel.app") ||
        cleanOrigin.endsWith(".netlify.app") ||
        cleanOrigin.endsWith(".pages.dev")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Request logger ringkas
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Root & Health check endpoint (untuk Render/Koyeb/UptimeRobot)
app.get("/", (req, res) => {
  res.json({
    status: "online",
    system: "AJIN SIBI Backend API",
    health: "/api/health",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    system: "AJIN SIBI Backend API",
    version: "1.1.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/alphabets", alphabetRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/telemetry", telemetryRoutes);
app.use("/api/ai", aiRoutes);

// Alias rute root untuk callback Google OAuth jika redirect_uri tanpa prefix /api
app.get("/auth/google/callback", googleAuthCallback);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({
    success: false,
    message: "Terjadi kesalahan internal pada server backend AJIN.",
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`===============================================`);
  console.log(`  AJIN SIBI Backend berjalan pada port ${PORT}`);
  console.log(`  Mode: ${IS_PRODUCTION ? "PRODUCTION" : "DEVELOPMENT"}`);
  console.log(`  Endpoint Health Check: /api/health`);
  console.log(`  Endpoint Google Auth:  /api/auth/google`);
  console.log(`===============================================`);
});

// Listener pendamping port 8000 HANYA saat development lokal jika GOOGLE_REDIRECT_URI memakai localhost:8000
const redirectUri = process.env.GOOGLE_REDIRECT_URI || "";
if (!IS_PRODUCTION && redirectUri.includes("localhost:8000")) {
  try {
    const server8000 = app.listen(8000, () => {
      console.log(`  AJIN OAuth Callback Listener lokal aktif pada port 8000`);
    });
    server8000.on("error", (e) => {
      console.warn(
        `[AJIN Auth] Listener port 8000 dilewati (${e.message}). Callback tetap aktif di port ${PORT}.`
      );
    });
  } catch (e) {
    console.warn(`[AJIN Auth] Port 8000 tidak dapat dibuka:`, e.message);
  }
}
