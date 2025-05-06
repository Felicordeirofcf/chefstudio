const express = require("express");
const router = express.Router();
const menuController = require("../controllers/menuController");
// const { protect } = require("../middleware/authMiddleware"); // Middleware for protected routes

// @route   GET /api/menu
// @desc    Get all menu items for the logged-in user (Simulated)
// @access  Private (Placeholder)
router.get("/", /* protect, */ menuController.getAllMenuItems);

// @route   POST /api/menu
// @desc    Add a new menu item (Simulated)
// @access  Private (Placeholder)
router.post("/", /* protect, */ menuController.addMenuItem);

// @route   GET /api/menu/:id
// @desc    Get a specific menu item by ID (Simulated)
// @access  Private (Placeholder)
router.get("/:id", /* protect, */ menuController.getMenuItemById);

// @route   PUT /api/menu/:id
// @desc    Update a menu item (Simulated)
// @access  Private (Placeholder)
router.put("/:id", /* protect, */ menuController.updateMenuItem);

// @route   DELETE /api/menu/:id
// @desc    Delete a menu item (Simulated)
// @access  Private (Placeholder)
router.delete("/:id", /* protect, */ menuController.deleteMenuItem);

module.exports = router;

