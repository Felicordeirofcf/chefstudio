const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { 
  decryptToken, 
  generateToken, 
  generateRefreshToken, 
  encryptToken,
  authMiddleware 
} = require('../middleware/auth');

// Iniciar fluxo de autenticação com Facebook
router.get('/facebook', passport.authenticate('facebook', { 
  scope: ['email', 'public_profile', 'ads_management', 'ads_read', 'business_management', 'instagram_basic', 'instagram_content_publish'] 
}));

// Callback após autenticação no Facebook
router.get('/facebook/callback', 
  passport.authenticate('facebook', { session: false, failureRedirect: '/login' }),
  async (req, res) => {
    try {
      // Gerar JWT para o usuário autenticado
      const token = generateToken(req.user._id);
      
      // Gerar refresh token
      const refreshToken = await generateRefreshToken(req.user._id);

      // Redirecionar para o frontend com o token
      const redirectUrl = `${process.env.BASE_URL}/auth-success?token=${token}&refreshToken=${refreshToken}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Erro no callback do Facebook:', error);
      res.redirect('/login?error=auth_failed');
    }
  }
);

// Rota para login tradicional com email/senha
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Verificar se o usuário existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    // Verificar senha
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    // Gerar JWT
    const token = generateToken(user._id);
    
    // Gerar refresh token
    const refreshToken = await generateRefreshToken(user._id);
    
    res.json({ 
      token, 
      refreshToken,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email,
        role: user.role,
        hasMetaAdsConnection: !!user.adsAccountId
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Rota para registro tradicional
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Verificar se o email já está em uso
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email já está em uso' });
    }
    
    // Criar novo usuário
    const user = new User({
      name,
      email,
      password
    });
    
    await user.save();
    
    // Gerar JWT
    const token = generateToken(user._id);
    
    // Gerar refresh token
    const refreshToken = await generateRefreshToken(user._id);
    
    res.status(201).json({ 
      token, 
      refreshToken,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Rota para renovar token JWT usando refresh token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token não fornecido' });
    }
    
    // Verificar se o refresh token existe e é válido
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    
    if (!storedToken) {
      return res.status(401).json({ message: 'Refresh token inválido' });
    }
    
    // Verificar se o token expirou
    if (storedToken.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: storedToken._id });
      return res.status(401).json({ message: 'Refresh token expirado' });
    }
    
    // Buscar usuário
    const user = await User.findById(storedToken.userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Gerar novo token JWT
    const newToken = generateToken(user._id);
    
    // Opcionalmente, gerar novo refresh token e invalidar o antigo
    await RefreshToken.deleteOne({ _id: storedToken._id });
    const newRefreshToken = await generateRefreshToken(user._id);
    
    res.json({ 
      token: newToken, 
      refreshToken: newRefreshToken,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email,
        role: user.role,
        hasMetaAdsConnection: !!user.adsAccountId
      }
    });
  } catch (error) {
    console.error('Erro ao renovar token:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Rota para obter informações do usuário atual
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({ 
      id: req.user._id, 
      name: req.user.name, 
      email: req.user.email,
      role: req.user.role,
      hasMetaAdsConnection: !!req.user.adsAccountId,
      adsAccountId: req.user.adsAccountId,
      adsAccountName: req.user.adsAccountName
    });
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Rota para logout (invalidar refresh token)
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      // Remover refresh token do banco de dados
      await RefreshToken.deleteOne({ token: refreshToken });
    }
    
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

module.exports = router;
