const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const axios = require('axios');

/**
 * @swagger
 * /api/meta/login:
 *   get:
 *     summary: Inicia o processo de login com o Facebook/Meta
 *     tags: [Meta]
 *     parameters:
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         description: Token JWT do usuário (alternativa ao header Authorization)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       302:
 *         description: Redirecionamento para a página de login do Facebook
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
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
      return res.status(401).json({ 
        message: 'Usuário não encontrado',
        details: {
          decodedToken: decoded
        }
      });
    }
    
    // Configuração do Facebook
    const appId = process.env.FB_APP_ID;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
    
    if (!appId || !redirectUri) {
      return res.status(500).json({ 
        message: 'Configuração do Facebook incompleta',
        details: {
          appId: !!appId,
          redirectUri: !!redirectUri
        }
      });
    }
    
    // Construir URL de login do Facebook
    const scopes = 'email,ads_management,ads_read,business_management,instagram_basic,instagram_content_publish,pages_read_engagement,pages_show_list';
    const state = token; // Usar o token como state para recuperá-lo no callback
    
    const loginUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}&response_type=code`;
    
    // Redirecionar para a página de login do Facebook
    res.redirect(loginUrl);
  } catch (error) {
    console.error('Erro ao iniciar login com Facebook:', error);
    res.status(500).json({ 
      message: 'Erro ao iniciar login com Facebook',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/meta/callback:
 *   get:
 *     summary: Callback para o processo de login com o Facebook/Meta
 *     tags: [Meta]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Código de autorização do Facebook
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Estado (token JWT) passado na requisição inicial
 *     responses:
 *       302:
 *         description: Redirecionamento para o frontend após processamento
 *       400:
 *         description: Parâmetros inválidos
 *       500:
 *         description: Erro interno do servidor
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
 * @swagger
 * /api/meta/connect:
 *   post:
 *     summary: Conecta a conta do usuário com o Facebook/Meta
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 description: Código de autorização do Facebook
 *     responses:
 *       200:
 *         description: Conexão realizada com sucesso
 *       400:
 *         description: Parâmetros inválidos
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
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
    
    // Simular troca do código de autorização por token de acesso
    // Em produção, isso seria feito com uma chamada real à API do Facebook
    const mockAccessToken = `mock_access_token_${Date.now()}`;
    
    // Atualizar o usuário com as informações do Meta
    user.metaConnectionStatus = 'connected';
    user.metaAccessToken = mockAccessToken;
    user.metaConnectedAt = new Date();
    
    // Adicionar conta de anúncios simulada
    user.metaPrimaryAdAccountId = "act_123456789";
    user.metaPrimaryAdAccountName = "Conta Principal de Anúncios";
    user.metaAdAccounts = [
      { id: "act_123456789", name: "Conta Principal de Anúncios" },
      { id: "act_987654321", name: "Conta Secundária de Anúncios" }
    ];
    
    // Salvar as alterações no usuário
    await user.save();
    
    // Retornar sucesso
    res.json({
      success: true,
      message: 'Conta conectada com sucesso ao Meta',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        metaConnectionStatus: user.metaConnectionStatus,
        metaConnectedAt: user.metaConnectedAt,
        metaPrimaryAdAccountId: user.metaPrimaryAdAccountId,
        metaPrimaryAdAccountName: user.metaPrimaryAdAccountName,
        metaAdAccounts: user.metaAdAccounts
      }
    });
  } catch (error) {
    console.error('Erro ao conectar com Meta:', error);
    res.status(500).json({ 
      message: 'Erro ao conectar com Meta',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/meta/adaccounts:
 *   get:
 *     summary: Obtém as contas de anúncios do usuário no Facebook/Meta
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de contas de anúncios obtida com sucesso
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
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
    if (user.metaConnectionStatus !== 'connected') {
      return res.status(400).json({ 
        message: 'Usuário não está conectado ao Meta',
        connectionStatus: user.metaConnectionStatus
      });
    }
    
    // Retornar contas de anúncios do usuário ou simuladas
    const adAccounts = user.metaAdAccounts || [
      { id: "act_123456789", name: "Conta Principal de Anúncios" },
      { id: "act_987654321", name: "Conta Secundária de Anúncios" }
    ];
    
    res.json(adAccounts);
  } catch (error) {
    console.error('Erro ao obter contas de anúncios:', error);
    res.status(500).json({ 
      message: 'Erro ao obter contas de anúncios',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/meta/metrics:
 *   get:
 *     summary: Obtém métricas de campanhas do Facebook/Meta
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas obtidas com sucesso
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
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
    if (user.metaConnectionStatus !== 'connected') {
      return res.status(400).json({ 
        message: 'Usuário não está conectado ao Meta',
        connectionStatus: user.metaConnectionStatus
      });
    }
    
    // Implementação futura: integração real com a API do Facebook
    // Por enquanto, retornar dados simulados
    res.json({
      reach: Math.floor(Math.random() * 1000 + 100),
      clicks: Math.floor(Math.random() * 200 + 50),
      spend: (Math.random() * 100 + 20).toFixed(2),
      ctr: (Math.random() * 5 + 1).toFixed(2),
    });
  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    res.status(500).json({ 
      message: 'Erro ao obter métricas',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/meta/campaigns:
 *   get:
 *     summary: Obtém as campanhas do usuário no Facebook/Meta
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de campanhas obtida com sucesso
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/campaigns', authMiddleware, async (req, res) => {
  try {
    // Obter o usuário a partir do middleware de autenticação
    const userId = req.user.userId;
    
    // Buscar o usuário no banco de dados
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar se o usuário está conectado ao Meta
    if (user.metaConnectionStatus !== 'connected') {
      return res.status(400).json({ 
        message: 'Usuário não está conectado ao Meta',
        connectionStatus: user.metaConnectionStatus
      });
    }
    
    // Implementação futura: integração real com a API do Facebook
    // Por enquanto, retornar dados simulados
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

/**
 * @swagger
 * /api/meta/connection-status:
 *   get:
 *     summary: Verifica o status de conexão do usuário com o Meta
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status de conexão obtido com sucesso
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/connection-status', authMiddleware, async (req, res) => {
  try {
    // Obter o usuário a partir do middleware de autenticação
    const userId = req.user.userId;
    
    // Buscar o usuário no banco de dados
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar status de conexão
    const isConnected = user.metaConnectionStatus === 'connected';
    
    // Verificar se o token expirou (simulado)
    const tokenExpired = user.metaConnectedAt && 
      new Date(user.metaConnectedAt).getTime() + (90 * 24 * 60 * 60 * 1000) < Date.now();
    
    // Status final
    let status = 'disconnected';
    if (isConnected) {
      status = tokenExpired ? 'expired' : 'connected';
    }
    
    res.json({
      connected: status === 'connected',
      status: status,
      metaUserId: user.metaUserId || null,
      metaPrimaryAdAccountId: user.metaPrimaryAdAccountId || null,
      metaPrimaryAdAccountName: user.metaPrimaryAdAccountName || null,
      metaAdAccounts: user.metaAdAccounts || [],
      lastChecked: new Date()
    });
  } catch (error) {
    console.error('Erro ao verificar status de conexão:', error);
    res.status(500).json({ 
      message: 'Erro ao verificar status de conexão',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/meta/auth-url:
 *   get:
 *     summary: Obtém a URL de autorização do Facebook/Meta
 *     tags: [Meta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: URL de autorização obtida com sucesso
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/auth-url', authMiddleware, async (req, res) => {
  try {
    // Obter o usuário a partir do middleware de autenticação
    const userId = req.user.userId;
    
    // Buscar o usuário no banco de dados
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Configuração do Facebook
    const appId = process.env.FB_APP_ID || '123456789';
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || 'https://chefstudio-production.up.railway.app/api/meta/callback';
    
    // Construir URL de login do Facebook
    const scopes = 'email,ads_management,ads_read,business_management,instagram_basic,instagram_content_publish,pages_read_engagement,pages_show_list';
    const state = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
    
    const loginUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}&response_type=code`;
    
    res.json({
      url: loginUrl
    });
  } catch (error) {
    console.error('Erro ao obter URL de autorização:', error);
    res.status(500).json({ 
      message: 'Erro ao obter URL de autorização',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/meta/create-ad-from-post:
 *   post:
 *     summary: Cria um anúncio a partir de uma publicação existente
 *     tags: [Meta]
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
 *                 description: Data de término do anúncio opcional
 *               targetCountry:
 *                 type: string
 *                 description: Código do país alvo
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
router.post('/create-ad-from-post', authMiddleware, async (req, res) => {
  try {
    const { postUrl, adName, dailyBudget, startDate, endDate, targetCountry } = req.body;
    
    if (!postUrl) {
      return res.status(400).json({ message: 'URL da publicação é obrigatória' });
    }
    
    // Obter o usuário a partir do middleware de autenticação
    const userId = req.user.userId;
    
    // Buscar o usuário no banco de dados
    const user = await User.findById(userId);
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

module.exports = router;
