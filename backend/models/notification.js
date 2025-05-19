const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'error', 'success'],
    default: 'info'
  },
  read: {
    type: Boolean,
    default: false
  },
  entityType: {
    type: String,
    enum: ['campaign', 'adset', 'ad', 'account', 'system'],
    default: 'system'
  },
  entityId: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '30d' // Documento será automaticamente removido após 30 dias
  }
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
