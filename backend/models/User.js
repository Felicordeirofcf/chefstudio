const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Por favor, informe seu nome']
  },
  email: {
    type: String,
    required: [true, 'Por favor, informe seu email'],
    unique: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Por favor, informe um email válido']
  },
  password: {
    type: String,
    required: [true, 'Por favor, informe uma senha'],
    minlength: 6
  },
  metaUserId: {
    type: String,
    default: null
  },
  metaAccessToken: {
    type: String,
    default: null
  },
  metaConnectionStatus: {
    type: String,
    enum: ['connected', 'disconnected', 'pending'],
    default: 'disconnected'
  },
  metaAdAccountId: {
    type: String,
    default: null
  },
  metaEmail: {
    type: String,
    default: null
  },
  metaName: {
    type: String,
    default: null
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'premium'],
    default: 'free'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Método para criar usuário de teste
userSchema.statics.createTestUser = async function() {
  try {
    const testUser = {
      name: 'Usuário Teste',
      email: 'teste@chefstudio.com',
      password: await bcrypt.hash('ChefStudio2025', 10),
      plan: 'premium',
      metaConnectionStatus: 'connected'
    };
    
    const existingUser = await this.findOne({ email: testUser.email });
    if (existingUser) {
      return existingUser;
    }
    
    return await this.create(testUser);
  } catch (error) {
    console.error('Erro ao criar usuário de teste:', error);
    return null;
  }
};

// Método para comparar senha
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
