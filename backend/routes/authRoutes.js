const express = require("express");
const router = express.Router();
// <<< CORRIGIDO: Removida a importação de facebookCallback e facebookLogout >>>
const { loginUser, registerUser, getProfile } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Rotas públicas
router.post("/login", loginUser);
router.post("/register", registerUser);
// <<< REMOVIDO: Rota /facebook/callback - Lógica agora em metaRoutes.js >>>
// router.get("/facebook/callback", facebookCallback);

// Rotas protegidas
router.get("/profile", protect, getProfile);
// <<< REMOVIDO: Rota /facebook/logout - Lógica agora em metaRoutes.js >>>
// router.post("/facebook/logout", protect, facebookLogout);

// Rota de teste para verificar se a autenticação está funcionando
router.get("/test", (req, res) => {
  res.json({ message: "Rota de autenticação está funcionando!" });
});

module.exports = router;

