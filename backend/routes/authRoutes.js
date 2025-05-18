const express = require("express");
const router = express.Router();
const { loginUser, registerUser, getProfile, facebookCallback, facebookLogout } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Rotas públicas
router.post("/login", loginUser);
router.post("/register", registerUser);
router.get("/facebook/callback", facebookCallback);

// Rotas protegidas
router.get("/profile", protect, getProfile);
router.post("/facebook/logout", protect, facebookLogout);

module.exports = router;
