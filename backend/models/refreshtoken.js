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
    required: true,
    unique: true // Garantir que tokens sejam únicos
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // Usar TTL index para expiração automática
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true })); // Adicionar timestamps para melhor rastreamento

module.exports = RefreshToken;
