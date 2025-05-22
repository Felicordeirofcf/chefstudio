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
const axios = require('axios');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registra um novo usuário
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome do usuário
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email do usuário
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Senha do usuário (mínimo 6 caracteres)
 *               establishmentName:
 *                 type: string
 *                 description: Nome do estabelecimento
 *               businessType:
 *                 type: string
 *                 description: Tipo de negócio
 *               whatsapp:
 *                 type: string
 *                 description: Número de WhatsApp
 *               menuLink:
 *                 type: string
 *                 description: Link para o cardápio
 *               address:
 *                 type: string
 *                 description: Endereço do estabelecimento
 *               cep:
 *                 type: string
 *                 description: CEP do estabelecimento
 *     responses:
 *       201:
 *         description: Usuário registrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Usuário registrado com sucesso
 *                 _id:
 *                   type: string
 *                   example: 60d21b4667d0d8992e610c85
 *                 name:
 *                   type: string
 *                   example: João Silva
 *                 email:
 *                   type: string
 *                   example: joao@exemplo.com
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Erro de validação ou email já cadastrado
 *       500:
 *         description: Erro interno do servidor
 */
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
    // Removido o hash manual da senha aqui, pois o model já faz isso no pre-save
    console.log('Criando novo usuário');
    const user = new User({
      name,
      email,
      password, // Senha sem hash, será hasheada pelo middleware pre-save do modelo
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
      _id: user._id,
      name: user.name,
      email: user.email,
      token,
      refreshToken: refreshTokenString,
      metaUserId: null,
      metaConnectionStatus: "disconnected",
      adsAccountId: null,
      adsAccountName: null,
      instagramAccounts: [],
      plan: user.plan || "free",
      establishmentName: user.establishmentName,
      businessType: user.businessType,
      whatsapp: user.whatsapp,
      menuLink: user.menuLink,
      address: user.address,
      cep: user.cep
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
    
    res.status(500).json({ 
      message: 'Erro ao registrar usuário',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Autentica um usuário
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email do usuário
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Senha do usuário
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login realizado com sucesso
 *                 _id:
 *                   type: string
 *                   example: 60d21b4667d0d8992e610c85
 *                 name:
 *                   type: string
 *                   example: João Silva
 *                 email:
 *                   type: string
 *                   example: joao@exemplo.com
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Campos obrigatórios ausentes
 *       401:
 *         description: Credenciais inválidas
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/login', async (req, res) => {
  try {
    console.log('Iniciando login');
    console.log('Dados recebidos:', JSON.stringify(req.body));
    
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
    
    console.log('Buscando usuário pelo email:', email);
    const user = await User.findOne({ email });
    if (!user) {
      console.log('Usuário não encontrado:', email);
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    console.log('Verificando senha');
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Senha incorreta para o usuário:', email);
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
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
      _id: user._id,
      name: user.name,
      email: user.email,
      token,
      refreshToken: refreshTokenString,
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

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Atualiza o token de acesso usando um refresh token
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshTokenString
 *             properties:
 *               refreshTokenString:
 *                 type: string
 *                 description: Refresh token obtido durante login ou registro
 *     responses:
 *       200:
 *         description: Token atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Token atualizado com sucesso
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Refresh token ausente
 *       401:
 *         description: Refresh token inválido ou expirado
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/refresh-token', async (req, res) => {
  try {
    console.log('Iniciando refresh token');
    console.log('Dados recebidos:', JSON.stringify(req.body));
    
    const { refreshTokenString } = req.body;
    if (!refreshTokenString) {
      console.log('Erro de validação: refresh token ausente');
      return res.status(400).json({ message: 'Refresh token é obrigatório' });
    }
    
    console.log('Buscando refresh token:', refreshTokenString.substring(0, 10) + '...');
    const refreshTokenDoc = await refreshToken.findOne({ token: refreshTokenString });
    if (!refreshTokenDoc) {
      console.log('Refresh token não encontrado');
      return res.status(401).json({ message: 'Refresh token inválido' });
    }
    
    // Verificar se o token expirou
    if (refreshTokenDoc.expiresAt < new Date()) {
      console.log('Refresh token expirado');
      await refreshToken.deleteOne({ token: refreshTokenString });
      return res.status(401).json({ message: 'Refresh token expirado' });
    }
    
    console.log('Buscando usuário pelo ID:', refreshTokenDoc.userId);
    const user = await User.findById(refreshTokenDoc.userId);
    if (!user) {
      console.log('Usuário não encontrado:', refreshTokenDoc.userId);
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }
    
    console.log('Gerando novo JWT token');
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    console.log('Gerando novo refresh token');
    const newRefreshTokenString = crypto.randomBytes(40).toString('hex');
    
    console.log('Atualizando documento de refresh token');
    refreshTokenDoc.token = newRefreshTokenString;
    refreshTokenDoc.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
    
    console.log('Salvando refresh token atualizado');
    await refreshTokenDoc.save();
    console.log('Refresh token atualizado com sucesso');
    
    console.log('Refresh token concluído com sucesso');
    
    // Formato alinhado com o que o frontend espera
    res.status(200).json({
      message: 'Token atualizado com sucesso',
      _id: user._id,
      name: user.name,
      email: user.email,
      token,
      refreshToken: newRefreshTokenString,
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
    console.error('Erro ao atualizar token:', error);
    // Log detalhado do erro
    console.error('Detalhes do erro:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    res.status(500).json({ 
      message: 'Erro ao atualizar token',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Obtém informações do usuário autenticado
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informações do usuário obtidas com sucesso
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    console.log('Obtendo informações do usuário autenticado');
    
    // O middleware authMiddleware já verifica o token e adiciona req.user
    const userId = req.user.userId;
    console.log('ID do usuário autenticado:', userId);
    
    const user = await User.findById(userId);
    if (!user) {
      console.log('Usuário não encontrado:', userId);
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar status de conexão com Meta
    // Se o usuário tiver metaAccessToken e metaTokenExpires, verificar se expirou
    let metaConnectionStatus = user.metaConnectionStatus || "disconnected";
    if (user.metaAccessToken && user.metaTokenExpires) {
      if (new Date(user.metaTokenExpires) < new Date()) {
        metaConnectionStatus = "expired";
      }
    }
    
    console.log('Informações do usuário obtidas com sucesso');
    
    // Formato alinhado com o que o frontend espera
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      metaUserId: user.metaId || null,
      metaConnectionStatus: metaConnectionStatus,
      metaPrimaryAdAccountId: user.metaPrimaryAdAccountId || null,
      metaPrimaryAdAccountName: user.metaPrimaryAdAccountName || null,
      metaAdAccounts: user.metaAdAccounts || [],
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

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Realiza logout do usuário
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token a ser invalidado
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 *       400:
 *         description: Refresh token ausente
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/logout', async (req, res) => {
  try {
    console.log('Iniciando logout');
    console.log('Dados recebidos:', JSON.stringify(req.body));
    
    const { refreshToken: refreshTokenString } = req.body;
    if (!refreshTokenString) {
      console.log('Erro de validação: refresh token ausente');
      return res.status(400).json({ message: 'Refresh token é obrigatório' });
    }
    
    console.log('Removendo refresh token:', refreshTokenString.substring(0, 10) + '...');
    await refreshToken.deleteOne({ token: refreshTokenString });
    
    console.log('Logout concluído com sucesso');
    
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

module.exports = router;
