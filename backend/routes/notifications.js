const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Notification = require('../models/notification');

// Obter notificações do usuário
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20, offset = 0, unreadOnly = false } = req.query;
    
    // Construir query
    const query = { userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }
    
    // Buscar notificações
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));
    
    // Contar total de não lidas
    const unreadCount = await Notification.countDocuments({ userId, read: false });
    
    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Erro ao obter notificações:', error);
    res.status(500).json({ message: 'Erro ao obter notificações' });
  }
});

// Marcar notificação como lida
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user._id;
    
    // Verificar se a notificação pertence ao usuário
    const notification = await Notification.findOne({ _id: notificationId, userId });
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

// Marcar todas as notificações como lidas
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Atualizar todas as notificações não lidas
    await Notification.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );
    
    res.json({ message: 'Todas as notificações marcadas como lidas' });
  } catch (error) {
    console.error('Erro ao marcar todas notificações como lidas:', error);
    res.status(500).json({ message: 'Erro ao marcar todas notificações como lidas' });
  }
});

// Excluir notificação
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user._id;
    
    // Verificar se a notificação pertence ao usuário
    const notification = await Notification.findOne({ _id: notificationId, userId });
    if (!notification) {
      return res.status(404).json({ message: 'Notificação não encontrada' });
    }
    
    // Excluir notificação
    await Notification.deleteOne({ _id: notificationId });
    
    res.json({ message: 'Notificação excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir notificação:', error);
    res.status(500).json({ message: 'Erro ao excluir notificação' });
  }
});

// Criar notificação (para testes e uso interno)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { type, title, message, data } = req.body;
    const userId = req.user._id;
    
    // Verificar se o usuário é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    
    // Criar notificação
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      data
    });
    
    await notification.save();
    
    res.status(201).json(notification);
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    res.status(500).json({ message: 'Erro ao criar notificação' });
  }
});

module.exports = router;
