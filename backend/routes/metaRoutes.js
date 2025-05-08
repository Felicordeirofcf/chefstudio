const express = require("express");
const router = express.Router();

const metaController = require("../controllers/metaController");
const { protect } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Meta
 *   description: Integração com Meta Ads (Facebook/Instagram)
 */

/**
 * @swagger
 * /api/meta/connect:
 *   post:
 *     summary: Simula conexão com conta Meta Ads
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conexão simulada
 */
router.post("/connect", protect, metaController.connectMetaAccount);

/**
 * @swagger
 * /api/meta/status:
 *   get:
 *     summary: Simula verificação de status da conta Meta Ads
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status simulado
 */
router.get("/status", protect, metaController.getMetaConnectionStatus);

/**
 * @swagger
 * /api/meta/generate-caption:
 *   post:
 *     summary: Gera legenda simulada com IA
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Legenda gerada
 */
router.post("/generate-caption", protect, metaController.generateAdCaption);

/**
 * @swagger
 * /api/meta/login:
 *   get:
 *     summary: Inicia o login real com Facebook (OAuth)
 *     tags: [Meta]
 *     responses:
 *       302:
 *         description: Redireciona para login do Facebook
 */
router.get("/login", metaController.loginWithFacebook);

/**
 * @swagger
 * /api/meta/callback:
 *   get:
 *     summary: Callback do Facebook OAuth
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token salvo após autenticação
 */
router.get("/callback", protect, metaController.facebookCallback);

/**
 * @swagger
 * /api/meta/adaccounts:
 *   get:
 *     summary: Retorna contas de anúncio do usuário logado
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contas retornadas com sucesso
 */
router.get("/adaccounts", protect, metaController.getAdAccounts);

/**
 * @swagger
 * /api/meta/create-campaign:
 *   post:
 *     summary: Cria uma campanha real no Meta Ads
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
 *               - adAccountId
 *               - name
 *             properties:
 *               adAccountId:
 *                 type: string
 *               name:
 *                 type: string
 *               objective:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: Campanha criada com sucesso
 */
router.post("/create-campaign", protect, metaController.createMetaCampaign);

/**
 * @swagger
 * /api/meta/create-adset:
 *   post:
 *     summary: Cria um conjunto de anúncios (ad set)
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
 *               - adAccountId
 *               - campaignId
 *               - name
 *               - daily_budget
 *               - start_time
 *               - end_time
 *             properties:
 *               adAccountId:
 *                 type: string
 *               campaignId:
 *                 type: string
 *               name:
 *                 type: string
 *               daily_budget:
 *                 type: string
 *               start_time:
 *                 type: string
 *               end_time:
 *                 type: string
 *               optimization_goal:
 *                 type: string
 *               billing_event:
 *                 type: string
 *               geo_locations:
 *                 type: object
 *     responses:
 *       201:
 *         description: Ad set criado
 */
router.post("/create-adset", protect, metaController.createAdSet);

/**
 * @swagger
 * /api/meta/create-ad:
 *   post:
 *     summary: Cria anúncio real (creative + ad)
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
 *               - adAccountId
 *               - adSetId
 *               - name
 *               - pageId
 *               - message
 *               - link
 *               - image_url
 *             properties:
 *               adAccountId:
 *                 type: string
 *               adSetId:
 *                 type: string
 *               name:
 *                 type: string
 *               pageId:
 *                 type: string
 *               message:
 *                 type: string
 *               link:
 *                 type: string
 *               image_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Anúncio criado com sucesso
 */
router.post("/create-ad", protect, metaController.createAdCreative);

/**
 * @swagger
 * /api/meta/test:
 *   get:
 *     summary: Testa autenticação via token
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rota protegida funcionando
 */
router.get("/test", protect, (req, res) => {
  res.send("🔒 Rota protegida funcionando");
});

module.exports = router;
