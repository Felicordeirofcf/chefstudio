const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Notification = require('../models/notification');

// Rota para obter notificações do usuário
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 20, skip = 0, read } = req.query;
    
    // Construir filtro
    const filter = { userId: req.user._id };
    if (read !== undefined) {
      filter.read = read === 'true';
    }
    
    // Obter notificações
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));
    
    // Contar total de notificações não lidas
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user._id, 
      read: false 
    });
    
    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Erro ao obter notificações:', error);
    res.status(500).json({ message: 'Erro ao obter notificações' });
  }
});

// Rota para marcar notificação como lida
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se a notificação existe e pertence ao usuário
    const notification = await Notification.findOne({ 
      _id: id, 
      userId: req.user._id 
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notificação não encontrada' });
    }
    
    // Marcar como lida
    notification.read = true;
    await notification.save();
    
    res.json({ message: 'Notificação marcada como lida' });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ message: 'Erro ao marcar notificação como lida' });
  }
});

// Rota para marcar todas as notificações como lidas
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    // Marcar todas as notificações do usuário como lidas
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { $set: { read: true } }
    );
    
    res.json({ message: 'Todas as notificações marcadas como lidas' });
  } catch (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error);
    res.status(500).json({ message: 'Erro ao marcar todas as notificações como lidas' });
  }
});

// Rota para excluir notificação
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se a notificação existe e pertence ao usuário
    const notification = await Notification.findOne({ 
      _id: id, 
      userId: req.user._id 
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notificação não encontrada' });
    }
    
    // Excluir notificação
    await notification.deleteOne();
    
    res.json({ message: 'Notificação excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir notificação:', error);
    res.status(500).json({ message: 'Erro ao excluir notificação' });
  }
});

// Rota para criar notificação (para testes)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, message, type, entityType, entityId } = req.body;
    
    // Criar notificação
    const notification = new Notification({
      userId: req.user._id,
      title,
      message,
      type: type || 'info',
      entityType: entityType || 'system',
      entityId
    });
    
    await notification.save();
    
    res.status(201).json(notification);
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    res.status(500).json({ message: 'Erro ao criar notificação' });
  }
});

module.exports = router;
