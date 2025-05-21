const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

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
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
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
    // Implementação futura: integração real com a API do Facebook
    // Por enquanto, retornar dados simulados
    res.json([
      { id: "act_123456789", name: "Conta Principal de Anúncios" },
      { id: "act_987654321", name: "Conta Secundária de Anúncios" }
    ]);
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

module.exports = router;
