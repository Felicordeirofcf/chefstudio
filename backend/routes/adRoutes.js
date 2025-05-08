const express = require("express");
const router = express.Router();

const adController = require("../controllers/adController");
const { protect } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Ads
 *   description: Gerenciamento de campanhas e localização (simulado)
 */

/**
 * @swagger
 * /api/ads:
 *   get:
 *     summary: "Lista todas as campanhas do usuário logado"
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de campanhas retornada
 */
router.get("/", protect, adController.getAllCampaigns);

/**
 * @swagger
 * /api/ads:
 *   post:
 *     summary: "Cria uma nova campanha"
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
 *               name:
 *                 type: string
 *               objective:
 *                 type: string
 *     responses:
 *       201:
 *         description: Campanha criada com sucesso
 */
router.post("/", protect, adController.createCampaign);

/**
 * @swagger
 * /api/ads/{id}:
 *   get:
 *     summary: "Retorna uma campanha específica por ID"
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
 *         description: Campanha retornada com sucesso
 */
router.get("/:id", protect, adController.getCampaignById);

/**
 * @swagger
 * /api/ads/{id}/status:
 *   put:
 *     summary: "Atualiza o status de uma campanha (ex: PAUSED, ACTIVE)"
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
 *     summary: "Retorna métricas da campanha"
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
 *     summary: "Salva as configurações de localização"
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
 *     summary: "Retorna as configurações de localização"
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Localização atual retornada
 */
router.get("/location", protect, adController.getLocationSettings);

module.exports = router;
