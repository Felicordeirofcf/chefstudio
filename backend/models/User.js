const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() {
      // Senha é obrigatória apenas se não houver facebookId
      return !this.facebookId;
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Campos para integração com Facebook/Meta
  facebookId: {
    type: String,
    sparse: true,
    unique: true
  },
  facebookAccessToken: {
    type: String
  },
  facebookTokenExpiry: {
    type: Date
  },
  adsAccountId: {
    type: String // formato act_xxxxxxxxxx
  },
  adsAccountName: {
    type: String
  },
  adsAccountCurrency: {
    type: String
  },
  lastSyncDate: {
    type: Date
  }
});

// Método para comparar senha
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error(error);
  }
};

// Middleware para hash da senha antes de salvar
userSchema.pre('save', async function(next) {
  try {
    // Só faz hash da senha se ela foi modificada ou é nova
    if (!this.isModified('password') || !this.password) {
      return next();
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
