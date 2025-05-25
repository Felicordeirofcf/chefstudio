const express = require('express');
const router = express.Router();

// Importação explícita da função criarCampanha
const { criarCampanha } = require('../controllers/metaAdsController');

// Definição da rota POST /campanhas
router.post('/campanhas', criarCampanha);

module.exports = router;
