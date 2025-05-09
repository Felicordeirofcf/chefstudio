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

// ----------- SIMULAÇÕES E UTILIDADES -----------

/**
 * @swagger
 * /api/meta/connect:
 *   post:
 *     tags: [Meta]
 *     summary: Simula conexão com conta Meta Ads
 *     security: [bearerAuth: []]
 *     responses:
 *       200:
 *         description: Conexão simulada com sucesso
 */
router.post("/connect", protect, metaController.connectMetaAccount);

/**
 * @swagger
 * /api/meta/status:
 *   get:
 *     tags: [Meta]
 *     summary: Retorna status simulado da conexão com Meta Ads
 *     security: [bearerAuth: []]
 *     responses:
 *       200:
 *         description: Status retornado
 */
router.get("/status", protect, metaController.getMetaConnectionStatus);

/**
 * @swagger
 * /api/meta/generate-caption:
 *   post:
 *     tags: [Meta]
 *     summary: Gera uma legenda simulada para anúncio
 *     security: [bearerAuth: []]
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

// ----------- AUTENTICAÇÃO COM FACEBOOK -----------

/**
 * @swagger
 * /api/meta/login:
 *   get:
 *     tags: [Meta]
 *     summary: Redireciona para autenticação com o Facebook
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirecionamento para login no Facebook
 */
router.get("/login", metaController.loginWithFacebook);

/**
 * @swagger
 * /api/meta/callback:
 *   get:
 *     tags: [Meta]
 *     summary: Callback do Facebook após autenticação
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Redirecionamento para dashboard após sucesso
 */
router.get("/callback", metaController.facebookCallback);

// ----------- CONTAS E CRIAÇÃO DE ANÚNCIOS -----------

/**
 * @swagger
 * /api/meta/adaccounts:
 *   get:
 *     tags: [Meta]
 *     summary: Lista contas de anúncio conectadas
 *     security: [bearerAuth: []]
 *     responses:
 *       200:
 *         description: Lista de contas retornada
 */
router.get("/adaccounts", protect, metaController.getAdAccounts);

/**
 * @swagger
 * /api/meta/create-campaign:
 *   post:
 *     tags: [Meta]
 *     summary: Cria campanha real na conta de anúncios
 *     security: [bearerAuth: []]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
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
 *     tags: [Meta]
 *     summary: Cria Ad Set real na campanha
 *     security: [bearerAuth: []]
 *     responses:
 *       201:
 *         description: Ad Set criado com sucesso
 */
router.post("/create-adset", protect, metaController.createAdSet);

/**
 * @swagger
 * /api/meta/create-ad:
 *   post:
 *     tags: [Meta]
 *     summary: Cria Ad Creative e anúncio real
 *     security: [bearerAuth: []]
 *     responses:
 *       201:
 *         description: Anúncio criado com sucesso
 */
router.post("/create-ad", protect, metaController.createAdCreative);

// ----------- TESTE DE ROTA PROTEGIDA -----------

/**
 * @swagger
 * /api/meta/test:
 *   get:
 *     tags: [Meta]
 *     summary: Rota protegida de teste
 *     security: [bearerAuth: []]
 *     responses:
 *       200:
 *         description: Sucesso na proteção da rota
 */
router.get("/test", protect, (req, res) => {
  res.send("🔒 Rota protegida funcionando");
});

module.exports = router;
