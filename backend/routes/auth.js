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
