// Implementação para buscar automaticamente o ID da conta de anúncio do cliente
// Arquivo: backend/routes/meta.js

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/user');

// Configurações do Facebook
const FACEBOOK_API_VERSION = 'v18.0'; // Atualize para a versão mais recente
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

/**
 * @route   GET /api/meta/adaccounts
 * @desc    Busca as contas de anúncio do usuário no Facebook
 * @access  Private
 */
router.get('/adaccounts', authMiddleware, async (req, res) => {
  try {
    // Buscar usuário pelo ID
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar se o usuário tem um token de acesso do Facebook
    if (!user.metaAccessToken) {
      return res.status(400).json({ 
        message: 'Usuário não conectado ao Facebook', 
        metaConnectionStatus: 'disconnected' 
      });
    }
    
    // Buscar contas de anúncio do usuário no Facebook
    const response = await axios.get(`${FACEBOOK_GRAPH_URL}/me/adaccounts`, {
      params: {
        access_token: user.metaAccessToken,
        fields: 'id,name,account_status,amount_spent,currency,business_name'
      }
    });
    
    // Extrair contas de anúncio da resposta
    const adAccounts = response.data.data || [];
    
    // Atualizar usuário com as contas de anúncio
    user.adAccounts = adAccounts.map(account => ({
      id: account.id,
      name: account.name || account.business_name || 'Conta de Anúncio',
      status: account.account_status,
      amountSpent: account.amount_spent,
      currency: account.currency
    }));
    
    // Se houver pelo menos uma conta, definir a primeira como padrão
    if (adAccounts.length > 0) {
      user.adsAccountId = adAccounts[0].id;
      user.adsAccountName = adAccounts[0].name || adAccounts[0].business_name || 'Conta de Anúncio';
    }
    
    await user.save();
    
    // Retornar as contas de anúncio
    res.json(user.adAccounts);
  } catch (error) {
    console.error('Erro ao buscar contas de anúncio:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Erro ao buscar contas de anúncio', 
      error: error.response?.data?.error?.message || error.message 
    });
  }
});

/**
 * @route   GET /api/meta/posts
 * @desc    Busca as publicações da página do Facebook do usuário
 * @access  Private
 */
router.get('/posts', authMiddleware, async (req, res) => {
  try {
    // Buscar usuário pelo ID
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar se o usuário tem um token de acesso do Facebook
    if (!user.metaAccessToken) {
      return res.status(400).json({ 
        message: 'Usuário não conectado ao Facebook', 
        metaConnectionStatus: 'disconnected' 
      });
    }
    
    // Primeiro, buscar as páginas do usuário
    const pagesResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/me/accounts`, {
      params: {
        access_token: user.metaAccessToken,
        fields: 'id,name,access_token'
      }
    });
    
    const pages = pagesResponse.data.data || [];
    
    if (pages.length === 0) {
      return res.status(400).json({ message: 'Nenhuma página do Facebook encontrada' });
    }
    
    // Usar a primeira página para buscar publicações
    const page = pages[0];
    
    // Buscar publicações da página
    const postsResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/${page.id}/posts`, {
      params: {
        access_token: page.access_token,
        fields: 'id,message,created_time,permalink_url,full_picture,attachments',
        limit: 10 // Limitar a 10 publicações recentes
      }
    });
    
    const posts = postsResponse.data.data || [];
    
    // Formatar as publicações para o frontend
    const formattedPosts = posts.map(post => ({
      id: post.id,
      message: post.message || 'Publicação sem texto',
      created_time: post.created_time,
      permalink_url: post.permalink_url,
      picture: post.full_picture || (post.attachments?.data[0]?.media?.image?.src) || null
    }));
    
    res.json(formattedPosts);
  } catch (error) {
    console.error('Erro ao buscar publicações do Facebook:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Erro ao buscar publicações do Facebook', 
      error: error.response?.data?.error?.message || error.message 
    });
  }
});

/**
 * @route   GET /api/meta/metrics
 * @desc    Busca métricas de anúncios do Facebook
 * @access  Private
 */
