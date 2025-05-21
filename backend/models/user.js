const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

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
    type: String
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  establishmentName: {
    type: String
  },
  businessType: {
    type: String
  },
  whatsapp: {
    type: String
  },
  menuLink: {
    type: String
  },
  address: {
    type: String
  },
  cep: {
    type: String
  },
  plan: {
    type: String,
    default: 'free'
  },
  facebookId: {
    type: String
  },
  facebookAccessToken: {
    type: String
  },
  facebookTokenExpiry: {
    type: Date
  },
  adsAccountId: {
    type: String
  },
  adsAccountName: {
    type: String
  },
  instagramAccounts: {
    type: Array,
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash da senha antes de salvar
userSchema.pre('save', async function(next) {
  // Só hash a senha se ela foi modificada (ou é nova)
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    // Gerar salt
    const salt = await bcryptjs.genSalt(10);
    
    // Hash da senha com o salt
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar senha
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcryptjs.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;
