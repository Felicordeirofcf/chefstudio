const express = require("express");
const router = express.Router();

const adController = require("../controllers/adController");
const { protect } = require("../middleware/authMiddleware");

// Rota para buscar todas as campanhas do usuário
router.get("/", protect, adController.getAllCampaigns);

// Rota para criar uma nova campanha (mantendo a original para compatibilidade, se necessário)
// A nova rota /campaigns será a principal para criação, conforme chamado pelo frontend
router.post("/", protect, adController.createCampaign); // Rota original
router.post("/campaigns", protect, adController.createCampaign); // Nova rota para compatibilidade com frontend

// Rota para buscar uma campanha específica por ID
router.get("/:id", protect, adController.getCampaignById);

// Rota para atualizar o status de uma campanha
router.put("/:id/status", protect, adController.updateCampaignStatus);

// Rota para buscar métricas de uma campanha
router.get("/:id/metrics", protect, adController.getCampaignMetrics);

// Rotas para configurações de localização (se ainda forem relevantes)
router.post("/location", protect, adController.saveLocationSettings);
router.get("/location", protect, adController.getLocationSettings);

module.exports = router;

