const express = require("express");
const router = express.Router();

const adController = require("../controllers/adController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, adController.getAllCampaigns);

router.post("/", protect, adController.createCampaign);

router.get("/:id", protect, adController.getCampaignById);

router.put("/:id/status", protect, adController.updateCampaignStatus);

router.get("/:id/metrics", protect, adController.getCampaignMetrics);

router.post("/location", protect, adController.saveLocationSettings);

router.get("/location", protect, adController.getLocationSettings);

module.exports = router;
