const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const axios = require('axios');

/**
 * Rota para iniciar o processo de login com o Facebook/Meta
 * Solicita permissões para ads_management e ads_read
 */
router.get('/login', async (req, res) => {
  try {
    // Verificar token JWT (seja do header Authorization ou da query string)
    let token = null;
    
    // Verificar se o token está no header Authorization
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    
    // Se não estiver no header, verificar na query string
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    if (!token) {
      return res.status(401).json({ message: 'Token de autenticação não fornecido' });
    }
    
    // Verificar validade do token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: 'Token inválido ou expirado' });
    }
    
    // Verificar se o usuário existe
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado', details: { decodedToken: decoded } });
    }
    
    // Configuração do Facebook
    const appId = process.env.FB_APP_ID;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
    
    if (!appId || !redirectUri) {
      return res.status(500).json({ 
        message: 'Configuração do Facebook incompleta', 
        details: { appId: !!appId, redirectUri: !!redirectUri } 
      });
    }
    
    // Construir URL de login do Facebook com as permissões necessárias
    // Adicionando explicitamente ads_management e ads_read para garantir acesso às métricas e conta de anúncio
    const scopes = 'email,ads_management,ads_read,business_management,instagram_basic,instagram_content_publish,pages_read_engagement,pages_show_list';
    const state = token; // Usar o token como state para recuperá-lo no callback
    
    const loginUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}&response_type=code`;
    
    // Redirecionar para a página de login do Facebook
    res.redirect(loginUrl);
  } catch (error) {
    console.error('Erro ao iniciar login com Facebook:', error);
    res.status(500).json({ message: 'Erro ao iniciar login com Facebook', error: error.message });
  }
});

/**
 * Callback para o processo de login com o Facebook/Meta
 * Recebe o código de autorização e redireciona para o frontend
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({ message: 'Código de autorização ausente' });
    }
    
    // O state contém o token JWT do usuário
    const token = state;
    
    // Redirecionar para o frontend com os parâmetros necessários
    const frontendUrl = process.env.FRONTEND_URL || 'https://chefstudio.vercel.app';
    res.redirect(`${frontendUrl}/meta-callback?code=${code}&token=${token}`);
  } catch (error) {
    console.error('Erro no callback do Facebook:', error);
    // Redirecionar para o frontend com mensagem de erro
    const frontendUrl = process.env.FRONTEND_URL || 'https://chefstudio.vercel.app';
    res.redirect(`${frontendUrl}/meta-callback?error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * Conecta a conta do usuário com o Facebook/Meta
 * Troca o código de autorização por um token de acesso
 * Obtém informações do usuário e suas contas de anúncio
 */
router.post('/connect', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: 'Código de autorização ausente' });
    }
    
    // Obter o usuário a partir do middleware de autenticação
    const userId = req.user.userId;
    
    // Buscar o usuário no banco de dados
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Trocar o código de autorização por um token de acesso
    const appId = process.env.FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
    
    // Fazer a requisição para obter o token de acesso
    const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code: code
      }
    });
    
    const accessToken = tokenResponse.data.access_token;
    
    // Obter informações do usuário do Facebook
    const userInfoResponse = await axios.get('https://graph.facebook.com/v18.0/me', {
      params: {
        access_token: accessToken,
        fields: 'id,name,email'
      }
    });
    
    const facebookUserId = userInfoResponse.data.id;
    
    // Obter contas de anúncio do usuário
    const adAccountsResponse = await axios.get(`https://graph.facebook.com/v18.0/${facebookUserId}/adaccounts`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,account_id,account_status'
      }
    });
    
    // Extrair a primeira conta de anúncio (ou null se não houver)
    const adAccounts = adAccountsResponse.data.data || [];
    const primaryAdAccount = adAccounts.length > 0 ? adAccounts[0] : null;
    
    // Atualizar o usuário com as informações do Meta
    user.metaConnectionStatus = 'connected';
    user.metaAccessToken = accessToken;
    user.metaUserId = facebookUserId;
    user.metaConnectedAt = new Date();
    
    // Salvar o ID da conta de anúncio se disponível
    if (primaryAdAccount) {
      user.adsAccountId = primaryAdAccount.id;
      user.adsAccountName = primaryAdAccount.name;
    }
    
    // Salvar todas as contas de anúncio disponíveis
    user.adAccounts = adAccounts;
    
    // Salvar as alterações no usuário
    await user.save();
    
    // Retornar sucesso com informações atualizadas
    res.json({
      success: true,
      message: 'Conta conectada com sucesso ao Meta',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        metaConnectionStatus: user.metaConnectionStatus,
        metaConnectedAt: user.metaConnectedAt,
        adsAccountId: user.adsAccountId,
        adsAccountName: user.adsAccountName,
        adAccounts: user.adAccounts
      }
    });
  } catch (error) {
    console.error('Erro ao conectar com Meta:', error);
    res.status(500).json({ 
      message: 'Erro ao conectar com Meta', 
      error: error.message,
      details: error.response ? error.response.data : null
    });
  }
});

/**
 * Obtém as contas de anúncios do usuário no Facebook/Meta
 */
