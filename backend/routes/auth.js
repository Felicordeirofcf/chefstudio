// Correção para o arquivo backend/routes/auth.js

const express = require('express');
const router = express.Router();
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/user');
const refreshToken = require('../models/refreshtoken');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');
const axios = require('axios');

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
    
    console.log('Login concluído com sucesso');
    
    // Formato alinhado com o que o frontend espera
    res.json({
      message: 'Login realizado com sucesso',
      _id: user._id,
      name: user.name,
      email: user.email,
      token,
      refreshToken: refreshTokenString,
      metaUserId: user.metaUserId,
      metaConnectionStatus: user.metaConnectionStatus || 'disconnected',
      adsAccountId: user.adsAccountId,
      adsAccountName: user.adsAccountName,
      instagramAccounts: user.instagramAccounts || [],
      plan: user.plan || 'free',
      establishmentName: user.establishmentName,
      businessType: user.businessType,
      whatsapp: user.whatsapp,
      menuLink: user.menuLink,
      address: user.address,
      cep: user.cep
    });
  } catch (error) {
    console.error('Erro ao realizar login:', error);
    res.status(500).json({ 
      message: 'Erro ao realizar login', 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Obtém o perfil do usuário autenticado
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil do usuário obtido com sucesso
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    console.log('Buscando perfil do usuário, ID:', req.user.userId);
    
    // Buscar usuário pelo ID
    const user = await User.findById(req.user.userId);
    
    // Verificar se o usuário existe
    if (!user) {
      console.log('Usuário não encontrado, ID:', req.user.userId);
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Retornar dados do usuário (excluindo a senha)
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      metaUserId: user.metaUserId,
      metaConnectionStatus: user.metaConnectionStatus || 'disconnected',
      adsAccountId: user.adsAccountId,
      adsAccountName: user.adsAccountName,
      adAccounts: user.adAccounts || [],
      plan: user.plan || 'free',
      establishmentName: user.establishmentName,
      businessType: user.businessType,
      whatsapp: user.whatsapp,
      menuLink: user.menuLink,
      address: user.address,
      cep: user.cep,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    console.error('Erro ao buscar perfil do usuário:', error);
    res.status(500).json({ 
      message: 'Erro ao buscar perfil do usuário', 
      error: error.message 
    });
  }
});

// Manter as rotas existentes...
// (Manter o restante do arquivo auth.js intacto)

module.exports = router;
