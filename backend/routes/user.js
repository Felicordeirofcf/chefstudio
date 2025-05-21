const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/user');

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Obtém lista de usuários (apenas para administradores)
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários obtida com sucesso
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Verificar se o usuário é administrador (implementação futura)
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ message: 'Erro ao buscar usuários', error: error.message });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Obtém informações de um usuário específico
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário
 *     responses:
 *       200:
 *         description: Informações do usuário obtidas com sucesso
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    res.json(user);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ message: 'Erro ao buscar usuário', error: error.message });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Atualiza informações de um usuário
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               establishmentName:
 *                 type: string
 *               businessType:
 *                 type: string
 *               whatsapp:
 *                 type: string
 *               menuLink:
 *                 type: string
 *               address:
 *                 type: string
 *               cep:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    // Verificar se o usuário está atualizando seu próprio perfil ou é administrador
    if (req.user.userId !== req.params.id) {
      // Implementar verificação de administrador no futuro
      return res.status(401).json({ message: 'Não autorizado a atualizar este usuário' });
    }
    
    const { name, email, establishmentName, businessType, whatsapp, menuLink, address, cep } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Atualizar campos
    if (name) user.name = name;
    if (email) user.email = email;
    if (establishmentName) user.establishmentName = establishmentName;
    if (businessType) user.businessType = businessType;
    if (whatsapp) user.whatsapp = whatsapp;
    if (menuLink) user.menuLink = menuLink;
    if (address) user.address = address;
    if (cep) user.cep = cep;
    
    const updatedUser = await user.save();
    
    res.json({
      message: 'Usuário atualizado com sucesso',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        establishmentName: updatedUser.establishmentName,
        businessType: updatedUser.businessType,
        whatsapp: updatedUser.whatsapp,
        menuLink: updatedUser.menuLink,
        address: updatedUser.address,
        cep: updatedUser.cep
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ message: 'Erro ao atualizar usuário', error: error.message });
  }
});

/**
 * @swagger
 * /api/users/{id}/plan:
 *   put:
 *     summary: Atualiza o plano de um usuário
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan
 *             properties:
 *               plan:
 *                 type: string
 *                 description: Nome do plano (free, premium, etc)
 *     responses:
 *       200:
 *         description: Plano atualizado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.put('/:id/plan', authMiddleware, async (req, res) => {
  try {
    // Verificar se o usuário está atualizando seu próprio plano ou é administrador
    if (req.user.userId !== req.params.id) {
      // Implementar verificação de administrador no futuro
      return res.status(401).json({ message: 'Não autorizado a atualizar este plano' });
    }
    
    const { plan } = req.body;
    if (!plan) {
      return res.status(400).json({ message: 'Plano é obrigatório' });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Atualizar plano
    user.plan = plan;
    await user.save();
    
    res.json({
      message: 'Plano atualizado com sucesso',
      plan: user.plan
    });
  } catch (error) {
    console.error('Erro ao atualizar plano:', error);
    res.status(500).json({ message: 'Erro ao atualizar plano', error: error.message });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Remove um usuário
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário
 *     responses:
 *       200:
 *         description: Usuário removido com sucesso
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Verificar se o usuário está removendo sua própria conta ou é administrador
    if (req.user.userId !== req.params.id) {
      // Implementar verificação de administrador no futuro
      return res.status(401).json({ message: 'Não autorizado a remover este usuário' });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    await User.deleteOne({ _id: req.params.id });
    
    res.json({ message: 'Usuário removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover usuário:', error);
    res.status(500).json({ message: 'Erro ao remover usuário', error: error.message });
  }
});

module.exports = router;
