const mongoose = require('mongoose');

// Verificar se o modelo já existe para evitar erro de sobrescrita
const RefreshToken = mongoose.models.RefreshToken || mongoose.model('RefreshToken', new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '30d' // Documento será automaticamente removido após 30 dias
  }
}));

module.exports = RefreshToken;
