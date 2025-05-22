// Versão corrigida das rotas Meta
const express = require("express");
const router = express.Router();
const metaController = require("../controllers/metaController");
const { protect } = require("../middleware/authMiddleware");

/**
 * @swagger
 * /api/meta/login:
 *   get:
 *     summary: Iniciar login com Facebook/Meta
 *     tags: [Meta]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID do usuário que está iniciando o login
 *     responses:
 *       302:
 *         description: Redirecionamento para a página de autorização do Facebook
 */
router.get("/login", metaController.facebookLogin);

/**
 * @swagger
 * /api/meta/callback:
 *   get:
 *     summary: Callback do Facebook após autorização
 *     tags: [Meta]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Código de autorização fornecido pelo Facebook
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         required: true
 *         description: Estado passado na requisição inicial (contém userId)
 *     responses:
 *       302:
 *         description: Redirecionamento para a página de callback no frontend
 */
router.get("/callback", metaController.facebookCallback);

/**
 * @swagger
 * /api/meta/connection-status:
 *   get:
 *     summary: Obter status de conexão com Meta
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status de conexão obtido com sucesso
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Usuário não encontrado
 */
router.get("/connection-status", protect, metaController.getConnectionStatus);

/**
 * @swagger
 * /api/meta/verify-connection:
 *   get:
 *     summary: Verificar e atualizar status de conexão Meta
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status de conexão verificado e atualizado
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Usuário não encontrado
 */
router.get("/verify-connection", protect, metaController.verifyConnection);

module.exports = router;
