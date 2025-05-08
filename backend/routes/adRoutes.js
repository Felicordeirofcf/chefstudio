const express = require("express");
const router = express.Router();

const adController = require("../controllers/adController");
const { protect } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Ads
 *   description: Gerenciamento de campanhas e localização com Meta Ads API
 */

/**
 * @swagger
 * /api/ads:
 *   get:
 *     summary: "Lista todas as campanhas reais da conta Meta Ads"
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: adAccountId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da conta de anúncios (ex: 123456789)
 *     responses:
 *       200:
 *         description: Lista de campanhas retornada
 */
router.get("/", protect, adController.getAllCampaigns);

/**
 * @swagger
 * /api/ads:
 *   post:
 *     summary: "Cria uma nova campanha real na conta Meta Ads"
 *     tags: [Ads]
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
 *                 example: LINK_CLICKS
 *               status:
 *                 type: string
 *                 example: PAUSED
 *     responses:
 *       201:
 *         description: Campanha criada com sucesso
 */
router.post("/", protect, adController.createCampaign);

/**
 * @swagger
 * /api/ads/{id}:
 *   get:
 *     summary: "Retorna uma campanha real por ID"
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da campanha do Meta Ads
 *     responses:
 *       200:
 *         description: Campanha retornada com sucesso
 */
router.get("/:id", protect, adController.getCampaignById);

/**
 * @swagger
 * /api/ads/{id}/status:
 *   put:
 *     summary: "Atualiza o status de uma campanha real (ex: PAUSED, ACTIVE)"
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: PAUSED
 *     responses:
 *       200:
 *         description: Status atualizado com sucesso
 */
router.put("/:id/status", protect, adController.updateCampaignStatus);

/**
 * @swagger
 * /api/ads/{id}/metrics:
 *   get:
 *     summary: "Retorna métricas da campanha real (insights)"
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Métricas da campanha retornadas
 */
router.get("/:id/metrics", protect, adController.getCampaignMetrics);

/**
 * @swagger
 * /api/ads/location:
 *   post:
 *     summary: "Salva as configurações de localização (simulado)"
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               radius:
 *                 type: number
 *     responses:
 *       201:
 *         description: Localização salva com sucesso
 */
router.post("/location", protect, adController.saveLocationSettings);

/**
 * @swagger
 * /api/ads/location:
 *   get:
 *     summary: "Retorna as configurações de localização (simulado)"
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Localização atual retornada
 */
router.get("/location", protect, adController.getLocationSettings);

module.exports = router;
