import express from "express";
import { getAlphabets, getAlphabetByLetter } from "../controllers/alphabetController.js";

const router = express.Router();

router.get("/", getAlphabets);
router.get("/:letter", getAlphabetByLetter);

export default router;
