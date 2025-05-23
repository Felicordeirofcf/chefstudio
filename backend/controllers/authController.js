const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const axios = require('axios');

// Função para gerar token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// Login de usuário
exports.loginUser = async (req, res) => {
  try {
    console.log('📝 Tentativa de login:', { email: req.body.email });
    
    const { email, password } = req.body;
    
    // Validação básica
    if (!email || !password) {
      console.log('❌ Login falhou: Email ou senha não fornecidos');
      return res.status(400).json({ message: "Email e senha são obrigatórios" });
    }

    // Buscar usuário pelo email
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ Login falhou: Usuário não encontrado');
      return res.status(401).json({ message: "Email ou senha incorretos" });
    }

    // Verificar senha
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      console.log('❌ Login falhou: Senha incorreta');
      return res.status(401).json({ message: "Email ou senha incorretos" });
    }

    // Gerar token JWT
    const token = generateToken(user._id);
    
    console.log('✅ Login bem-sucedido:', { userId: user._id });
    
    // Retornar dados do usuário e token
    res.json({
      token,
      _id: user._id,
      name: user.name,
      email: user.email,
      metaUserId: user.facebookId,
      metaConnectionStatus: user.facebookId ? "connected" : "disconnected",
    });
  } catch (err) {
    console.error("❌ Erro ao fazer login:", err);
    console.error("Detalhes do erro:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code
    });
    res.status(500).json({ message: "Erro ao fazer login" });
  }
};

// Registro de novo usuário
exports.registerUser = async (req, res) => {
  try {
    console.log('📝 Tentativa de registro:', { 
      email: req.body.email,
      name: req.body.name,
      bodyKeys: Object.keys(req.body)
    });
    
    const { name, email, password } = req.body;
    
    // Validação básica
    if (!name || !email || !password) {
      console.log('❌ Registro falhou: Campos obrigatórios ausentes', { 
        nameProvided: !!name, 
        emailProvided: !!email, 
        passwordProvided: !!password 
      });
      return res.status(400).json({ 
        message: "Nome, email e senha são obrigatórios",
        missingFields: {
          name: !name,
          email: !email,
          password: !password
        }
      });
    }

    // Verificar se o email já existe
    const userExists = await User.findOne({ email });
    
    if (userExists) {
      console.log('❌ Registro falhou: Email já cadastrado');
      return res.status(400).json({ message: "Email já cadastrado" });
    }
    
    // Criptografando a senha antes de salvar
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Criar novo usuário
    const newUser = new User({ 
      name, 
      email, 
      password: hashedPassword 
    });
    
    // Salvar usuário no banco de dados
    await newUser.save();
    
    // Gerar token JWT
    const token = generateToken(newUser._id);
    
    console.log('✅ Registro bem-sucedido:', { userId: newUser._id });
    
    // Retornar dados do usuário e token
    res.status(201).json({
      token,
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      metaUserId: newUser.facebookId,
      metaConnectionStatus: newUser.facebookId ? "connected" : "disconnected",
    });
  } catch (err) {
    console.error("❌ Erro ao registrar:", err);
    console.error("Detalhes do erro:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code
    });
    
    // Verificar se é um erro de validação do Mongoose
    if (err.name === 'ValidationError') {
      const errors = {};
      for (const field in err.errors) {
        errors[field] = err.errors[field].message;
      }
      return res.status(400).json({ 
        message: "Erro de validação", 
        errors 
      });
    }
    
    // Verificar se é um erro de duplicidade (código 11000)
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: "Email já cadastrado" 
      });
    }
    
    res.status(500).json({ message: "Erro ao registrar usuário" });
  }
};

// Perfil do usuário autenticado
exports.getProfile = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
    
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      metaUserId: user.facebookId,
      metaConnectionStatus: user.facebookId ? "connected" : "disconnected",
      plan: user.plan || null,
    });
  } catch (err) {
    console.error("❌ Erro ao buscar perfil:", err);
    console.error("Detalhes do erro:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code
    });
    
    res.status(500).json({ message: "Erro ao buscar perfil do usuário" });
  }
};

// Callback do Facebook
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
    
    console.log("FACEBOOK_APP_ID:", process.env.FACEBOOK_APP_ID);
    
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || "https://chefstudio-production.up.railway.app/api/meta/callback";
    
    const tokenResponse = await axios.get("https://graph.facebook.com/v18.0/oauth/access_token", {
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
    
    // Obtenção das informações do usuário do Facebook
    const meResponse = await axios.get("https://graph.facebook.com/v18.0/me", {
      params: { access_token },
    });
    
    const metaUserId = meResponse.data.id;
    
    // Atualização do usuário no banco de dados com o Meta ID e token
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        facebookAccessToken: access_token,
        facebookId: metaUserId,
        // Adicionar também nos campos padronizados
        metaAccessToken: access_token,
        metaUserId: metaUserId,
        metaConnectionStatus: "connected"
      },
      { new: true }
    );
    
    res.status(200).json({
      message: "Conta Meta conectada com sucesso!",
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      metaUserId: updatedUser.facebookId,
      metaConnectionStatus: updatedUser.facebookId ? "connected" : "disconnected",
    });
  } catch (error) {
    console.error("❌ Erro ao conectar Meta Ads:", error.response?.data || error.message);
    console.error("Detalhes do erro:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    res.status(500).json({ 
      message: "Erro ao conectar com a conta Meta Ads", 
      error: error.response?.data || error.message 
    });
  }
};

// Logout do Facebook (Desconectar)
exports.facebookLogout = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.facebookId) {
      return res.status(400).json({ message: "Nenhuma conta Meta conectada" });
    }
    
    // Remover as informações de conexão do Meta
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        facebookAccessToken: null,
        facebookId: null,
      },
      { new: true }
    );
    
    res.status(200).json({
      message: "Conta Meta desconectada com sucesso!",
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      metaConnectionStatus: "disconnected",
    });
  } catch (error) {
    console.error("❌ Erro ao desconectar Meta Ads:", error.message);
    console.error("Detalhes do erro:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    res.status(500).json({ message: "Erro ao desconectar a conta Meta Ads" });
  }
};
