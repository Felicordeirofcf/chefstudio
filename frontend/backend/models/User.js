const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    // 🔹 Informações básicas do usuário
    name: {
      type: String,
      required: [true, "O nome é obrigatório"],
      trim: true
    },
    email: {
      type: String,
      required: [true, "O e-mail é obrigatório"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\S+@\S+\.\S+$/,
        "Formato de e-mail inválido"
      ]
    },
    password: {
      type: String,
      required: [true, "A senha é obrigatória"],
      minlength: [6, "A senha deve ter pelo menos 6 caracteres"]
    },

    // 🔗 Integração com Meta Ads
    metaAccessToken: { type: String },
    metaUserId: { type: String },
    metaConnectionStatus: {
      type: String,
      enum: ["connected", "disconnected"],
      default: "disconnected"
    }
  },
  {
    timestamps: true // Cria automaticamente campos createdAt e updatedAt
  }
);

// 🔐 Hash da senha antes de salvar
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

// 🔑 Método de verificação de senha
userSchema.methods.comparePassword = function (inputPassword) {
  return bcrypt.compare(inputPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
