import express from "express";
import {
  register,
  login,
  googleAuthRedirect,
  googleAuthCallback,
  getCurrentUser,
  logout,
} from "../controllers/authController.js";

const router = express.Router();

// Autentikasi Google OAuth2
router.get("/google", googleAuthRedirect);
router.get("/google/callback", googleAuthCallback);

// Sesi & Profil Pengguna
router.get("/me", getCurrentUser);
router.post("/logout", logout);

// Autentikasi Form Bawaan
router.post("/register", register);
router.post("/login", login);

export default router;
