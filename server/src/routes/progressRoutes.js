import express from "express";
import {
  updateProgress,
  getUserProgress,
  migrateGuestData,
} from "../controllers/progressController.js";

const router = express.Router();

router.post("/update", updateProgress);
router.post("/migrate-guest", migrateGuestData);
router.get("/:userId", getUserProgress);

export default router;
