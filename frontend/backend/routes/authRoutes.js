const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/login", authController.loginUser);

router.post("/register", authController.registerUser);

router.get("/facebook/callback", authController.facebookCallback);

router.get("/profile", protect, authController.getProfile);

module.exports = router;
