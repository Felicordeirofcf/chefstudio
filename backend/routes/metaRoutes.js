const express = require("express");
const router = express.Router();
const metaController = require("../controllers/metaController");
// const { protect } = require("../middleware/authMiddleware"); // Middleware for protected routes

// @route   POST /api/meta/connect
// @desc    Connect user's Meta Ads account (Simulated OAuth flow start)
// @access  Private (Placeholder)
router.post("/connect", /* protect, */ metaController.connectMetaAccount);

// @route   GET /api/meta/status
// @desc    Check Meta Ads connection status (Simulated)
// @access  Private (Placeholder)
router.get("/status", /* protect, */ metaController.getMetaConnectionStatus);

// @route   POST /api/meta/generate-caption
// @desc    Generate ad caption using AI (Simulated)
// @access  Private (Placeholder)
router.post("/generate-caption", /* protect, */ metaController.generateAdCaption);

module.exports = router;

