const express = require("express");
const router = express.Router();
const menuController = require("../controllers/menuController");
// const { protect } = require("../middleware/authMiddleware"); // Ative quando quiser proteger

/**
 * @swagger
 * tags:
 *   name: Menu
 *   description: Gestão de itens de cardápio (simulado)
 */

/**
 * @swagger
 * /api/menu:
 *   get:
 *     summary: Retorna todos os itens do menu (simulado)
 *     tags: [Menu]
 *     responses:
 *       200:
 *         description: Lista de itens retornada com sucesso
 */
router.get("/", /* protect, */ menuController.getAllMenuItems);

/**
 * @swagger
 * /api/menu:
 *   post:
 *     summary: Adiciona novo item ao menu (simulado)
 *     tags: [Menu]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Item adicionado com sucesso
 */
router.post("/", /* protect, */ menuController.addMenuItem);

/**
 * @swagger
 * /api/menu/{id}:
 *   get:
 *     summary: Retorna item de menu por ID (simulado)
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do item de menu
 *     responses:
 *       200:
 *         description: Item encontrado
 *       404:
 *         description: Item não encontrado
 */
router.get("/:id", /* protect, */ menuController.getMenuItemById);

/**
 * @swagger
 * /api/menu/{id}:
 *   put:
 *     summary: Atualiza um item do menu (simulado)
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do item a ser atualizado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item atualizado com sucesso
 *       404:
 *         description: Item não encontrado
 */
router.put("/:id", /* protect, */ menuController.updateMenuItem);

/**
 * @swagger
 * /api/menu/{id}:
 *   delete:
 *     summary: Remove um item do menu (simulado)
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do item a ser deletado
 *     responses:
 *       200:
 *         description: Item deletado com sucesso
 *       404:
 *         description: Item não encontrado
 */
router.delete("/:id", /* protect, */ menuController.deleteMenuItem);

module.exports = router;
