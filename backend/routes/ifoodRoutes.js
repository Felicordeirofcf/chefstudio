const express = require("express");
const router = express.Router();
// Importar a função renomeada do controller
const { extrairDadosIfood } = require("../controllers/ifoodController"); 
const authMiddleware = require("../middleware/authMiddleware"); // Proteger a rota

// Rota para fazer o scraping de uma URL do iFood
// POST /api/ifood/extrair  <<< ROTA AJUSTADA
// Protegida por autenticação
router.post("/extrair", authMiddleware, extrairDadosIfood); // <<< USAR FUNÇÃO CORRETA

module.exports = router;

