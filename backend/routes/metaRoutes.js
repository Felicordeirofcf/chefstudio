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

// --------- Simulações ---------
router.post("/connect", protect, metaController.connectMetaAccount);
router.get("/status", protect, metaController.getMetaConnectionStatus);
router.post("/generate-caption", protect, metaController.generateAdCaption);

// --------- Facebook OAuth real ---------
router.get("/login", metaController.loginWithFacebook);
router.get("/callback", protect, metaController.facebookCallback);

// --------- API Real: Meta Ads ---------
router.get("/adaccounts", protect, metaController.getAdAccounts);
router.post("/create-campaign", protect, metaController.createMetaCampaign);
router.post("/create-adset", protect, metaController.createAdSet);
router.post("/create-ad", protect, metaController.createAdCreative);

// --------- Rota de teste JWT ---------
router.get("/test", protect, (req, res) => {
  res.send("🔒 Rota protegida funcionando");
});

module.exports = router;
