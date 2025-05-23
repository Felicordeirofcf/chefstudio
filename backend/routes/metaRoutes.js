const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const metaController = require("../controllers/metaController");

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
router.get("/auth-url", protect, metaController.getMetaAuthUrl); // Rota adicionada

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
 *         required: false
 *         description: Parâmetro de estado opcional para segurança
 *     responses:
 *       302:
 *         description: Redireciona para o frontend após processar o callback (sucesso ou erro)
 *       400:
 *         description: Código de autorização não fornecido
 *       500:
 *         description: Erro no processamento do callback
 */
router.get("/callback", metaController.facebookCallback);

// Manter as outras rotas existentes...
// Exemplo:
// router.get("/status", protect, metaController.getConnectionStatus);
// router.post("/disconnect", protect, metaController.disconnectMeta);

module.exports = router;

