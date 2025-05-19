const express = require('express');
const router = express.Router();
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
// Usando path absoluto para garantir resolução correta
const User = require(require('path').resolve(__dirname, '../models/user'));
const refreshToken = require(require('path').resolve(__dirname, '../models/refreshtoken'));
const auth = require('../middleware/auth');
const crypto = require('crypto');

// Registrar novo usuário
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Verificar se o usuário já existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email já cadastrado' });
    }
    
    // Criar novo usuário
    const hashedPassword = await bcryptjs.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword
    });
    
    await user.save();
    
    // Gerar tokens
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    const refreshTokenString = crypto.randomBytes(40).toString('hex');
    const refreshTokenDoc = new refreshToken({
      token: refreshTokenString,
      user: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
    });
    
    await refreshTokenDoc.save();
    
    res.status(201).json({
      message: 'Usuário registrado com sucesso',
      token,
      refreshToken: refreshTokenString,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ message: 'Erro ao registrar usuário' });
  }
});

// Login de usuário
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Verificar se o usuário existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    // Verificar senha
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    // Gerar tokens
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    const refreshTokenString = crypto.randomBytes(40).toString('hex');
    const refreshTokenDoc = new refreshToken({
      token: refreshTokenString,
      user: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
    });
    
    await refreshTokenDoc.save();
    
    res.status(200).json({
      message: 'Login realizado com sucesso',
      token,
      refreshToken: refreshTokenString,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        facebookConnected: !!user.facebookId,
        adsAccountId: user.adsAccountId || null,
        adsAccountName: user.adsAccountName || null,
        instagramAccounts: user.instagramAccounts || []
      }
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
});

// Renovar token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshTokenString } = req.body;
    
    if (!refreshTokenString) {
      return res.status(400).json({ message: 'Refresh token não fornecido' });
    }
    
    // Verificar se o refresh token existe e é válido
    const refreshTokenDoc = await refreshToken.findOne({
      token: refreshTokenString,
      expiresAt: { $gt: new Date() }
    });
    
    if (!refreshTokenDoc) {
      return res.status(401).json({ message: 'Refresh token inválido ou expirado' });
    }
    
    // Buscar usuário
    const user = await User.findById(refreshTokenDoc.user);
    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }
    
    // Gerar novo token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    res.status(200).json({
      message: 'Token renovado com sucesso',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        facebookConnected: !!user.facebookId,
        adsAccountId: user.adsAccountId || null,
        adsAccountName: user.adsAccountName || null,
        instagramAccounts: user.instagramAccounts || []
      }
    });
  } catch (error) {
    console.error('Erro ao renovar token:', error);
    res.status(500).json({ message: 'Erro ao renovar token' });
  }
});

// Iniciar autenticação com Facebook
router.get('/facebook', passport.authenticate('facebook', {
  scope: ['email', 'ads_management', 'ads_read', 'business_management', 'instagram_basic', 'instagram_content_publish']
}));

// Callback de autenticação do Facebook
router.get('/facebook/callback', passport.authenticate('facebook', { session: false }), async (req, res) => {
  try {
    // Usuário autenticado está disponível em req.user
    const user = req.user;
    
    // Gerar tokens
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    const refreshTokenString = crypto.randomBytes(40).toString('hex');
    const refreshTokenDoc = new refreshToken({
      token: refreshTokenString,
      user: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
    });
    
    await refreshTokenDoc.save();
    
    // Redirecionar para o frontend com os tokens
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}&refreshToken=${refreshTokenString}`);
  } catch (error) {
    console.error('Erro no callback do Facebook:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/error`);
  }
});

// Obter informações do usuário atual
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        facebookConnected: !!user.facebookId,
        adsAccountId: user.adsAccountId || null,
        adsAccountName: user.adsAccountName || null,
        instagramAccounts: user.instagramAccounts || []
      }
    });
  } catch (error) {
    console.error('Erro ao obter informações do usuário:', error);
    res.status(500).json({ message: 'Erro ao obter informações do usuário' });
  }
});

// Logout
router.post('/logout', auth, async (req, res) => {
  try {
    const { refreshTokenString } = req.body;
    
    if (refreshTokenString) {
      // Remover refresh token do banco de dados
      await refreshToken.deleteOne({ token: refreshTokenString });
    }
    
    res.status(200).json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    res.status(500).json({ message: 'Erro ao fazer logout' });
  }
});

module.exports = router;
