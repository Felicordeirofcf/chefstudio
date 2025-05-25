const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { updateServer } = require('../server');

// Importar controllers
const metaAdsRoutes = require('./metaAdsRoutes');
const metaRoutes = require('./metaRoutes');
const openaiRoutes = require('./openaiRoutes');

// Definir rotas
router.use('/meta-ads', metaAdsRoutes);
router.use('/meta', metaRoutes);
router.use('/openai', openaiRoutes);

// Rota de teste para verificar se a API está funcionando
router.get('/status', (req, res) => {
  res.json({ status: 'API funcionando corretamente!' });
});

// Rota protegida de exemplo
router.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Rota protegida acessada com sucesso!', user: req.user });
});

module.exports = router;
