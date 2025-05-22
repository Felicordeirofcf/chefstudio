// Implementação da rota de menu para o backend

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// Modelo para os itens do menu
// Corrigido para usar a capitalização correta do arquivo
const MenuItem = require('../models/MenuItem');

/**
 * @swagger
 * /api/menu:
 *   get:
 *     summary: Obtém todos os itens do cardápio
 *     tags: [Menu]
 *     responses:
 *       200:
 *         description: Lista de itens do cardápio obtida com sucesso
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', async (req, res) => {
  try {
    console.log('Buscando itens do cardápio');
    
    // Buscar todos os itens do cardápio
    const menuItems = await MenuItem.find({});
    
    console.log(`Encontrados ${menuItems.length} itens do cardápio`);
    
    // Retornar os itens do cardápio
    res.json(menuItems);
  } catch (error) {
    console.error('Erro ao buscar itens do cardápio:', error);
    res.status(500).json({ 
      message: 'Erro ao buscar itens do cardápio', 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/menu:
 *   post:
 *     summary: Adiciona um novo item ao cardápio
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome do item
 *               price:
 *                 type: number
 *                 description: Preço do item
 *               description:
 *                 type: string
 *                 description: Descrição do item
 *               imageUrl:
 *                 type: string
 *                 description: URL da imagem do item
 *               category:
 *                 type: string
 *                 description: Categoria do item
 *     responses:
 *       201:
 *         description: Item adicionado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    console.log('Adicionando novo item ao cardápio');
    console.log('Dados recebidos:', JSON.stringify(req.body));
    
    const { name, price, description, imageUrl, category } = req.body;
    
    // Validar campos obrigatórios
    if (!name || !price) {
      console.log('Erro de validação: campos obrigatórios ausentes', { name: !!name, price: !!price });
      return res.status(400).json({ 
        message: 'Nome e preço são obrigatórios', 
        details: { 
          name: name ? 'válido' : 'ausente ou inválido', 
          price: price ? 'válido' : 'ausente ou inválido' 
        } 
      });
    }
    
    // Criar novo item
    const menuItem = new MenuItem({
      name,
      price,
      description,
      imageUrl,
      category,
      userId: req.user.userId // Associar ao usuário que criou
    });
    
    // Salvar no banco de dados
    const savedItem = await menuItem.save();
    console.log('Item adicionado com sucesso, ID:', savedItem._id);
    
    // Retornar o item criado
    res.status(201).json(savedItem);
  } catch (error) {
    console.error('Erro ao adicionar item ao cardápio:', error);
    res.status(500).json({ 
      message: 'Erro ao adicionar item ao cardápio', 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/menu/{id}:
 *   get:
 *     summary: Obtém um item específico do cardápio
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do item
 *     responses:
 *       200:
 *         description: Item obtido com sucesso
 *       404:
 *         description: Item não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/:id', async (req, res) => {
  try {
    console.log('Buscando item do cardápio, ID:', req.params.id);
    
    // Buscar item pelo ID
    const menuItem = await MenuItem.findById(req.params.id);
    
    // Verificar se o item existe
    if (!menuItem) {
      console.log('Item não encontrado, ID:', req.params.id);
      return res.status(404).json({ message: 'Item não encontrado' });
    }
    
    // Retornar o item
    res.json(menuItem);
  } catch (error) {
    console.error('Erro ao buscar item do cardápio:', error);
    res.status(500).json({ 
      message: 'Erro ao buscar item do cardápio', 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/menu/{id}:
 *   put:
 *     summary: Atualiza um item do cardápio
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome do item
 *               price:
 *                 type: number
 *                 description: Preço do item
 *               description:
 *                 type: string
 *                 description: Descrição do item
 *               imageUrl:
 *                 type: string
 *                 description: URL da imagem do item
 *               category:
 *                 type: string
 *                 description: Categoria do item
 *     responses:
 *       200:
 *         description: Item atualizado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Item não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    console.log('Atualizando item do cardápio, ID:', req.params.id);
    console.log('Dados recebidos:', JSON.stringify(req.body));
    
    // Buscar item pelo ID
    const menuItem = await MenuItem.findById(req.params.id);
    
    // Verificar se o item existe
    if (!menuItem) {
      console.log('Item não encontrado, ID:', req.params.id);
      return res.status(404).json({ message: 'Item não encontrado' });
    }
    
    // Verificar se o usuário é o proprietário do item
    if (menuItem.userId && menuItem.userId.toString() !== req.user.userId) {
      console.log('Usuário não autorizado a atualizar este item');
      return res.status(401).json({ message: 'Não autorizado a atualizar este item' });
    }
    
    // Atualizar campos
    const { name, price, description, imageUrl, category } = req.body;
    
    if (name) menuItem.name = name;
    if (price) menuItem.price = price;
    if (description !== undefined) menuItem.description = description;
    if (imageUrl !== undefined) menuItem.imageUrl = imageUrl;
    if (category !== undefined) menuItem.category = category;
    
    // Salvar alterações
    const updatedItem = await menuItem.save();
    console.log('Item atualizado com sucesso');
    
    // Retornar o item atualizado
    res.json(updatedItem);
  } catch (error) {
    console.error('Erro ao atualizar item do cardápio:', error);
    res.status(500).json({ 
      message: 'Erro ao atualizar item do cardápio', 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/menu/{id}:
 *   delete:
 *     summary: Remove um item do cardápio
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do item
 *     responses:
 *       200:
 *         description: Item removido com sucesso
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Item não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    console.log('Removendo item do cardápio, ID:', req.params.id);
    
    // Buscar item pelo ID
    const menuItem = await MenuItem.findById(req.params.id);
    
    // Verificar se o item existe
    if (!menuItem) {
      console.log('Item não encontrado, ID:', req.params.id);
      return res.status(404).json({ message: 'Item não encontrado' });
    }
    
    // Verificar se o usuário é o proprietário do item
    if (menuItem.userId && menuItem.userId.toString() !== req.user.userId) {
      console.log('Usuário não autorizado a remover este item');
      return res.status(401).json({ message: 'Não autorizado a remover este item' });
    }
    
    // Remover o item
    await MenuItem.findByIdAndDelete(req.params.id);
    console.log('Item removido com sucesso');
    
    // Retornar sucesso
    res.json({ message: 'Item removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover item do cardápio:', error);
    res.status(500).json({ 
      message: 'Erro ao remover item do cardápio', 
      error: error.message 
    });
  }
});

module.exports = router;
