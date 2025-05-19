const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { decryptToken } = require('../middleware/passport');

// Iniciar fluxo de autenticação com Facebook
router.get('/facebook', passport.authenticate('facebook', { 
  scope: ['email', 'public_profile', 'ads_management', 'ads_read', 'business_management'] 
}));

// Callback após autenticação no Facebook
router.get('/facebook/callback', 
  passport.authenticate('facebook', { session: false, failureRedirect: '/login' }),
  async (req, res) => {
    try {
      // Gerar JWT para o usuário autenticado
      const token = jwt.sign(
        { id: req.user._id }, 
        process.env.JWT_SECRET, 
        { expiresIn: '7d' }
      );

      // Redirecionar para o frontend com o token
      const redirectUrl = `${process.env.BASE_URL}/auth-success?token=${token}`;
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
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    res.json({ token, user: { 
      id: user._id, 
      name: user.name, 
      email: user.email,
      role: user.role,
      hasMetaAdsConnection: !!user.adsAccountId
    }});
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
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    res.status(201).json({ token, user: { 
      id: user._id, 
      name: user.name, 
      email: user.email,
      role: user.role
    }});
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Rota para obter informações do usuário atual
router.get('/me', async (req, res) => {
  try {
    // Extrair token do cabeçalho
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuário
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    res.json({ 
      id: user._id, 
      name: user.name, 
      email: user.email,
      role: user.role,
      hasMetaAdsConnection: !!user.adsAccountId,
      adsAccountId: user.adsAccountId,
      adsAccountName: user.adsAccountName
    });
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    res.status(401).json({ message: 'Token inválido' });
  }
});

module.exports = router;
