// Modelo para usuário com integração Meta Ads
// Arquivo: backend/models/user.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: function() {
      // Senha não é obrigatória para usuários que fazem login com Facebook
      return !this.metaUserId;
    }
  },
  // Campos para integração com Meta Ads
  metaUserId: {
    type: String
  },
  metaAccessToken: {
    type: String
  },
  metaTokenExpires: {
    type: Date
  },
  metaConnectionStatus: {
    type: String,
    enum: ['connected', 'disconnected', 'expired'],
    default: 'disconnected'
  },
  adsAccountId: {
    type: String
  },
  adsAccountName: {
    type: String
  },
  adAccounts: [
    {
      id: String,
      name: String,
      status: Number,
      amountSpent: Number,
      currency: String
    }
  ],
  // Outros campos do usuário
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Método para verificar senha
userSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Middleware para criptografar senha antes de salvar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

module.exports = User;
