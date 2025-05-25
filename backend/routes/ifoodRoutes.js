const express = require("express");
const router = express.Router();
// Importar as funções do controller
const { extrairDadosIfood, scrapeIfood } = require("../controllers/ifoodController"); // <<< ADICIONAR scrapeIfood

// Rota para fazer o scraping de uma URL do iFood (extração detalhada)
// POST /api/ifood/extrair
router.post("/extrair", extrairDadosIfood); // <<< ROTA EXISTENTE

// Nova rota para scraping simplificado (mock)
// POST /api/ifood/scrape
router.post("/scrape", scrapeIfood); // <<< NOVA ROTA

module.exports = router;

