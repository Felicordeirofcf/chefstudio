const express = require('express');
const router = express.Router();
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
// Usando import relativo padrão
const User = require('../models/user');
// Importando do diretório models
const refreshToken = require('../models/refreshtoken');
// Importando especificamente a função authMiddleware
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');

// Registrar novo usuário
router.post('/register', async (req, res) => {
  try {
    console.log('Iniciando registro de usuário');
    console.log('Dados recebidos:', JSON.stringify(req.body));
    
    // Validação de campos obrigatórios
    const { name, email, password, establishmentName, businessType, whatsapp, menuLink, address, cep } = req.body;
    if (!name || !email || !password) {
      console.log('Erro de validação: campos obrigatórios ausentes', { name: !!name, email: !!email, password: !!password });
      return res.status(400).json({ 
        message: 'Todos os campos são obrigatórios',
        details: {
          name: name ? 'válido' : 'ausente ou inválido',
          email: email ? 'válido' : 'ausente ou inválido',
          password: password ? 'válido' : 'ausente ou inválido'
        }
      });
    }
    
    // Validação de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Erro de validação: formato de email inválido', { email });
      return res.status(400).json({ message: 'Formato de email inválido' });
    }
    
    // Validação de senha
    if (password.length < 6) {
      console.log('Erro de validação: senha muito curta');
      return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres' });
    }
    
    // Verificar se o usuário já existe
    console.log('Verificando se o email já está cadastrado:', email);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Email já cadastrado:', email);
      return res.status(400).json({ message: 'Email já cadastrado' });
    }
    
    // Criar novo usuário
    console.log('Criando hash da senha');
    const hashedPassword = await bcryptjs.hash(password, 10);
    
    console.log('Criando novo usuário');
    const user = new User({
      name,
      email,
      password: hashedPassword,
      establishmentName,
      businessType,
      whatsapp,
      menuLink,
      address,
      cep
    });
    
    console.log('Salvando usuário no banco de dados');
    const savedUser = await user.save();
    console.log('Usuário salvo com sucesso, ID:', savedUser._id);
    
    // Gerar tokens
    console.log('Gerando JWT token');
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    console.log('Gerando refresh token');
    const refreshTokenString = crypto.randomBytes(40).toString('hex');
    
    console.log('Criando documento de refresh token');
    const refreshTokenDoc = new refreshToken({
      token: refreshTokenString,
      userId: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
    });
    
    console.log('Salvando refresh token no banco de dados');
    await refreshTokenDoc.save();
    console.log('Refresh token salvo com sucesso');
    
    console.log('Registro concluído com sucesso');
    
    // Formato alinhado com o que o frontend espera
    res.status(201).json({
      message: 'Usuário registrado com sucesso',
      token,
      refreshToken: refreshTokenString,
      _id: user._id,
      name: user.name,
      email: user.email,
      metaUserId: user.facebookId || null,
      metaConnectionStatus: user.facebookId ? "connected" : "disconnected",
      plan: user.plan || "free"
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    // Log detalhado do erro
    console.error('Detalhes do erro:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    // Tratamento específico para erros de validação do Mongoose
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      for (const field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }
      console.error('Erros de validação:', validationErrors);
      return res.status(400).json({ 
        message: 'Erro de validação', 
        errors: validationErrors 
      });
    }
    
    // Tratamento específico para erros de duplicação (código 11000)
    if (error.code === 11000) {
      console.error('Erro de duplicação:', error.keyValue);
      return res.status(400).json({ 
        message: 'Dados duplicados', 
        field: Object.keys(error.keyValue)[0] 
      });
    }
    
    res.status(500).json({ 
      message: 'Erro ao registrar usuário',
      error: error.message
    });
  }
});

