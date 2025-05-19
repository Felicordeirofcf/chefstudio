const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Notification = require('../models/notification');

// Obter notificações do usuário
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 20, skip = 0, read } = req.query;
    
    // Construir filtro
    const filter = { user: req.user.userId };
    if (read !== undefined) {
      filter.read = read === 'true';
    }
    
    // Buscar notificações
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));
    
    // Contar notificações não lidas
    const unreadCount = await Notification.countDocuments({
      user: req.user.userId,
      read: false
    });
    
    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    console.error('Erro ao obter notificações:', error);
    res.status(500).json({ message: 'Erro ao obter notificações' });
  }
});

// Marcar notificação como lida
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user.userId
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notificação não encontrada' });
    }
    
    notification.read = true;
    await notification.save();
    
    res.status(200).json({ message: 'Notificação marcada como lida' });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ message: 'Erro ao marcar notificação como lida' });
  }
});

// Marcar todas as notificações como lidas
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.userId, read: false },
      { $set: { read: true } }
    );
    
    res.status(200).json({ message: 'Todas as notificações marcadas como lidas' });
  } catch (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error);
    res.status(500).json({ message: 'Erro ao marcar todas as notificações como lidas' });
  }
});

module.exports = router;
