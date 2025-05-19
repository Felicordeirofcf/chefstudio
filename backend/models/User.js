const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

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
  // Campos para integração com Instagram
  instagramAccounts: [{
    id: String,
    name: String,
    username: String,
    profilePictureUrl: String
  }],
  // Campos para dashboard personalizado
  dashboardSettings: {
    favoriteMetrics: [String],
    defaultTimeRange: {
      type: String,
      enum: ['today', 'yesterday', 'last_7_days', 'last_30_days', 'last_90_days'],
      default: 'last_30_days'
    },
    showNotifications: {
      type: Boolean,
      default: true
    }
  },
  lastSyncDate: {
    type: Date
  }
});

// Método para comparar senha
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcryptjs.compare(candidatePassword, this.password);
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
    
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
