const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/user');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'));
    }
  }
});

/**
 * @swagger
 * /api/meta-ads/create-from-post:
 *   post:
 *     summary: Cria um anúncio a partir de uma publicação existente
 *     tags: [Meta Ads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postUrl
 *             properties:
 *               postUrl:
 *                 type: string
 *                 description: URL da publicação do Facebook
 *               adName:
 *                 type: string
 *                 description: Nome do anúncio
 *               dailyBudget:
 *                 type: string
 *                 description: Orçamento diário em reais
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Data de início do anúncio
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Data de término do anúncio (opcional)
 *               targetCountry:
 *                 type: string
 *                 description: Código do país alvo (ex: BR)
 *     responses:
 *       200:
 *         description: Anúncio criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/create-from-post', authMiddleware, async (req, res) => {
  try {
    const { postUrl, adName, dailyBudget, startDate, endDate, targetCountry } = req.body;
    
    if (!postUrl) {
      return res.status(400).json({ message: 'URL da publicação é obrigatória' });
    }
    
    // Obter o usuário
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar se o usuário está conectado ao Meta
    if (user.metaConnectionStatus !== 'connected') {
      return res.status(400).json({ 
        message: 'Você precisa conectar sua conta ao Meta Ads primeiro',
        connectionStatus: user.metaConnectionStatus
      });
    }
    
    // Extrair ID da publicação da URL
    let postId = null;
    
    // Tentar extrair o ID da publicação da URL
    if (postUrl.includes('fbid=')) {
      const fbidMatch = postUrl.match(/fbid=(\d+)/);
      if (fbidMatch && fbidMatch[1]) {
        postId = fbidMatch[1];
      }
    } else if (postUrl.includes('/posts/')) {
      const postsMatch = postUrl.match(/\/posts\/(\d+)/);
      if (postsMatch && postsMatch[1]) {
        postId = postsMatch[1];
      }
    }
    
    if (!postId) {
      return res.status(400).json({ 
        message: 'Não foi possível extrair o ID da publicação da URL fornecida',
        postUrl
      });
    }
    
    // Em um ambiente real, aqui seria feita a chamada para a API do Facebook
    // para criar o anúncio a partir da publicação
    
    // Simulação de criação de anúncio
    const adDetails = {
      name: adName || `Anúncio ${user.establishmentName || 'Restaurante'} ${new Date().toLocaleDateString('pt-BR')}`,
      dailyBudget: parseFloat(dailyBudget || 50),
      startDate: startDate || new Date(),
      endDate: endDate || null,
      targetCountry: targetCountry || 'BR',
      status: 'PAUSED',
      postId: postId,
      campaignId: `23848${Math.floor(Math.random() * 10000000)}`,
      adSetId: `23848${Math.floor(Math.random() * 10000000)}`,
      adId: `23848${Math.floor(Math.random() * 10000000)}`
    };
    
    // Em um ambiente real, salvaríamos o anúncio no banco de dados
    
    res.json({
      success: true,
      message: 'Anúncio criado com sucesso',
      adDetails
    });
  } catch (error) {
    console.error('Erro ao criar anúncio a partir de publicação:', error);
    res.status(500).json({ 
      message: 'Erro ao criar anúncio',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/meta-ads/create-from-image:
 *   post:
 *     summary: Cria um anúncio a partir de uma imagem
 *     tags: [Meta Ads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Imagem para o anúncio
 *               adName:
 *                 type: string
 *                 description: Nome do anúncio
 *               dailyBudget:
 *                 type: string
 *                 description: Orçamento diário em reais
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Data de início do anúncio
 *               targetCountry:
 *                 type: string
 *                 description: Código do país alvo (ex: BR)
 *     responses:
 *       200:
 *         description: Anúncio criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/create-from-image', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { adName, dailyBudget, startDate, targetCountry } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Imagem é obrigatória' });
    }
    
    // Obter o usuário
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar se o usuário está conectado ao Meta
    if (user.metaConnectionStatus !== 'connected') {
      return res.status(400).json({ 
        message: 'Você precisa conectar sua conta ao Meta Ads primeiro',
        connectionStatus: user.metaConnectionStatus
      });
    }
    
    // Em um ambiente real, aqui seria feita a chamada para a API do Facebook
    // para fazer upload da imagem e criar o anúncio
    
    // Simulação de criação de anúncio
    const adDetails = {
      name: adName || `Anúncio ${user.establishmentName || 'Restaurante'} ${new Date().toLocaleDateString('pt-BR')}`,
      dailyBudget: parseFloat(dailyBudget || 50),
      startDate: startDate || new Date(),
      targetCountry: targetCountry || 'BR',
      status: 'PAUSED',
      imageUrl: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`,
      campaignId: `23848${Math.floor(Math.random() * 10000000)}`,
      adSetId: `23848${Math.floor(Math.random() * 10000000)}`,
      adId: `23848${Math.floor(Math.random() * 10000000)}`
    };
    
    // Em um ambiente real, salvaríamos o anúncio no banco de dados
    
    res.json({
      success: true,
      message: 'Anúncio criado com sucesso',
      adDetails
    });
  } catch (error) {
    console.error('Erro ao criar anúncio a partir de imagem:', error);
    res.status(500).json({ 
      message: 'Erro ao criar anúncio',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/meta-ads/campaigns:
 *   get:
 *     summary: Obtém as campanhas do usuário
 *     tags: [Meta Ads]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Campanhas obtidas com sucesso
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/campaigns', authMiddleware, async (req, res) => {
  try {
    // Obter o usuário
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar se o usuário está conectado ao Meta
    if (user.metaConnectionStatus !== 'connected') {
      return res.status(400).json({ 
        message: 'Você precisa conectar sua conta ao Meta Ads primeiro',
        connectionStatus: user.metaConnectionStatus
      });
    }
    
    // Em um ambiente real, aqui seria feita a chamada para a API do Facebook
    // para obter as campanhas do usuário
    
    // Simulação de campanhas
    const campaigns = [
      {
        id: '23848123456789',
        name: 'Campanha de Verão',
        status: 'ACTIVE',
        dailyBudget: 50.00,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        metrics: {
          reach: 1234,
          impressions: 5678,
          clicks: 89,
          spend: 123.45
        }
      },
      {
        id: '23848987654321',
        name: 'Promoção de Fim de Semana',
        status: 'PAUSED',
        dailyBudget: 30.00,
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        endDate: null,
        metrics: {
          reach: 567,
          impressions: 2345,
          clicks: 45,
          spend: 67.89
        }
      }
    ];
    
    res.json({
      success: true,
      campaigns
    });
  } catch (error) {
    console.error('Erro ao obter campanhas:', error);
    res.status(500).json({ 
      message: 'Erro ao obter campanhas',
      error: error.message
    });
  }
});

module.exports = router;
