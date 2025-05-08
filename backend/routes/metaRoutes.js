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

// --------- Simulações ---------

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
 *         description: Conexão simulada com Meta Ads
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
 *         description: Status simulado retornado
 */
router.get("/status", protect, metaController.getMetaConnectionStatus);

/**
 * @swagger
 * /api/meta/generate-caption:
 *   post:
 *     summary: Gera uma legenda simulada com IA para anúncio
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
 *         description: Legenda gerada com sucesso
 */
router.post("/generate-caption", protect, metaController.generateAdCaption);

// --------- Facebook OAuth real ---------

/**
 * @swagger
 * /api/meta/login:
 *   get:
 *     summary: Inicia o login real com o Facebook (OAuth)
 *     tags: [Meta]
 *     responses:
 *       302:
 *         description: Redireciona para página de login do Facebook
 */
router.get("/login", metaController.loginWithFacebook);

/**
 * @swagger
 * /api/meta/callback:
 *   get:
 *     summary: Callback do Facebook OAuth (real)
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Autenticação e armazenamento do token Meta
 */
router.get("/callback", protect, metaController.facebookCallback);

// --------- API Real: Meta Ads ---------

/**
 * @swagger
 * /api/meta/adaccounts:
 *   get:
 *     summary: Retorna contas de anúncio vinculadas ao usuário logado
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de contas de anúncio
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
 *                 example: "123456789"
 *               name:
 *                 type: string
 *                 example: "Campanha ChefiaStudio"
 *               objective:
 *                 type: string
 *                 example: "LINK_CLICKS"
 *               status:
 *                 type: string
 *                 example: "PAUSED"
 *     responses:
 *       201:
 *         description: Campanha criada com sucesso
 *       400:
 *         description: Erro de validação ou API Meta
 */
router.post("/create-campaign", protect, metaController.createMetaCampaign);

/**
 * @swagger
 * /api/meta/create-adset:
 *   post:
 *     summary: Cria um conjunto de anúncios (Ad Set) real
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
 *                 example: "123456789"
 *               campaignId:
 *                 type: string
 *                 example: "23894324321540011"
 *               name:
 *                 type: string
 *                 example: "AdSet Segmento RJ"
 *               daily_budget:
 *                 type: string
 *                 example: "1000"
 *               optimization_goal:
 *                 type: string
 *                 example: "LINK_CLICKS"
 *               billing_event:
 *                 type: string
 *                 example: "IMPRESSIONS"
 *               start_time:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-05-10T12:00:00-0300"
 *               end_time:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-05-20T23:59:00-0300"
 *               geo_locations:
 *                 type: object
 *                 example: { countries: ["BR"] }
 *     responses:
 *       201:
 *         description: Ad Set criado com sucesso
 *       400:
 *         description: Erro na requisição ou API Meta
 */
router.post("/create-adset", protect, metaController.createAdSet);

/**
 * @swagger
 * /api/meta/test:
 *   get:
 *     summary: Testa se o token JWT está sendo validado corretamente
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

/**
 * @swagger
 * /api/meta/create-ad:
 *   post:
 *     summary: Cria um anúncio real (Ad Creative + Ad) no Meta Ads
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
 *                 example: "123456789"
 *               adSetId:
 *                 type: string
 *                 example: "23894324321540012"
 *               name:
 *                 type: string
 *                 example: "Anúncio Hamburguer"
 *               pageId:
 *                 type: string
 *                 example: "112233445566778"
 *               message:
 *                 type: string
 *                 example: "Aproveite nossa promoção exclusiva!"
 *               link:
 *                 type: string
 *                 example: "https://seurestaurante.com/oferta"
 *               image_url:
 *                 type: string
 *                 example: "https://cdn.meusite.com/img/hamburguer.jpg"
 *     responses:
 *       201:
 *         description: Anúncio criado com sucesso
 *       400:
 *         description: Erro ao criar o anúncio
 */
router.post("/create-ad", protect, metaController.createAdCreative);


module.exports = router;