router.get('/metrics', authMiddleware, async (req, res) => {
  try {
    // Buscar usuário pelo ID
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar se o usuário tem um token de acesso do Facebook e uma conta de anúncio
    if (!user.metaAccessToken || !user.adsAccountId) {
      return res.status(400).json({ 
        message: 'Usuário não conectado ao Facebook ou sem conta de anúncio', 
        metaConnectionStatus: user.metaAccessToken ? 'connected' : 'disconnected',
        hasAdsAccount: !!user.adsAccountId
      });
    }
    
    // Buscar métricas da conta de anúncio
    const response = await axios.get(`${FACEBOOK_GRAPH_URL}/${user.adsAccountId}/insights`, {
      params: {
        access_token: user.metaAccessToken,
        fields: 'impressions,clicks,spend,cpc,ctr',
        date_preset: 'last_30_days',
        level: 'account'
      }
    });
    
    const insights = response.data.data || [];
    
    // Buscar número de anúncios ativos
    const adsResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/${user.adsAccountId}/ads`, {
      params: {
        access_token: user.metaAccessToken,
        fields: 'id,status',
        limit: 1000 // Buscar até 1000 anúncios
      }
    });
    
    const ads = adsResponse.data.data || [];
    const activeAds = ads.filter(ad => ad.status === 'ACTIVE').length;
    const totalAds = ads.length;
    
    // Formatar métricas para o dashboard
    const metrics = {
      impressions: insights[0]?.impressions || 0,
      clicks: insights[0]?.clicks || 0,
      spend: insights[0]?.spend || 0,
      cpc: insights[0]?.cpc || 0,
      ctr: insights[0]?.ctr || 0,
      activeAds,
      totalAds
    };
    
    res.json(metrics);
  } catch (error) {
    console.error('Erro ao buscar métricas do Facebook:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Erro ao buscar métricas do Facebook', 
      error: error.response?.data?.error?.message || error.message 
    });
  }
});

/**
 * @route   POST /api/meta/login
 * @desc    Inicia o processo de login com Facebook
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    
    if (!code || !redirectUri) {
      return res.status(400).json({ message: 'Código de autorização e URI de redirecionamento são obrigatórios' });
    }
    
    // Trocar o código de autorização por um token de acesso
    const tokenResponse = await axios.get('https://graph.facebook.com/oauth/access_token', {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        code,
        redirect_uri: redirectUri
      }
    });
    
    const { access_token, expires_in } = tokenResponse.data;
    
    // Buscar informações do usuário
    const userResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/me`, {
      params: {
        access_token,
        fields: 'id,name,email'
      }
    });
    
    const { id: facebookId, name, email } = userResponse.data;
    
    // Buscar ou criar usuário
    let user = await User.findOne({ email });
    
    if (!user) {
      // Criar novo usuário
      user = new User({
        name,
        email,
        metaUserId: facebookId,
        metaAccessToken: access_token,
        metaTokenExpires: new Date(Date.now() + expires_in * 1000),
        metaConnectionStatus: 'connected'
      });
    } else {
      // Atualizar usuário existente
      user.metaUserId = facebookId;
      user.metaAccessToken = access_token;
      user.metaTokenExpires = new Date(Date.now() + expires_in * 1000);
      user.metaConnectionStatus = 'connected';
    }
    
    await user.save();
    
    // Buscar contas de anúncio imediatamente após o login
    try {
      const adAccountsResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/me/adaccounts`, {
        params: {
          access_token,
          fields: 'id,name,account_status,amount_spent,currency,business_name'
        }
      });
      
      const adAccounts = adAccountsResponse.data.data || [];
      
      user.adAccounts = adAccounts.map(account => ({
        id: account.id,
        name: account.name || account.business_name || 'Conta de Anúncio',
        status: account.account_status,
        amountSpent: account.amount_spent,
        currency: account.currency
      }));
      
      // Se houver pelo menos uma conta, definir a primeira como padrão
      if (adAccounts.length > 0) {
        user.adsAccountId = adAccounts[0].id;
        user.adsAccountName = adAccounts[0].name || adAccounts[0].business_name || 'Conta de Anúncio';
      }
      
      await user.save();
    } catch (error) {
      console.error('Erro ao buscar contas de anúncio após login:', error);
      // Não falhar o login se não conseguir buscar as contas de anúncio
    }
    
    // Gerar token JWT para autenticação
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        metaUserId: user.metaUserId,
        metaConnectionStatus: user.metaConnectionStatus,
        adsAccountId: user.adsAccountId,
        adsAccountName: user.adsAccountName,
        adAccounts: user.adAccounts || []
      }
    });
  } catch (error) {
    console.error('Erro no login com Facebook:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Erro no login com Facebook', 
      error: error.response?.data?.error?.message || error.message 
    });
  }
});

module.exports = router;
