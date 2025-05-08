const jwt = require("jsonwebtoken");
const axios = require("axios");
const User = require("../models/User");

// Gera um token JWT válido por 7 dias
const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// --------- LOGIN ----------
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      }
    });
  } catch (err) {
    console.error("❌ Erro no login:", err);
    res.status(500).json({ message: "Erro ao autenticar usuário" });
  }
};

// --------- REGISTRO ----------
exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email já cadastrado" });
    }

    const newUser = new User({ name, email, password });
    await newUser.save();

    const token = generateToken(newUser._id);

    res.status(201).json({
      token,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email
      }
    });
  } catch (err) {
    console.error("❌ Erro ao registrar:", err);
    res.status(500).json({ message: "Erro ao registrar usuário" });
  }
};

// --------- CALLBACK FACEBOOK ----------
exports.facebookCallback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ message: "Código não fornecido pelo Facebook" });
  }

  const redirectUri = process.env.FACEBOOK_REDIRECT_URI || "https://chefstudio-production.up.railway.app/api/auth/facebook/callback";

  try {
    const tokenResponse = await axios.get("https://graph.facebook.com/v18.0/oauth/access_token", {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: redirectUri,
        code
      }
    });

    const tokenData = tokenResponse.data;

    // 🔒 Aqui você pode salvar o tokenData no MongoDB com o ID do usuário logado
    // Exemplo: await FacebookToken.create({ userId: X, access_token: tokenData.access_token, ... })

    return res.status(200).json({
      message: "Conta conectada com sucesso!",
      tokenData
    });
  } catch (error) {
    console.error("❌ Erro ao obter token do Facebook:", error.response?.data || error.message);
    return res.status(500).json({ message: "Erro ao trocar código por token" });
  }
};
