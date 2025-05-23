const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const metaController = require("../controllers/metaController");
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
 *                 description: Nome da campanha.
 *               pageId:
 *                 type: string
 *                 description: ID da página do Facebook selecionada.
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
 *                 description: Tipo de anúncio ('image' ou 'post').
 *               adTitle:
 *                 type: string
 *                 description: Título do anúncio (opcional).
 *               adDescription:
 *                 type: string
 *                 description: Descrição/texto principal do anúncio.
 *               imageFile:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo de imagem (obrigatório se adType='image').
 *               postUrl:
 *                 type: string
 *                 description: URL da publicação (obrigatório se adType='post').
 *               callToAction:
 *                 type: string
 *                 description: Tipo de CTA (ex: 'LEARN_MORE', 'SHOP_NOW').
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
// Usar upload.single('imageFile') para lidar com o upload da imagem
router.post("/create-recommended-traffic-campaign", protect, upload.single('imageFile'), metaController.createRecommendedTrafficCampaign);

// Adicione outras rotas do Meta Ads aqui, se necessário (ex: create-from-post, create-from-image)

module.exports = router;

