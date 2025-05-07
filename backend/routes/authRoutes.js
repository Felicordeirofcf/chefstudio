const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
// const { protect } = require("../middleware/authMiddleware"); // Middleware for protected routes (implement later)

// @route   POST /api/auth/register
// @desc    Register a new user (Simulated)
// @access  Public
router.post("/register", authController.registerUser);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token (Simulated)
// @access  Public
router.post("/login", authController.loginUser);

// @route   GET /api/auth/profile
// @desc    Get user profile (Simulated, needs protection later)
// @access  Private (Placeholder)
router.get("/profile", /* protect, */ authController.getUserProfile);

// @route   PUT /api/auth/profile
// @desc    Update user profile / restaurant info (Simulated, needs protection later)
// @access  Private (Placeholder)
router.put("/profile", /* protect, */ authController.updateUserProfile);

// @route   PUT /api/auth/subscription
// @desc    Update user subscription status (Simulated, needs protection later)
// @access  Private (Placeholder)
router.put("/subscription", /* protect, */ authController.updateSubscription);

module.exports = router;

