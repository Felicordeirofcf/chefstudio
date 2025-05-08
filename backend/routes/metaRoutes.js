const express = require("express");
const router = express.Router();

const metaController = require("../controllers/metaController");
const { protect } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Meta
 *   description: Integração com Meta Ads (Facebook/Instagram)
 */

// 🔗 Simulações e utilidades
router.post("/connect", protect, metaController.connectMetaAccount);
router.get("/status", protect, metaController.getMetaConnectionStatus);
router.post("/generate-caption", protect, metaController.generateAdCaption);

// 🔐 Login real com Facebook
router.get("/login", metaController.loginWithFacebook);
router.get("/callback", protect, metaController.facebookCallback);

// 📊 Contas de anúncio
router.get("/adaccounts", protect, metaController.getAdAccounts);

// 🎯 Campanhas
router.post("/create-campaign", protect, metaController.createMetaCampaign);

// 📦 Ad Sets
router.post("/create-adset", protect, metaController.createAdSet);

// 🎨 Criativo + Anúncio
router.post("/create-ad", protect, metaController.createAdCreative);

// 🔒 Teste de rota protegida
router.get("/test", protect, (req, res) => {
  res.send("🔒 Rota protegida funcionando");
});

module.exports = router;
