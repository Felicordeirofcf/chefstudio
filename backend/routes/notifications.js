const { authMiddleware } = require('../middleware/auth');
const express = require('express');
const router = express.Router();

// Rota para obter todas as notificações do usuário
router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log('Obtendo notificações do usuário:', req.user.userId);
    
    // Simulação de notificações para teste
    const notifications = [
      {
        id: '1',
        title: 'Bem-vindo ao ChefStudio',
        message: 'Obrigado por se cadastrar! Comece a criar suas campanhas agora.',
        read: false,
        createdAt: new Date()
      }
    ];
    
    res.status(200).json({ notifications });
  } catch (error) {
    console.error('Erro ao obter notificações:', error);
    res.status(500).json({ 
      message: 'Erro ao obter notificações',
      error: error.message
    });
  }
});

// Marcar notificação como lida
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Marcando notificação como lida:', id);
    
    // Simulação de sucesso para teste
    res.status(200).json({ 
      message: 'Notificação marcada como lida',
      notificationId: id
    });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ 
      message: 'Erro ao marcar notificação como lida',
      error: error.message
    });
  }
});

module.exports = router;
