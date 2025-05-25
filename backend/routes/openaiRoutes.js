const express = require('express');
const router = express.Router();
const { gerarLegendaController } = require('../controllers/openaiController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Rota para gerar legenda com IA
router.post('/gerar-legenda', authenticateToken, gerarLegendaController);

module.exports = router;
