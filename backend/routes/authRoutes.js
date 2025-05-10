const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Rotas de autenticação de usuário
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Realiza login do usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *       401:
 *         description: Credenciais inválidas
 */
router.post("/login", authController.loginUser);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registra novo usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuário registrado com sucesso
 *       400:
 *         description: Email já cadastrado
 */
router.post("/register", authController.registerUser);

/**
 * @swagger
 * /api/auth/facebook/callback:
 *   get:
 *     summary: Callback de autenticação do Facebook
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Código de autorização do Facebook
 *     responses:
 *       200:
 *         description: Conta conectada com sucesso
 *       400:
 *         description: Código ausente ou inválido
 *       500:
 *         description: Erro ao trocar código por token
 */
router.get("/facebook/callback", async (req, res) => {
  const { code, userId } = req.query;

  if (!code || !userId) {
    return res.status(400).json({ message: "Código ou ID do usuário ausente" });
  }

  try {
    // Chama o método do controller para realizar o callback
    await authController.facebookCallback(req, res);
  } catch (error) {
    // Caso haja erro, retorna uma mensagem personalizada
    res.status(500).json({ message: "Erro interno ao processar o callback", error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Retorna o perfil do usuário autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil do usuário retornado com sucesso
 *       401:
 *         description: Não autorizado
 */
router.get("/profile", protect, authController.getProfile);

module.exports = router;
