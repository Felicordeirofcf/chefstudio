const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const metaController = require("../controllers/metaController");

/**
 * @swagger
 * tags:
 *   name: Meta
 *   description: Endpoints para integração com Facebook/Meta Ads
 */

/**
 * @swagger
 * /api/meta/auth-url:
 *   get:
 *     summary: Obtém a URL de autorização do Facebook/Meta
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: URL de autorização obtida com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authUrl:
 *                   type: string
 *                   description: URL para redirecionar o usuário para autenticação no Facebook
 *       401:
 *         description: Não autorizado (token inválido ou ausente)
 *       500:
 *         description: "Erro interno do servidor (ex: variáveis de ambiente faltando)"
 */
router.get("/auth-url", protect, metaController.getMetaAuthUrl);

/**
 * @swagger
 * /api/meta/callback:
 *   get:
 *     summary: Callback do Facebook após autenticação
 *     tags: [Meta]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Código de autorização retornado pelo Facebook
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         required: true
 *         description: Parâmetro de estado (userId) para segurança
 *     responses:
 *       302:
 *         description: Redireciona para o frontend após processar o callback (sucesso ou erro)
 *       400:
 *         description: Código de autorização ou state ausente
 *       500:
 *         description: Erro no processamento do callback
 */
router.get("/callback", metaController.facebookCallback);

/**
 * @swagger
 * /api/meta/connection-status:
 *   get:
 *     summary: Obtém o status da conexão Meta e dados associados (contas, páginas)
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status da conexão e dados obtidos com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isConnected:
 *                   type: boolean
 *                   description: Indica se o usuário está conectado ao Meta
 *                 adAccounts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       account_id:
 *                         type: string
 *                       name:
 *                         type: string
 *                   description: Lista de contas de anúncios associadas
 *                 metaPages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       access_token:
 *                         type: string
 *                   description: Lista de páginas do Facebook associadas (com Page Access Token)
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno ao verificar status da conexão Meta
 */
router.get("/connection-status", protect, metaController.getConnectionStatus); // Rota adicionada e protegida

/**
 * @swagger
 * /api/meta/disconnect:
 *   post:
 *     summary: Desconecta a conta Meta do usuário
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conta Meta desconectada com sucesso
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno ao desconectar conta Meta
 */
router.post("/disconnect", protect, metaController.disconnectMeta); // Rota adicionada e protegida (se existir)

module.exports = router;




/**
 * @swagger
 * /api/meta/metrics:
 *   get:
 *     summary: Obtém métricas de anúncios do Meta Ads para a conta principal
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [today, yesterday, last_7_days, last_30_days, this_month, last_month]
 *           default: last_30_days
 *         description: O período de tempo para buscar as métricas.
 *     responses:
 *       200:
 *         description: Métricas obtidas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 impressions:
 *                   type: number
 *                 clicks:
 *                   type: number
 *                 spend:
 *                   type: number
 *                 ctr:
 *                   type: number
 *       400:
 *         description: Conta de anúncios principal não definida ou timeRange inválido
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno ao buscar métricas
 */
router.get("/metrics", protect, metaController.getMetaMetrics); // Rota para buscar métricas
