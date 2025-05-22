// Arquivo de rotas do backend corrigido para garantir consistência de endpoints
const express = require('express');
const router = express.Router();
const metaController = require('../controllers/metaController');
const { protect } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/meta/login:
 *   get:
 *     summary: Iniciar login com Facebook/Meta
 *     tags: [Meta]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID do usuário que está iniciando o login
 *     responses:
 *       302:
 *         description: Redirecionamento para a página de autorização do Facebook
 */
router.get("/login", metaController.facebookLogin);

/**
 * @swagger
 * /api/meta/callback:
 *   get:
 *     summary: Callback do Facebook após autorização
 *     tags: [Meta]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Código de autorização fornecido pelo Facebook
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         required: true
 *         description: Estado passado na requisição inicial (contém userId)
 *     responses:
 *       302:
 *         description: Redirecionamento para a página de callback no frontend
 */
router.get("/callback", metaController.facebookCallback);

/**
 * @swagger
 * /api/meta/connection-status:
 *   get:
 *     summary: Obter status de conexão com Meta
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status de conexão obtido com sucesso
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Usuário não encontrado
 */
router.get("/connection-status", protect, metaController.getConnectionStatus);

/**
 * @swagger
 * /api/meta/verify-connection:
 *   get:
 *     summary: Verificar e atualizar status de conexão Meta
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status de conexão verificado e atualizado
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Usuário não encontrado
 */
router.get("/verify-connection", protect, metaController.verifyConnection);

/**
 * @swagger
 * /api/meta/create-ad-from-post:
 *   post:
 *     summary: Criar anúncio a partir de uma publicação
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postUrl
 *               - campaignName
 *               - dailyBudget
 *               - startDate
 *             properties:
 *               postUrl:
 *                 type: string
 *               campaignName:
 *                 type: string
 *               dailyBudget:
 *                 type: number
 *               startDate:
 *                 type: string
 *               endDate:
 *                 type: string
 *               targetCountry:
 *                 type: string
 *     responses:
 *       201:
 *         description: Anúncio criado com sucesso
 *       400:
 *         description: Dados inválidos ou usuário não conectado ao Meta
 *       401:
 *         description: Não autorizado
 */
router.post("/create-ad-from-post", protect, metaController.createAdFromPost);

/**
 * @swagger
 * /api/meta/campaigns:
 *   get:
 *     summary: Obter campanhas do usuário
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Campanhas obtidas com sucesso
 *       400:
 *         description: Usuário não conectado ao Meta
 *       401:
 *         description: Não autorizado
 */
router.get("/campaigns", protect, metaController.getCampaigns);

/**
 * @swagger
 * /api/meta/create-from-image:
 *   post:
 *     summary: Criar anúncio a partir de uma imagem
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaignName
 *               - dailyBudget
 *               - startDate
 *             properties:
 *               imageUrl:
 *                 type: string
 *               campaignName:
 *                 type: string
 *               dailyBudget:
 *                 type: number
 *               startDate:
 *                 type: string
 *               endDate:
 *                 type: string
 *               targetCountry:
 *                 type: string
 *               adTitle:
 *                 type: string
 *               adDescription:
 *                 type: string
 *               callToAction:
 *                 type: string
 *               menuUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Anúncio com imagem criado com sucesso
 *       400:
 *         description: Dados inválidos ou usuário não conectado ao Meta
 *       401:
 *         description: Não autorizado
 */
router.post("/create-from-image", protect, metaController.createAdFromImage);

module.exports = router;
