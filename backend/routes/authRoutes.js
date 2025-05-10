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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 metaUserId:
 *                   type: string
 *                 metaConnectionStatus:
 *                   type: string
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
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         required: true
 *         description: Token JWT que representa o usuário autenticado
 *     responses:
 *       200:
 *         description: Conta conectada com sucesso
 *       400:
 *         description: Código ou estado ausente ou inválido
 *       500:
 *         description: Erro ao trocar código por token
 */
router.get("/facebook/callback", authController.facebookCallback); // Simplificado

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 metaUserId:
 *                   type: string
 *                 metaConnectionStatus:
 *                   type: string
 *                 plan:
 *                   type: string
 *                   nullable: true
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Usuário não encontrado
 */
router.get("/profile", protect, authController.getProfile);

module.exports = router;
