import express from "express";
import { interpretSignSpelling, expandText, getAiStatus, generateQuizWords } from "../controllers/aiController.js";

const router = express.Router();

router.get("/status", getAiStatus);
router.post("/interpret", interpretSignSpelling);
router.post("/expand", expandText);
router.post("/quiz-words", generateQuizWords);

export default router;

