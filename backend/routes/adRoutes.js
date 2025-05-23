const express = require("express");
const router = express.Router();
const { 
  getAllCampaigns, 
  createCampaign, 
  getCampaignById, 
  updateCampaignStatus, 
  getCampaignMetrics,
  saveLocationSettings,
  getLocationSettings
} = require("../controllers/adController");
const { protect } = require("../middleware/authMiddleware");

// Rotas protegidas para campanhas
router.get("/campaigns", protect, getAllCampaigns);
router.post("/campaigns", protect, createCampaign);
router.get("/campaigns/:id", protect, getCampaignById);
router.put("/campaigns/:id/status", protect, updateCampaignStatus);
router.get("/campaigns/:id/metrics", protect, getCampaignMetrics);

// Rotas para configurações de localização
router.post("/location", protect, saveLocationSettings);
router.get("/location", protect, getLocationSettings);

module.exports = router;



// Nova rota para criar campanha de Tráfego recomendada
router.post("/create-recommended-traffic-campaign", protect, createRecommendedTrafficCampaign);
