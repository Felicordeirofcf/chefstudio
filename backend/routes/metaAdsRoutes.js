const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const metaController = require("../controllers/metaController");
const metaAdsController = require("../controllers/metaAdsController");
const multer = require('multer');

// Configuração do Multer para upload de imagem (salvar em memória ou temporário)
// Ajuste conforme necessário (ex: salvar em disco com nome único)
const storage = multer.diskStorage({ // Salvar em disco temporariamente
    destination: function (req, file, cb) {
        cb(null, '/tmp/') // Diretório temporário
    },
    filename: function (req, file, cb) {
        // Usar um nome único para evitar conflitos
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + require('path').extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

/**
 * @swagger
 * tags:
 *   name: Meta Ads
 *   description: Endpoints para gerenciamento de campanhas e anúncios no Meta Ads
 */

/**
 * @swagger
 * /api/meta-ads/create-recommended-traffic-campaign:
 *   post:
 *     summary: Cria uma campanha de tráfego recomendada no Meta Ads
 *     tags: [Meta Ads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               campaignName:
 *                 type: string
 *                 description: Nome da campanha
 *               pageId:
 *                 type: string
 *                 description: ID da página do Facebook selecionada
 *               weeklyBudget:
 *                 type: number
 *                 description: Orçamento semanal em R$
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Data de início (YYYY-MM-DD)
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Data de término (opcional, YYYY-MM-DD)
 *               location:
 *                 type: string
 *                 description: Objeto JSON stringificado com latitude, longitude e radius
 *               adType:
 *                 type: string
 *                 enum: [image, post]
 *                 description: Tipo de anúncio (image ou post)
 *               adTitle:
 *                 type: string
 *                 description: Título do anúncio (opcional)
 *               adDescription:
 *                 type: string
 *                 description: Descrição/texto principal do anúncio
 *               imageFile:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo de imagem (obrigatório se adType=image)
 *               postUrl:
 *                 type: string
 *                 description: URL da publicação (obrigatório se adType=post)
 *               callToAction:
 *                 type: string
 *                 description: Tipo de CTA (ex LEARN_MORE, SHOP_NOW)
 *               menuUrl:
 *                 type: string
 *                 description: Link de destino (URL do cardápio)
 *               objective:
 *                 type: string
 *                 description: Objetivo da campanha (ex LINK_CLICKS, OUTCOME_TRAFFIC)
 *                 enum: [LINK_CLICKS, OUTCOME_TRAFFIC, POST_ENGAGEMENT, LEAD_GENERATION, CONVERSIONS, OUTCOME_LEADS]
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
// Usar upload.single('imageFile') para lidar com o upload da imagem
router.post("/create-recommended-traffic-campaign", protect, upload.single('imageFile'), metaController.createRecommendedTrafficCampaign);

/**
 * @swagger
 * /api/meta-ads/create-from-image:
 *   post:
 *     summary: Cria um anúncio a partir de uma imagem
 *     tags: [Meta Ads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *               - adAccountId
 *               - pageId
 *               - campaignName
 *               - weeklyBudget
 *               - startDate
 *               - adDescription
 *               - objective
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Imagem para o anúncio
 *               image_url:
 *                 type: string
 *                 description: URL da imagem (alternativa ao upload de arquivo)
 *               adAccountId:
 *                 type: string
 *                 description: ID da conta de anúncios
 *               pageId:
 *                 type: string
 *                 description: ID da página do Facebook
 *               campaignName:
 *                 type: string
 *                 description: Nome da campanha
 *               weeklyBudget:
 *                 type: number
 *                 description: Orçamento semanal em R$
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Data de início (YYYY-MM-DD)
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Data de término (opcional, YYYY-MM-DD)
 *               location:
 *                 type: object
 *                 description: Localização para segmentação do anúncio
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     description: Latitude do centro da área
 *                   longitude:
 *                     type: number
 *                     description: Longitude do centro da área
 *                   radius:
 *                     type: number
 *                     description: Raio em km da área de segmentação
 *               adDescription:
 *                 type: string
 *                 description: Descrição/texto principal do anúncio
 *               message:
 *                 type: string
 *                 description: Texto do anúncio (alternativa a adDescription)
 *               adTitle:
 *                 type: string
 *                 description: Título do anúncio (opcional)
 *               callToAction:
 *                 type: string
 *                 description: Tipo de CTA (ex LEARN_MORE, SHOP_NOW)
 *                 enum: [LEARN_MORE, SHOP_NOW, BOOK_TRAVEL, CONTACT_US, SIGN_UP, DOWNLOAD, GET_QUOTE, SUBSCRIBE, ORDER_NOW]
 *               menuUrl:
 *                 type: string
 *                 description: Link de destino (URL do cardápio)
 *               objective:
 *                 type: string
 *                 description: Objetivo da campanha
 *                 enum: [LINK_CLICKS, OUTCOME_TRAFFIC, POST_ENGAGEMENT, LEAD_GENERATION, CONVERSIONS, OUTCOME_LEADS]
 *     responses:
 *       201:
 *         description: Anúncio criado com sucesso
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
router.post("/create-from-image", protect, upload.single('image'), metaAdsController.createFromImage);

/**
 * @swagger
 * /api/meta-ads/create-from-post:
 *   post:
 *     summary: Cria um anúncio a partir de uma publicação existente
 *     tags: [Meta Ads]
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
 *               - adAccountId
 *               - pageId
 *               - campaignName
 *               - weeklyBudget
 *               - startDate
 *               - objective
 *             properties:
 *               adAccountId:
 *                 type: string
 *                 description: ID da conta de anúncios
 *               pageId:
 *                 type: string
 *                 description: ID da página do Facebook
 *               campaignName:
 *                 type: string
 *                 description: Nome da campanha
 *               weeklyBudget:
 *                 type: number
 *                 description: Orçamento semanal em R$
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Data de início (YYYY-MM-DD)
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Data de término (opcional, YYYY-MM-DD)
 *               location:
 *                 type: object
 *                 description: Localização para segmentação do anúncio
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     description: Latitude do centro da área
 *                   longitude:
 *                     type: number
 *                     description: Longitude do centro da área
 *                   radius:
 *                     type: number
 *                     description: Raio em km da área de segmentação
 *               postUrl:
 *                 type: string
 *                 description: URL da publicação do Facebook
 *               callToAction:
 *                 type: string
 *                 description: Tipo de CTA (ex LEARN_MORE, SHOP_NOW)
 *                 enum: [LEARN_MORE, SHOP_NOW, BOOK_TRAVEL, CONTACT_US, SIGN_UP, DOWNLOAD, GET_QUOTE, SUBSCRIBE, ORDER_NOW]
 *               menuUrl:
 *                 type: string
 *                 description: Link de destino (URL do cardápio)
 *               objective:
 *                 type: string
 *                 description: Objetivo da campanha
 *                 enum: [LINK_CLICKS, OUTCOME_TRAFFIC, POST_ENGAGEMENT, LEAD_GENERATION, CONVERSIONS, OUTCOME_LEADS]
 *     responses:
 *       201:
 *         description: Anúncio criado com sucesso
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
router.post("/create-from-post", protect, metaAdsController.createFromPost);

/**
 * @swagger
 * /api/meta-ads/campaigns:
 *   get:
 *     summary: Obtém as campanhas do usuário
 *     tags: [Meta Ads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: adAccountId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da conta de anúncios para filtrar campanhas
 *     responses:
 *       200:
 *         description: Campanhas obtidas com sucesso
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get("/campaigns", protect, metaAdsController.getCampaigns);

module.exports = router;