router.get('/adaccounts', authMiddleware, async (req, res) => {
  try {
    // Obter o usuário a partir do middleware de autenticação
    const userId = req.user.userId;
    
    // Buscar o usuário no banco de dados
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar se o usuário está conectado ao Meta
    if (user.metaConnectionStatus !== 'connected' || !user.metaAccessToken) {
      return res.status(400).json({ message: 'Usuário não está conectado ao Meta' });
    }
    
    // Se já temos contas de anúncio armazenadas e a solicitação não força atualização, retornar as armazenadas
    if (user.adAccounts && user.adAccounts.length > 0 && !req.query.forceRefresh) {
      return res.json(user.adAccounts);
    }
    
    // Caso contrário, buscar as contas de anúncio atualizadas
    const accessToken = user.metaAccessToken;
    const facebookUserId = user.metaUserId;
    
    // Obter contas de anúncio do usuário
    const adAccountsResponse = await axios.get(`https://graph.facebook.com/v18.0/${facebookUserId}/adaccounts`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,account_id,account_status'
      }
    });
    
    const adAccounts = adAccountsResponse.data.data || [];
    
    // Atualizar as contas de anúncio do usuário
    user.adAccounts = adAccounts;
    
    // Se não tiver conta de anúncio principal definida e houver contas disponíveis, definir a primeira
    if (!user.adsAccountId && adAccounts.length > 0) {
      user.adsAccountId = adAccounts[0].id;
      user.adsAccountName = adAccounts[0].name;
    }
    
    // Salvar as alterações
    await user.save();
    
    // Retornar as contas de anúncio
    res.json(adAccounts);
  } catch (error) {
    console.error('Erro ao obter contas de anúncios:', error);
    res.status(500).json({ 
      message: 'Erro ao obter contas de anúncios', 
      error: error.message,
      details: error.response ? error.response.data : null
    });
  }
});

/**
 * Obtém métricas de campanhas do Facebook/Meta
 */
router.get('/metrics', authMiddleware, async (req, res) => {
  try {
    // Obter o usuário a partir do middleware de autenticação
    const userId = req.user.userId;
    
    // Buscar o usuário no banco de dados
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar se o usuário está conectado ao Meta
    if (user.metaConnectionStatus !== 'connected' || !user.metaAccessToken) {
      return res.status(400).json({ message: 'Usuário não está conectado ao Meta' });
    }
    
    // Verificar se o usuário tem uma conta de anúncio definida
    if (!user.adsAccountId) {
      return res.status(400).json({ message: 'Usuário não tem conta de anúncio definida' });
    }
    
    const accessToken = user.metaAccessToken;
    const adAccountId = user.adsAccountId;
    
    // Definir intervalo de datas (últimos 30 dias por padrão)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const since = req.query.since || thirtyDaysAgo.toISOString().split('T')[0];
    const until = req.query.until || today.toISOString().split('T')[0];
    
    // Obter métricas da conta de anúncio
    const metricsResponse = await axios.get(`https://graph.facebook.com/v18.0/${adAccountId}/insights`, {
      params: {
        access_token: accessToken,
        fields: 'impressions,reach,clicks,spend,ctr,cpc,actions',
        time_range: JSON.stringify({ since, until }),
        level: 'account'
      }
    });
    
    const metrics = metricsResponse.data.data || [];
    
    // Obter número de anúncios ativos
    const adsResponse = await axios.get(`https://graph.facebook.com/v18.0/${adAccountId}/ads`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,status',
        status: ['ACTIVE', 'PAUSED']
      }
    });
    
    const ads = adsResponse.data.data || [];
    const activeAds = ads.filter(ad => ad.status === 'ACTIVE');
    
    // Formatar e retornar as métricas
    const formattedMetrics = {
      impressions: metrics.length > 0 ? parseInt(metrics[0].impressions || 0) : 0,
      reach: metrics.length > 0 ? parseInt(metrics[0].reach || 0) : 0,
      clicks: metrics.length > 0 ? parseInt(metrics[0].clicks || 0) : 0,
      spend: metrics.length > 0 ? parseFloat(metrics[0].spend || 0) : 0,
      ctr: metrics.length > 0 ? parseFloat(metrics[0].ctr || 0) : 0,
      cpc: metrics.length > 0 ? parseFloat(metrics[0].cpc || 0) : 0,
      totalAds: ads.length,
      activeAds: activeAds.length,
      period: {
        since,
        until
      }
    };
    
    res.json(formattedMetrics);
  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    
    // Se for um erro de API do Facebook, retornar dados simulados
    if (error.response && (error.response.status === 400 || error.response.status === 403)) {
      console.log('Retornando dados simulados devido a erro de permissão ou API');
      
      // Dados simulados para desenvolvimento
      return res.json({
        impressions: Math.floor(Math.random() * 10000 + 1000),
        reach: Math.floor(Math.random() * 5000 + 500),
        clicks: Math.floor(Math.random() * 500 + 50),
        spend: (Math.random() * 200 + 50).toFixed(2),
        ctr: (Math.random() * 5 + 1).toFixed(2),
        cpc: (Math.random() * 2 + 0.5).toFixed(2),
        totalAds: Math.floor(Math.random() * 10 + 3),
        activeAds: Math.floor(Math.random() * 5 + 1),
        period: {
          since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          until: new Date().toISOString().split('T')[0]
        },
        simulated: true
      });
    }
    
    res.status(500).json({ 
      message: 'Erro ao obter métricas', 
      error: error.message,
      details: error.response ? error.response.data : null
    });
  }
});

module.exports = router;
