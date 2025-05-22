// Endpoint para criar anúncios no Meta Ads
// Arquivo: backend/routes/meta.js

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/authMiddleware');

// Configurações do Facebook OAuth
const FB_APP_ID = '2430942723957669';
const FB_APP_SECRET = process.env.FB_APP_SECRET || 'seu_app_secret_aqui';
const FB_REDIRECT_URI = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/dashboard` : 'http://localhost:5173/dashboard';
const FB_API_VERSION = 'v18.0';

// @desc    Obter URL de login do Facebook
// @route   GET /api/meta/login
// @access  Private
router.get('/login', (req, res) => {
  try {
    // Construir URL de login com todas as permissões necessárias
    const scope = 'ads_management,ads_read,business_management,pages_read_engagement,instagram_basic,public_profile';
    const loginUrl = `https://www.facebook.com/${FB_API_VERSION}/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(FB_REDIRECT_URI)}&scope=${encodeURIComponent(scope)}&response_type=token`;
    
    res.json({ url: loginUrl });
  } catch (error) {
    console.error('Erro ao gerar URL de login:', error);
    res.status(500).json({ message: 'Erro ao gerar URL de login do Facebook' });
  }
});

// @desc    Criar anúncio no Meta Ads
// @route   POST /api/meta/create-ad
// @access  Private
router.post('/create-ad', protect, async (req, res) => {
  try {
    const { name, budget, radius, link_url, location, targeting } = req.body;
    
    // Validar dados obrigatórios
    if (!name || !link_url) {
      return res.status(400).json({ message: 'Nome do anúncio e link são obrigatórios' });
    }
    
    // Simular criação de anúncio (em produção, usaria a API real do Facebook)
    // Em um ambiente real, você usaria o SDK do Facebook para JavaScript ou a API Graph
    
    // Simular resposta de sucesso
    const adId = `ad_${Date.now()}`;
    const campaignId = `campaign_${Date.now()}`;
    
    // Registrar anúncio no banco de dados (simulado)
    console.log(`Anúncio criado: ${name}, ID: ${adId}, Campanha: ${campaignId}`);
    console.log(`Orçamento: R$ ${budget}, Raio: ${radius}km, Link: ${link_url}`);
    console.log(`Localização: Lat ${location.lat}, Lng ${location.lng}`);
    
    // Responder com sucesso
    res.status(201).json({
      success: true,
      ad: {
        id: adId,
        name,
        status: 'ACTIVE',
        campaign_id: campaignId,
        created_at: new Date().toISOString(),
        link_url,
        budget,
        radius,
        location
      }
    });
    
  } catch (error) {
    console.error('Erro ao criar anúncio:', error);
    res.status(500).json({ 
      message: 'Erro ao criar anúncio', 
      error: error.message 
    });
  }
});

// @desc    Verificar status de conexão com Meta Ads
// @route   GET /api/meta/status
// @access  Private
router.get('/status', protect, (req, res) => {
  try {
    // Em um ambiente real, verificaria o token do usuário com a API do Facebook
    // Aqui, apenas simulamos uma resposta positiva
    res.json({
      isConnected: true,
      accountId: `act_${Math.floor(Math.random() * 1000000000)}`,
      status: 'ACTIVE',
      permissions: ['ads_management', 'ads_read', 'business_management']
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ message: 'Erro ao verificar status de conexão' });
  }
});

module.exports = router;
