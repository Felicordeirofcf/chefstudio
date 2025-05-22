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
const FB_GRAPH_API = `https://graph.facebook.com/${FB_API_VERSION}`;

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

// @desc    Trocar código de autorização por token de acesso
// @route   POST /api/meta/exchange-code
// @access  Public
router.post('/exchange-code', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: 'Código de autorização é obrigatório' });
    }
    
    // Fazer requisição para trocar código por token
    const tokenUrl = `${FB_GRAPH_API}/oauth/access_token?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(FB_REDIRECT_URI)}&client_secret=${FB_APP_SECRET}&code=${code}`;
    
    const response = await axios.get(tokenUrl);
    const { access_token, expires_in } = response.data;
    
    res.json({
      access_token,
      expires_in,
      token_type: 'bearer'
    });
    
  } catch (error) {
    console.error('Erro ao trocar código por token:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Erro ao trocar código por token', 
      error: error.response?.data || error.message 
    });
  }
});

// @desc    Criar anúncio no Meta Ads
// @route   POST /api/meta/create-ad
// @access  Private
router.post('/create-ad', protect, async (req, res) => {
  try {
    const { 
      name, 
      budget, 
      radius, 
      link_url, 
      location, 
      targeting,
      access_token 
    } = req.body;
    
    // Validar dados obrigatórios
    if (!name || !link_url) {
      return res.status(400).json({ message: 'Nome do anúncio e link são obrigatórios' });
    }
    
    if (!access_token) {
      return res.status(400).json({ message: 'Token de acesso do Facebook é obrigatório' });
    }
    
    // 1. Obter contas de anúncio do usuário
    const accountsResponse = await axios.get(
      `${FB_GRAPH_API}/me/adaccounts?fields=id,name,account_status&access_token=${access_token}`
    );
    
    if (!accountsResponse.data.data || accountsResponse.data.data.length === 0) {
      return res.status(400).json({ 
        message: 'Nenhuma conta de anúncio encontrada. Verifique se você tem uma conta de anúncio no Facebook.' 
      });
    }
    
    // Usar a primeira conta de anúncio ativa
    const adAccount = accountsResponse.data.data.find(account => account.account_status === 1) || accountsResponse.data.data[0];
    const adAccountId = adAccount.id;
    
    // 2. Criar campanha
    const campaignData = {
      name: `Campanha: ${name}`,
      objective: 'REACH',
      status: 'ACTIVE',
      special_ad_categories: [],
      access_token
    };
    
    const campaignResponse = await axios.post(
      `${FB_GRAPH_API}/${adAccountId}/campaigns`,
      campaignData
    );
    
    const campaignId = campaignResponse.data.id;
    
    // 3. Criar conjunto de anúncios (Ad Set)
    const adSetData = {
      name: `Conjunto: ${name}`,
      campaign_id: campaignId,
      daily_budget: budget * 100, // Em centavos
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'REACH',
      bid_amount: 500, // Valor sugerido em centavos
      targeting: {
        geo_locations: {
          custom_locations: [{
            radius: radius,
            latitude: location.lat,
            longitude: location.lng,
            distance_unit: "kilometer"
          }]
        },
        age_min: 18,
        age_max: 65,
        publisher_platforms: ["facebook", "instagram"],
        device_platforms: ["mobile", "desktop"]
      },
      status: 'ACTIVE',
      access_token
    };
    
    const adSetResponse = await axios.post(
      `${FB_GRAPH_API}/${adAccountId}/adsets`,
      adSetData
    );
    
    const adSetId = adSetResponse.data.id;
    
    // 4. Criar anúncio
    const adData = {
      name: name,
      adset_id: adSetId,
      creative: {
        title: name,
        body: `Confira nossa promoção! Clique para saber mais.`,
        object_url: link_url,
        link_url: link_url
      },
      status: 'ACTIVE',
      access_token
    };
    
    const adResponse = await axios.post(
      `${FB_GRAPH_API}/${adAccountId}/ads`,
      adData
    );
    
    const adId = adResponse.data.id;
    
    // Responder com sucesso
    res.status(201).json({
      success: true,
      ad: {
        id: adId,
        name,
        status: 'ACTIVE',
        campaign_id: campaignId,
        adset_id: adSetId,
        created_at: new Date().toISOString(),
        link_url,
        budget,
        radius,
        location
      }
    });
    
  } catch (error) {
    console.error('Erro ao criar anúncio:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Erro ao criar anúncio', 
      error: error.response?.data || error.message 
    });
  }
});

// @desc    Verificar status de conexão com Meta Ads
// @route   GET /api/meta/status
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let token = '';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      // Tentar obter token do corpo da requisição
      token = req.query.access_token || req.body.access_token;
    }
    
    if (!token) {
      return res.status(400).json({ message: 'Token de acesso não fornecido' });
    }
    
    // Verificar token com a API do Facebook
    const response = await axios.get(`${FB_GRAPH_API}/me?fields=id,name&access_token=${token}`);
    
    if (!response.data || !response.data.id) {
      return res.status(401).json({ 
        isConnected: false,
        message: 'Token inválido ou expirado' 
      });
    }
    
    // Verificar permissões
    const permissionsResponse = await axios.get(`${FB_GRAPH_API}/me/permissions?access_token=${token}`);
    const permissions = permissionsResponse.data.data.map(p => p.permission);
    
    // Verificar contas de anúncio
    const accountsResponse = await axios.get(`${FB_GRAPH_API}/me/adaccounts?fields=id,name,account_status&access_token=${token}`);
    const accounts = accountsResponse.data.data || [];
    
    res.json({
      isConnected: true,
      userId: response.data.id,
      userName: response.data.name,
      permissions,
      accounts: accounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        status: acc.account_status === 1 ? 'ACTIVE' : 'INACTIVE'
      }))
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error.response?.data || error.message);
    res.status(500).json({ 
      isConnected: false,
      message: 'Erro ao verificar status de conexão',
      error: error.response?.data || error.message
    });
  }
});

module.exports = router;
