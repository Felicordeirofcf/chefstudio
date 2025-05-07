const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  // Dados básicos
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^\S+@\S+\.\S+$/, // Regex simples para validar e-mail
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },

  // Dados comerciais (formulário de cadastro)
  restaurantName: { type: String, trim: true },
  businessType: { type: String, trim: true },
  address: { type: String, trim: true },
  whatsapp: { type: String, trim: true },
  menuLink: { type: String, trim: true },

  // Assinatura
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'trial'],
    default: 'inactive',
  },
  subscriptionEndDate: { type: Date },

  // Integração Meta Ads
  metaAccessToken: { type: String },
  metaRefreshToken: { type: String },
  metaConnectionStatus: {
    type: String,
    enum: ['connected', 'disconnected'],
    default: 'disconnected',
  },
}, { timestamps: true });


// --- Middleware: Hash da senha antes de salvar ---
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// --- Método para comparar senha ao fazer login ---
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