// Login de usuário
router.post('/login', async (req, res) => {
  try {
    console.log('Iniciando login de usuário');
    console.log('Dados recebidos:', JSON.stringify(req.body));
    
    // Validação de campos obrigatórios
    const { email, password } = req.body;
    if (!email || !password) {
      console.log('Erro de validação: campos obrigatórios ausentes', { email: !!email, password: !!password });
      return res.status(400).json({ 
        message: 'Email e senha são obrigatórios',
        details: {
          email: email ? 'válido' : 'ausente ou inválido',
          password: password ? 'válido' : 'ausente ou inválido'
        }
      });
    }
    
    // Verificar se o usuário existe
    console.log('Buscando usuário pelo email:', email);
    const user = await User.findOne({ email });
    if (!user) {
      console.log('Usuário não encontrado:', email);
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    // Verificar senha
    console.log('Verificando senha');
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('Senha inválida para o usuário:', email);
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    // Gerar tokens
    console.log('Gerando JWT token');
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    console.log('Gerando refresh token');
    const refreshTokenString = crypto.randomBytes(40).toString('hex');
    
    console.log('Criando documento de refresh token');
    const refreshTokenDoc = new refreshToken({
      token: refreshTokenString,
      userId: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
    });
    
    console.log('Salvando refresh token no banco de dados');
    await refreshTokenDoc.save();
    console.log('Refresh token salvo com sucesso');
    
    console.log('Login concluído com sucesso');
    
    // Formato alinhado com o que o frontend espera
    res.status(200).json({
      message: 'Login realizado com sucesso',
      token,
      refreshToken: refreshTokenString,
      _id: user._id,
      name: user.name,
      email: user.email,
      metaUserId: user.facebookId || null,
      metaConnectionStatus: user.facebookId ? "connected" : "disconnected",
      adsAccountId: user.adsAccountId || null,
      adsAccountName: user.adsAccountName || null,
      instagramAccounts: user.instagramAccounts || [],
      plan: user.plan || "free"
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    // Log detalhado do erro
    console.error('Detalhes do erro:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    res.status(500).json({ 
      message: 'Erro ao fazer login',
      error: error.message
    });
  }
});

// Renovar token
router.post('/refresh-token', async (req, res) => {
  try {
    console.log('Iniciando renovação de token');
    console.log('Dados recebidos:', JSON.stringify(req.body));
    
    const { refreshTokenString } = req.body;
    
    if (!refreshTokenString) {
      console.log('Refresh token não fornecido');
      return res.status(400).json({ message: 'Refresh token não fornecido' });
    }
    
    // Verificar se o refresh token existe e é válido
    console.log('Verificando refresh token:', refreshTokenString.substring(0, 10) + '...');
    const refreshTokenDoc = await refreshToken.findOne({
      token: refreshTokenString,
      expiresAt: { $gt: new Date() }
    });
    
    if (!refreshTokenDoc) {
      console.log('Refresh token inválido ou expirado');
      return res.status(401).json({ message: 'Refresh token inválido ou expirado' });
    }
    
    // Buscar usuário
    console.log('Buscando usuário pelo ID:', refreshTokenDoc.userId);
    const user = await User.findById(refreshTokenDoc.userId);
    if (!user) {
      console.log('Usuário não encontrado para o refresh token');
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }
    
    // Gerar novo token
    console.log('Gerando novo JWT token');
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    console.log('Token renovado com sucesso');
    
    // Formato alinhado com o que o frontend espera
    res.status(200).json({
      message: 'Token renovado com sucesso',
      token,
      _id: user._id,
      name: user.name,
      email: user.email,
      metaUserId: user.facebookId || null,
      metaConnectionStatus: user.facebookId ? "connected" : "disconnected",
      adsAccountId: user.adsAccountId || null,
      adsAccountName: user.adsAccountName || null,
      instagramAccounts: user.instagramAccounts || [],
      plan: user.plan || "free"
    });
  } catch (error) {
    console.error('Erro ao renovar token:', error);
    // Log detalhado do erro
    console.error('Detalhes do erro:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    res.status(500).json({ 
      message: 'Erro ao renovar token',
      error: error.message
    });
  }
});

// Iniciar autenticação com Facebook
router.get('/facebook', passport.authenticate('facebook', {
  scope: ['email', 'ads_management', 'ads_read', 'business_management', 'instagram_basic', 'instagram_content_publish']
}));

// Callback de autenticação do Facebook
router.get('/facebook/callback', passport.authenticate('facebook', { session: false }), async (req, res) => {
  try {
    console.log('Callback de autenticação do Facebook');
    
    // Usuário autenticado está disponível em req.user
    const user = req.user;
    console.log('Usuário autenticado via Facebook, ID:', user._id);
    
    // Gerar tokens
    console.log('Gerando JWT token');
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    console.log('Gerando refresh token');
    const refreshTokenString = crypto.randomBytes(40).toString('hex');
    
    console.log('Criando documento de refresh token');
    const refreshTokenDoc = new refreshToken({
      token: refreshTokenString,
      userId: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
    });
    
    console.log('Salvando refresh token no banco de dados');
    await refreshTokenDoc.save();
    console.log('Refresh token salvo com sucesso');
    
    // Redirecionar para o frontend com os tokens
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    console.log('Redirecionando para o frontend:', frontendUrl);
    res.redirect(`${frontendUrl}/auth/callback?token=${token}&refreshToken=${refreshTokenString}`);
  } catch (error) {
    console.error('Erro no callback do Facebook:', error);
    // Log detalhado do erro
    console.error('Detalhes do erro:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/error`);
  }
});

// Obter informações do usuário atual
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    console.log('Obtendo informações do usuário atual, ID:', req.user.userId);
    
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      console.log('Usuário não encontrado:', req.user.userId);
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    console.log('Informações do usuário obtidas com sucesso');
    
    // Formato alinhado com o que o frontend espera
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      metaUserId: user.facebookId || null,
      metaConnectionStatus: user.facebookId ? "connected" : "disconnected",
      adsAccountId: user.adsAccountId || null,
      adsAccountName: user.adsAccountName || null,
      instagramAccounts: user.instagramAccounts || [],
      plan: user.plan || "free",
      establishmentName: user.establishmentName,
      businessType: user.businessType,
      whatsapp: user.whatsapp,
      menuLink: user.menuLink,
      address: user.address,
      cep: user.cep
    });
  } catch (error) {
    console.error('Erro ao obter informações do usuário:', error);
    // Log detalhado do erro
    console.error('Detalhes do erro:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    res.status(500).json({ 
      message: 'Erro ao obter informações do usuário',
      error: error.message
    });
  }
});

