const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    // 🔹 Informações básicas do usuário
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
      match: /^\S+@\S+\.\S+$/ // Regex simples para validar email
    },
    password: {
      type: String,
      required: true,
      minlength: 6
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
    timestamps: true
  }
);

// 🔐 Hash da senha antes de salvar (caso modificada)
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

// 🔑 Método para verificar senha
userSchema.methods.comparePassword = function (inputPassword) {
  return bcrypt.compare(inputPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
