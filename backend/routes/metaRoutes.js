const express = require("express");
const router = express.Router();
const { 
  connectMetaAccount, 
  getMetaConnectionStatus, 
  generateAdCaption,
  loginWithFacebook,
  facebookCallback,
  getAdAccounts,
  createMetaCampaign,
  createAdSet,
  createAdCreative,
  createAdFromPost
} = require("../controllers/metaController");
const { protect } = require("../middleware/authMiddleware");

// Rotas públicas para autenticação Facebook
router.get("/facebook/login", loginWithFacebook);
router.get("/callback", facebookCallback);

// Rotas protegidas para Meta Ads
router.post("/connect", protect, connectMetaAccount);
router.get("/connection-status", protect, getMetaConnectionStatus);
router.post("/generate-caption", protect, generateAdCaption);
router.get("/ad-accounts", protect, getAdAccounts);
router.post("/campaigns", protect, createMetaCampaign);
router.post("/adsets", protect, createAdSet);
router.post("/creatives", protect, createAdCreative);

// Nova rota para criar anúncios a partir de publicações do Facebook
router.post("/create-ad-from-post", protect, createAdFromPost);

module.exports = router;
