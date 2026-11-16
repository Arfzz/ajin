import express from "express";
import {
  interpretSignSpelling,
  expandText,
  getAiStatus,
  generateQuizWords,
  recognizeSignFromImage,
  chatWithAi,
} from "../controllers/aiController.js";

const router = express.Router();

router.get("/status", getAiStatus);
router.post("/interpret", interpretSignSpelling);
router.post("/expand", expandText);
router.post("/quiz-words", generateQuizWords);
router.post("/recognize-image", recognizeSignFromImage);
router.post("/chat", chatWithAi);

export default router;

