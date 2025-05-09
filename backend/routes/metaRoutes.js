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

// ----------- SIMULAÇÕES E UTILIDADES -----------

router.post("/connect", protect, metaController.connectMetaAccount);
router.get("/status", protect, metaController.getMetaConnectionStatus);
router.post("/generate-caption", protect, metaController.generateAdCaption);

// ----------- AUTENTICAÇÃO COM FACEBOOK -----------

// 🔐 Login inicial (com JWT no state da query string)
router.get("/login", metaController.loginWithFacebook);

// ⚠️ Callback após login (público)
router.get("/callback", metaController.facebookCallback);

// ----------- CONTAS E CRIAÇÃO DE ANÚNCIOS -----------

// 📊 Obter contas de anúncio
router.get("/adaccounts", protect, metaController.getAdAccounts);

// 🎯 Criar campanha
router.post("/create-campaign", protect, metaController.createMetaCampaign);

// 📦 Criar Ad Set
router.post("/create-adset", protect, metaController.createAdSet);

// 🎨 Criar criativo + anúncio
router.post("/create-ad", protect, metaController.createAdCreative);

// ----------- TESTE DE ROTA PROTEGIDA -----------

router.get("/test", protect, (req, res) => {
  res.send("🔒 Rota protegida funcionando");
});

module.exports = router;
