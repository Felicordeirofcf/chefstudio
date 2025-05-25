const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

// Importar o controller e o middleware de upload
const { 
  publishPostAndCreateAd, 
  upload, 
  criarCampanha // Manter se necessário para outras rotas
} = require("../controllers/metaAdsController");

/**
 * @swagger
 * tags:
 *   name: Meta Ads
 *   description: Integração com a API de Anúncios da Meta (Facebook/Instagram)
 */

// Rota antiga (manter se ainda usada, senão remover)
// router.post("/campanhas", protect, criarCampanha);

/**
 * @swagger
 * /api/meta-ads/publicar-post-criar-anuncio:
 *   post:
 *     summary: Publica uma imagem com legenda na página do Facebook e cria um anúncio para impulsioná-la.
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
 *               - caption
 *               - pageId
 *               - adAccountId
 *               - campaignName
 *               - weeklyBudget
 *               - startDate
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo de imagem para o post.
 *               caption:
 *                 type: string
 *                 description: Legenda para o post (gerada por IA ou manual).
 *                 example: "Experimente nosso novo prato especial! #delicia #restaurante"
 *               pageId:
 *                 type: string
 *                 description: ID da Página do Facebook onde o post será publicado.
 *                 example: "123456789012345"
 *               adAccountId:
 *                 type: string
 *                 description: ID da Conta de Anúncios (sem o prefixo 'act_').
 *                 example: "987654321098765"
 *               campaignName:
 *                 type: string
 *                 description: Nome para a nova campanha de anúncio.
 *                 example: "Impulsionamento Post IA - Maio"
 *               weeklyBudget:
 *                 type: number
 *                 format: float
 *                 description: Orçamento semanal desejado em BRL (ex: 70.00).
 *                 example: 70
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Data de início da campanha (YYYY-MM-DD).
 *                 example: "2025-05-26"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: (Opcional) Data de término da campanha (YYYY-MM-DD).
 *                 example: "2025-06-01"
 *     responses:
 *       200:
 *         description: Post publicado e anúncio criado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Post publicado e anúncio criado com sucesso (iniciado em pausa)."
 *                 postId:
 *                   type: string
 *                   example: "123456789012345_1020304050607080"
 *                 campaignId:
 *                   type: string
 *                   example: "23849000000001"
 *                 adSetId:
 *                   type: string
 *                   example: "23849000000002"
 *                 adId:
 *                   type: string
 *                   example: "23849000000003"
 *                 adsManagerUrl:
 *                   type: string
 *                   example: "https://business.facebook.com/adsmanager/manage/campaigns?act=987654321098765"
 *       400:
 *         description: Requisição inválida (campos faltando, imagem ausente).
 *       401:
 *         description: Não autorizado (token inválido, usuário não encontrado ou sem token FB).
 *       500:
 *         description: Erro interno do servidor ou erro na API do Facebook.
 */
router.post(
  "/publicar-post-criar-anuncio", 
  protect, 
  upload.single("image"), // Middleware multer para processar o upload da imagem
  publishPostAndCreateAd
);

module.exports = router;

