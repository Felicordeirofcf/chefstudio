const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const metaController = require('../controllers/metaController');

/**
 * @swagger
 * /api/meta/login:
 *   get:
 *     summary: Obter URL de autenticação do Meta
 *     tags: [Meta]
 *     responses:
 *       200:
 *         description: URL de autenticação obtida com sucesso
 *       500:
 *         description: Erro ao obter URL de autenticação
 */
router.get("/login", metaController.getMetaLoginUrl);

/**
 * @swagger
 * /api/meta/callback:
 *   get:
 *     summary: Callback do Meta após autenticação
 *     tags: [Meta]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Código de autorização
 *     responses:
 *       200:
 *         description: Autenticação realizada com sucesso
 *       400:
 *         description: Código de autorização não fornecido
 *       500:
 *         description: Erro no callback do Meta
 */
router.get("/callback", metaController.facebookCallback);

/**
 * @swagger
 * /api/meta/status:
 *   get:
 *     summary: Verificar status da conexão com o Meta
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status da conexão obtido com sucesso
 *       401:
 *         description: Não autorizado
 */
router.get("/status", protect, metaController.getConnectionStatus);

/**
 * @swagger
 * /api/meta/verify-connection:
 *   get:
 *     summary: Verificar e atualizar status da conexão com o Meta
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

/**
 * @swagger
 * /api/meta/metrics:
 *   get:
 *     summary: Obter métricas do Meta Ads
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [today, yesterday, last_7_days, this_month, last_month, last_30_days]
 *         required: false
 *         description: Intervalo de tempo para as métricas (padrão é last_30_days)
 *     responses:
 *       200:
 *         description: Métricas obtidas com sucesso
 *       400:
 *         description: Usuário não conectado ao Meta
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Usuário não encontrado
 */
router.get("/metrics", protect, metaController.getMetrics);

/**
 * @swagger
 * /api/meta/pause-campaign:
 *   post:
 *     summary: Pausar uma campanha ativa
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
 *               - campaignId
 *             properties:
 *               campaignId:
 *                 type: string
 *                 description: ID da campanha a ser pausada
 *     responses:
 *       200:
 *         description: Campanha pausada com sucesso
 *       400:
 *         description: Dados inválidos ou usuário não conectado ao Meta
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro ao pausar campanha
 */
router.post("/pause-campaign", protect, metaController.pauseCampaign);

module.exports = router;
