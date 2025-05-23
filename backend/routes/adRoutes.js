const express = require("express");
const router = express.Router();
const { 
  getAllCampaigns, 
  createCampaign, 
  getCampaignById, 
  updateCampaignStatus, 
  getCampaignMetrics,
  saveLocationSettings,
  getLocationSettings
} = require("../controllers/adController");
// Importar a função correta do metaController
const { createRecommendedTrafficCampaign } = require("../controllers/metaController"); 
const { protect } = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path"); // Import path module

// Configuração do Multer (sintaxe corrigida na linha 22)
const storage = multer.diskStorage({ 
    destination: function (req, file, cb) {
        cb(null, '/tmp/'); // Diretório temporário - Sintaxe corrigida
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)); 
    }
});
const upload = multer({ storage: storage });

/**
 * @swagger
 * tags:
 *   name: Ads
 *   description: Endpoints para gerenciamento de campanhas e anúncios (geral e Meta Ads)
 */

// Rotas para configurações de localização
router.post("/location", protect, saveLocationSettings);
router.get("/location", protect, getLocationSettings);

/**
 * @swagger
 * /api/ads/create-recommended-traffic-campaign:
 *   post:
 *     summary: Cria uma campanha de tráfego recomendada no Meta Ads (Rota Principal)
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               adAccountId:
 *                 type: string
 *                 description: ID da conta de anúncios Meta (ex: act_12345).
 *               pageId:
 *                 type: string
 *                 description: ID da página do Facebook selecionada.
 *               campaignName:
 *                 type: string
 *                 description: Nome da campanha.
 *               weeklyBudget:
 *                 type: number
 *                 description: Orçamento semanal em R$.
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Data de início (YYYY-MM-DD).
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Data de término (opcional, YYYY-MM-DD).
 *               location:
 *                 type: string
 *                 description: Objeto JSON stringificado { latitude, longitude, radius }.
 *               adType:
 *                 type: string
 *                 enum: [image, post]
 *                 description: Tipo de anúncio (
"image"
 ou 
"post"
).
 *               adTitle:
 *                 type: string
 *                 description: Título do anúncio (opcional).
 *               adDescription:
 *                 type: string
 *                 description: Descrição/texto principal do anúncio.
 *               imageFile:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo de imagem (obrigatório se adType=
"image"
).
 *               postUrl:
 *                 type: string
 *                 description: URL da publicação (obrigatório se adType=
"post"
).
 *               callToAction:
 *                 type: string
 *                 description: Tipo de CTA (ex: 
"LEARN_MORE"
, 
"SHOP_NOW"
).
 *               menuUrl:
 *                 type: string
 *                 description: Link de destino (URL do cardápio).
 *     responses:
 *       201:
 *         description: Campanha criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 campaignId:
 *                   type: string
 *                 adSetId:
 *                   type: string
 *                 adId:
 *                   type: string
 *       400:
 *         description: Parâmetros inválidos ou ausentes
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
// Usar upload.single(
"imageFile"
) para lidar com o upload da imagem
// A função createRecommendedTrafficCampaign é importada do metaController
router.post("/create-recommended-traffic-campaign", protect, upload.single(
"imageFile"
), createRecommendedTrafficCampaign);


module.exports = router;

