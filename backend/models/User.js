const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  // Dados básicos
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^\S+@\S+\.\S+$/, // Validação simples de email
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },

  // Integração com Meta Ads
  metaAccessToken: {
    type: String
  },
  metaUserId: {
    type: String
  },
  metaConnectionStatus: {
    type: String,
    enum: ["connected", "disconnected"],
    default: "disconnected"
  }
}, {
  timestamps: true
});

// 🔒 Hash da senha antes de salvar
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// 🔐 Método de verificação da senha
userSchema.methods.comparePassword = async function (inputPassword) {
  return await bcrypt.compare(inputPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
