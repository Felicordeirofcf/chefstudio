const express = require("express");
const router = express.Router();
const adController = require("../controllers/adController");
// const { protect } = require("../middleware/authMiddleware"); // Middleware for protected routes

// @route   GET /api/ads
// @desc    Get all campaigns for the logged-in user (Simulated)
// @access  Private (Placeholder)
router.get("/", /* protect, */ adController.getAllCampaigns);

// @route   POST /api/ads
// @desc    Create a new campaign (Simulated)
// @access  Private (Placeholder)
router.post("/", /* protect, */ adController.createCampaign);

// @route   GET /api/ads/:id
// @desc    Get a specific campaign by ID (Simulated)
// @access  Private (Placeholder)
router.get("/:id", /* protect, */ adController.getCampaignById);

// @route   PUT /api/ads/:id/status
// @desc    Update campaign status (e.g., pause, activate) (Simulated)
// @access  Private (Placeholder)
router.put("/:id/status", /* protect, */ adController.updateCampaignStatus);

// @route   GET /api/ads/:id/metrics
// @desc    Get campaign metrics (Simulated)
// @access  Private (Placeholder)
router.get("/:id/metrics", /* protect, */ adController.getCampaignMetrics);

// @route   POST /api/ads/location (As per documentation, though maybe belongs on User?)
// @desc    Save location settings (Simulated)
// @access  Private (Placeholder)
router.post("/location", /* protect, */ adController.saveLocationSettings);

// @route   GET /api/ads/location (As per documentation)
// @desc    Get location settings (Simulated)
// @access  Private (Placeholder)
router.get("/location", /* protect, */ adController.getLocationSettings);

module.exports = router;

