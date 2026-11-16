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

// Middleware
app.use(cors());
app.use(express.json());

// Request logger ringkas
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    system: "AJIN SIBI Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString()
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
    message: "Terjadi kesalahan internal pada server backend AJIN."
  });
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  AJIN SIBI Backend berjalan pada port ${PORT}`);
  console.log(`  Endpoint Health Check: http://localhost:${PORT}/api/health`);
  console.log(`  Endpoint Google Auth:  http://localhost:${PORT}/api/auth/google`);
  console.log(`===============================================`);
});

// Listener pendamping jika GOOGLE_REDIRECT_URI menggunakan port 8000
const redirectUri = process.env.GOOGLE_REDIRECT_URI || "";
if (redirectUri.includes(":8000")) {
  try {
    const server8000 = app.listen(8000, () => {
      console.log(`  AJIN OAuth Callback Listener aktif pada port 8000`);
    });
    server8000.on("error", (e) => {
      console.warn(`[AJIN Auth] Listener port 8000 dilewati (${e.message}). Callback tetap aktif di port ${PORT}.`);
    });
  } catch (e) {
    console.warn(`[AJIN Auth] Port 8000 tidak dapat dibuka:`, e.message);
  }
}
