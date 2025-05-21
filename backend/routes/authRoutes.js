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

// Rota de teste para verificar se a autenticação está funcionando
router.get("/test", (req, res) => {
  res.json({ message: "Rota de autenticação está funcionando!" });
});

module.exports = router;
