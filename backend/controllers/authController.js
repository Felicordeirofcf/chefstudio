const jwt = require("jsonwebtoken");
const axios = require("axios");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

// Gera um token JWT válido por 7 dias
const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

//
// --------- LOGIN ----------
//
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
      _id: user._id,
      name: user.name,
      email: user.email,
      metaUserId: user.metaUserId,
      metaConnectionStatus: user.metaConnectionStatus,
    });
  } catch (err) {
    console.error("❌ Erro no login:", err);
    res.status(500).json({ message: "Erro ao autenticar usuário" });
  }
};

//
// --------- REGISTRO ----------
//
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
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      metaUserId: newUser.metaUserId,
      metaConnectionStatus: newUser.metaConnectionStatus,
    });
  } catch (err) {
    console.error("❌ Erro ao registrar:", err);
    res.status(500).json({ message: "Erro ao registrar usuário" });
  }
};

//
// --------- PERFIL AUTENTICADO ----------
//
exports.getProfile = async (req, res) => {
  try {
    const user = req.user;

    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      metaUserId: user.metaUserId,
      metaConnectionStatus: user.metaConnectionStatus,
      plan: user.plan || null,
    });
  } catch (err) {
    console.error("❌ Erro ao buscar perfil:", err);
    res.status(500).json({ message: "Erro ao buscar perfil do usuário" });
  }
};

//
// --------- CALLBACK FACEBOOK ----------
//
exports.facebookCallback = async (req, res) => {
  const { code, state } = req.query;

  // Verificando se o código e o state foram passados corretamente
  if (!code || !state) {
    return res.status(400).json({ message: "Código ou token ausente no callback" });
  }

  try {
    // Validar o estado (token JWT) passado para garantir que a resposta é autêntica
    const decoded = jwt.verify(state, process.env.JWT_SECRET);
    const userId = decoded.id;

    // Obtenção do token de acesso do Facebook
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || "https://chefstudio-production.up.railway.app/api/auth/facebook/callback";
    
    // Obter token de acesso do Facebook
    const tokenResponse = await axios.get("https://graph.facebook.com/v18.0/oauth/access_token", {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: redirectUri,
        code,
      },
    });

    const { access_token } = tokenResponse.data;

    // Obtenção das informações do usuário do Facebook
    const meResponse = await axios.get("https://graph.facebook.com/v18.0/me", {
      params: { access_token },
    });

    const metaUserId = meResponse.data.id;

    // Atualização do usuário no banco de dados com o Meta ID e token
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        metaAccessToken: access_token,
        metaUserId,
        metaConnectionStatus: "connected",
      },
      { new: true }
    );

    res.status(200).json({
      message: "Conta Meta conectada com sucesso!",
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      metaUserId: updatedUser.metaUserId,
      metaConnectionStatus: updatedUser.metaConnectionStatus,
    });
  } catch (error) {
    console.error("❌ Erro ao conectar Meta Ads:", error.response?.data || error.message);
    res.status(500).json({ message: "Erro ao conectar com a conta Meta Ads" });
  }
};

//
// --------- LOGOUT FACEBOOK (Desconectar) ----------
//
exports.facebookLogout = async (req, res) => {
  try {
    const user = req.user; // O usuário autenticado
    if (!user.metaUserId) {
      return res.status(400).json({ message: "Nenhuma conta Meta conectada" });
    }

    // Remover as informações de conexão do Meta
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        metaAccessToken: null,
        metaUserId: null,
        metaConnectionStatus: "disconnected",
      },
      { new: true }
    );

    res.status(200).json({
      message: "Conta Meta desconectada com sucesso!",
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      metaConnectionStatus: updatedUser.metaConnectionStatus,
    });
  } catch (error) {
    console.error("❌ Erro ao desconectar Meta Ads:", error.message);
    res.status(500).json({ message: "Erro ao desconectar a conta Meta Ads" });
  }
};

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Retorna o perfil do usuário autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do perfil retornados com sucesso
 *       401:
 *         description: Não autorizado
 */