// Atualizar perfil do usuário
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    console.log('Atualizando perfil do usuário, ID:', req.user.userId);
    console.log('Dados recebidos:', JSON.stringify(req.body));
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      console.log('Usuário não encontrado:', req.user.userId);
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Campos que podem ser atualizados
    const { name, establishmentName, businessType, whatsapp, menuLink, address, cep } = req.body;
    
    // Atualizar campos
    if (name) user.name = name;
    if (establishmentName) user.establishmentName = establishmentName;
    if (businessType) user.businessType = businessType;
    if (whatsapp) user.whatsapp = whatsapp;
    if (menuLink) user.menuLink = menuLink;
    if (address) user.address = address;
    if (cep) user.cep = cep;
    
    await user.save();
    console.log('Perfil atualizado com sucesso');
    
    // Formato alinhado com o que o frontend espera
    res.status(200).json({
      message: 'Perfil atualizado com sucesso',
      _id: user._id,
      name: user.name,
      email: user.email,
      metaUserId: user.facebookId || null,
      metaConnectionStatus: user.facebookId ? "connected" : "disconnected",
      adsAccountId: user.adsAccountId || null,
      adsAccountName: user.adsAccountName || null,
      instagramAccounts: user.instagramAccounts || [],
      plan: user.plan || "free",
      establishmentName: user.establishmentName,
      businessType: user.businessType,
      whatsapp: user.whatsapp,
      menuLink: user.menuLink,
      address: user.address,
      cep: user.cep
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ 
      message: 'Erro ao atualizar perfil',
      error: error.message
    });
  }
});

// Atualizar plano do usuário
router.put('/plan', authMiddleware, async (req, res) => {
  try {
    console.log('Atualizando plano do usuário, ID:', req.user.userId);
    console.log('Dados recebidos:', JSON.stringify(req.body));
    
    const { planName } = req.body;
    if (!planName) {
      return res.status(400).json({ message: 'Nome do plano é obrigatório' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      console.log('Usuário não encontrado:', req.user.userId);
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Atualizar plano
    user.plan = planName;
    await user.save();
    console.log('Plano atualizado com sucesso');
    
    res.status(200).json({
      message: 'Plano atualizado com sucesso',
      plan: user.plan
    });
  } catch (error) {
    console.error('Erro ao atualizar plano:', error);
    res.status(500).json({ 
      message: 'Erro ao atualizar plano',
      error: error.message
    });
  }
});

// Logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    console.log('Iniciando logout');
    console.log('Dados recebidos:', JSON.stringify(req.body));
    
    const { refreshTokenString } = req.body;
    
    if (refreshTokenString) {
      console.log('Removendo refresh token:', refreshTokenString.substring(0, 10) + '...');
      // Remover refresh token do banco de dados
      await refreshToken.deleteOne({ token: refreshTokenString });
      console.log('Refresh token removido com sucesso');
    }
    
    console.log('Logout realizado com sucesso');
    res.status(200).json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    // Log detalhado do erro
    console.error('Detalhes do erro:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    res.status(500).json({ 
      message: 'Erro ao fazer logout',
      error: error.message
    });
  }
});

// Rota de teste para verificar se a autenticação está funcionando
router.get('/test', (req, res) => {
  console.log('Rota de teste de autenticação acessada');
  res.status(200).json({ 
    message: 'Rota de teste de autenticação funcionando corretamente',
    timestamp: new Date(),
    env: {
      nodeEnv: process.env.NODE_ENV || 'development',
      mongodbUri: process.env.MONGODB_URI ? 'Configurado' : 'Não configurado',
      jwtSecret: process.env.JWT_SECRET ? 'Configurado' : 'Não configurado'
    }
  });
});

module.exports = router;
