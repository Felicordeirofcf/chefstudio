const express = require("express");
const router = express.Router();
const metaController = require("../controllers/metaController");
const { protect } = require("../middleware/authMiddleware");

// Rotas públicas
router.get("/login", metaController.facebookLogin);
router.get("/callback", metaController.facebookCallback);

// Rotas protegidas (requerem autenticação)
router.get("/connection-status", protect, metaController.getConnectionStatus);
router.get("/profile", protect, metaController.getUserProfile);
router.post("/create-ad-from-post", protect, metaController.createAdFromPost);

module.exports = router;
