const express = require("express");
const router = express.Router();
const { scrapeProduct } = require("../controllers/ifoodController");
const authMiddleware = require("../middleware/authMiddleware"); // Proteger a rota

// Rota para fazer o scraping de uma URL do iFood
// POST /api/ifood/scrape
// Protegida por autenticação
router.post("/scrape", authMiddleware, scrapeProduct);

module.exports = router;

