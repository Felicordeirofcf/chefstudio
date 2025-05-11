const jwt = require("jsonwebtoken");
const axios = require("axios");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");
const bcrypt = require("bcryptjs");

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
      metaAdAccountId: user.metaAdAccountId, // Incluir adAccountId na resposta do login
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

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    const token = generateToken(newUser._id);

    res.status(201).json({
      token,
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      metaUserId: newUser.metaUserId,
      metaAdAccountId: newUser.metaAdAccountId, // Incluir adAccountId na resposta do registro
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
      metaAdAccountId: user.metaAdAccountId, // Incluir adAccountId no perfil
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

  if (!code || !state) {
    const frontendConnectMetaUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/connect-meta?error=callback_error` : "/connect-meta?error=callback_error";
    return res.redirect(frontendConnectMetaUrl);
  }

  try {
    const decoded = jwt.verify(state, process.env.JWT_SECRET);
    const userId = decoded.id;

    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || "https://chefstudio-production.up.railway.app/api/auth/facebook/callback";

    const tokenResponse = await axios.get("https://graph.facebook.com/v19.0/oauth/access_token", {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: redirectUri,
        code,
      },
    }).catch(error => {
      console.error("❌ Erro ao obter token de acesso do Facebook:", error.response?.data || error.message);
      throw new Error("Erro ao obter token de acesso do Facebook");
    });

    const { access_token } = tokenResponse.data;

    // Buscar o ID do usuário do Meta
    const meResponse = await axios.get("https://graph.facebook.com/v19.0/me", {
      params: { access_token },
    });
    const metaUserId = meResponse.data.id;

    // Buscar as contas de anúncios do usuário
    let adAccountId = null;
    try {
      const adAccountsResponse = await axios.get(`https://graph.facebook.com/v19.0/${metaUserId}/adaccounts`, {
        params: { 
          access_token,
          fields: 'account_id' // Solicitar apenas o ID da conta de anúncios
        },
      });

      if (adAccountsResponse.data && adAccountsResponse.data.data && adAccountsResponse.data.data.length > 0) {
        // Pegar o ID da primeira conta de anúncios encontrada
        adAccountId = adAccountsResponse.data.data[0].account_id;
      } else {
        console.warn("Nenhuma conta de anúncios encontrada para o usuário Meta:", metaUserId);
      }
    } catch (adAccountError) {
      console.error("❌ Erro ao buscar contas de anúncios do Facebook:", adAccountError.response?.data || adAccountError.message);
      // Não interromper o fluxo se a busca de contas de anúncios falhar, mas registrar o erro.
    }

    // Atualizar o usuário no banco de dados
    await User.findByIdAndUpdate(
      userId,
      {
        metaAccessToken: access_token,
        metaUserId,
        metaAdAccountId: adAccountId, // Salvar o ID da conta de anúncios
        metaConnectionStatus: "connected",
      },
      { new: true }
    );

    const frontendDashboardUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/dashboard?meta_connected=true` : "/dashboard?meta_connected=true";
    res.redirect(frontendDashboardUrl);

  } catch (error) {
    console.error("❌ Erro ao conectar Meta Ads:", error.response?.data || error.message);
    const frontendConnectMetaErrorUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/connect-meta?error=connection_failed` : "/connect-meta?error=connection_failed";
    res.redirect(frontendConnectMetaErrorUrl);
  }
};

//
// --------- LOGOUT FACEBOOK (Desconectar) ----------
//
exports.facebookLogout = async (req, res) => {
  try {
    const user = req.user;
    if (!user.metaUserId) {
      return res.status(400).json({ message: "Nenhuma conta Meta conectada" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        metaAccessToken: null,
        metaUserId: null,
        metaAdAccountId: null, // Limpar o ID da conta de anúncios ao desconectar
        metaConnectionStatus: "disconnected",
      },
      { new: true }
    );

    res.status(200).json({
      message: "Conta Meta desconectada com sucesso!",
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      metaAdAccountId: updatedUser.metaAdAccountId,
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

