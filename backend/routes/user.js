const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/user');

// Rota para obter todos os usuários (apenas para admin)
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Verificar se o usuário é admin
    const requestingUser = await User.findById(req.user.userId);
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado. Permissão de administrador necessária.' });
    }
    
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ 
      message: 'Erro ao buscar usuários',
      error: error.message
    });
  }
});

// Rota para obter um usuário específico pelo ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    // Verificar se o usuário está buscando a si mesmo ou é admin
    const requestingUser = await User.findById(req.user.userId);
    if (!requestingUser) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    if (req.user.userId !== req.params.id && requestingUser.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado. Você só pode acessar seu próprio perfil.' });
    }
    
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ 
      message: 'Erro ao buscar usuário',
      error: error.message
    });
  }
});

// Rota para atualizar um usuário
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    // Verificar se o usuário está atualizando a si mesmo ou é admin
    const requestingUser = await User.findById(req.user.userId);
    if (!requestingUser) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    if (req.user.userId !== req.params.id && requestingUser.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado. Você só pode atualizar seu próprio perfil.' });
    }
    
    // Campos que podem ser atualizados
    const { name, establishmentName, businessType, whatsapp, menuLink, address, cep } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (establishmentName) updateData.establishmentName = establishmentName;
    if (businessType) updateData.businessType = businessType;
    if (whatsapp) updateData.whatsapp = whatsapp;
    if (menuLink) updateData.menuLink = menuLink;
    if (address) updateData.address = address;
    if (cep) updateData.cep = cep;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    res.status(200).json({
      message: 'Usuário atualizado com sucesso',
      user
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ 
      message: 'Erro ao atualizar usuário',
      error: error.message
    });
  }
});

// Rota para excluir um usuário (apenas para admin ou o próprio usuário)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Verificar se o usuário está excluindo a si mesmo ou é admin
    const requestingUser = await User.findById(req.user.userId);
    if (!requestingUser) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    if (req.user.userId !== req.params.id && requestingUser.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado. Você só pode excluir seu próprio perfil.' });
    }
    
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    res.status(200).json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ 
      message: 'Erro ao excluir usuário',
      error: error.message
    });
  }
});

module.exports = router;
