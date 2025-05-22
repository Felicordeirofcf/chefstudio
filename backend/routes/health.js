const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Verifica o status de saúde da API
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API funcionando corretamente
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API está funcionando corretamente',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

module.exports = router;
