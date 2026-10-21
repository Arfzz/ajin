import express from "express";
import { logTelemetry, getTelemetrySummary } from "../controllers/telemetryController.js";

const router = express.Router();

router.post("/", logTelemetry);
router.get("/summary", getTelemetrySummary);

export default router;
