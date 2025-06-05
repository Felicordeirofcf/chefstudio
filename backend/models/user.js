const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    // Senha não é obrigatória se o login for via OAuth (ex: Facebook)
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  establishmentName: {
    type: String,
  },
  businessType: {
    type: String,
  },
  whatsapp: {
    type: String,
  },
  menuLink: {
    type: String,
  },
  address: {
    type: String,
  },
  cep: {
    type: String,
  },
  plan: {
    type: String,
    default: "free",
  },
  // --- Campos Meta Ads Padronizados ---
  metaUserId: {
    // ID do usuário no Facebook/Meta
    type: String,
  },
  metaAccessToken: {
    // Token de acesso do USUÁRIO (longa duração preferencialmente)
    type: String,
  },
  metaTokenExpires: {
    // Data de expiração do token do usuário (se disponível)
    type: Date,
  },
  metaConnectionStatus: {
    // Status da conexão Meta
    type: String,
    enum: ["connected", "disconnected"],
    default: "disconnected",
  },
  metaAdAccounts: {
    // Lista de contas de anúncios associadas ao usuário
    type: [
      {
        id: String, // act_... ID
        account_id: String, // ID numérico da conta
        name: String,
      },
    ],
    default: [],
  },
  metaPages: {
    // Lista de páginas do Facebook gerenciadas pelo usuário
    type: [
      {
        id: String, // ID da página
        name: String,
        access_token: String, // Page Access Token (importante!)
      },
    ],
    default: [],
  },
  // --- Fim dos Campos Meta Ads Padronizados ---

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash da senha antes de salvar (apenas se a senha foi modificada)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar senha
userSchema.methods.comparePassword = async function (candidatePassword) {
  // Retorna false se não houver senha salva (ex: login OAuth)
  if (!this.password) return false;
  try {
    return await bcryptjs.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

const User = mongoose.model("User", userSchema);

module.exports = User;

