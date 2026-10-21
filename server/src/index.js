import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import alphabetRoutes from "./routes/alphabetRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import telemetryRoutes from "./routes/telemetryRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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
  console.log(`  Endpoint Alfabet:      http://localhost:${PORT}/api/alphabets`);
  console.log(`===============================================`);
});
