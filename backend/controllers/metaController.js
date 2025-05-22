const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");

// Configurações do Meta
const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const REDIRECT_URI = process.env.META_REDIRECT_URI || "https://chefstudio-production.up.railway.app/api/meta/callback";
const SCOPES = "ads_management,ads_read,business_management,public_profile,email";

// Função para extrair ID da publicação a partir da URL
const extractPostIdFromUrl = (url) => {
  try {
    // Tentar extrair o ID da publicação de diferentes formatos de URL
    // Formato: https://www.facebook.com/photo/?fbid=122102873852863870&set=a.122102873882863870
    const fbidMatch = url.match(/fbid=(\d+)/);
    if (fbidMatch && fbidMatch[1]) {
      return fbidMatch[1];
    }
    
    // Formato: https://www.facebook.com/username/posts/123456789
    const postsMatch = url.match(/\/posts\/(\d+)/);
    if (postsMatch && postsMatch[1]) {
      return postsMatch[1];
    }
    
    // Formato: https://www.facebook.com/permalink.php?story_fbid=123456789
    const storyMatch = url.match(/story_fbid=(\d+)/);
    if (storyMatch && storyMatch[1]) {
      return storyMatch[1];
    }
    
    throw new Error("Não foi possível extrair o ID da publicação da URL fornecida");
  } catch (error) {
    console.error("Erro ao extrair ID da publicação:", error);
    throw new Error("Formato de URL inválido ou não suportado");
  }
};

// @desc    Iniciar login com Facebook
// @route   GET /api/meta/login
// @access  Public
const facebookLogin = (req, res) => {
  try {
    // Gerar URL de autorização do Facebook
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&response_type=code&state=${req.query.userId || ""}`;
    
    // Redirecionar para a URL de autorização
    res.redirect(authUrl);
  } catch (error) {
    console.error("Erro ao iniciar login com Facebook:", error);
    res.redirect(`/connect-meta?meta_error=true&message=${encodeURIComponent(error.message)}`);
  }
};

// @desc    Callback do Facebook após autorização
// @route   GET /api/meta/callback
// @access  Public
const facebookCallback = asyncHandler(async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      throw new Error("Código de autorização não recebido");
    }
    
    // Trocar código por token de acesso
    const tokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${APP_SECRET}&code=${code}`, {
      method: "GET",
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error("Token de acesso não recebido");
    }
    
    // Obter informações do usuário
    const userResponse = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${tokenData.access_token}`, {
      method: "GET",
    });
    
    const userData = await userResponse.json();
    
    if (!userData.id) {
      throw new Error("ID do usuário não recebido");
    }
    
    // Obter contas de anúncios
    const adAccountsResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status&access_token=${tokenData.access_token}`, {
      method: "GET",
    });
    
    const adAccountsData = await adAccountsResponse.json();
    
    // Verificar se o usuário tem pelo menos uma conta de anúncios
    if (!adAccountsData.data || adAccountsData.data.length === 0) {
      throw new Error("Nenhuma conta de anúncios encontrada");
    }
    
    // Atualizar usuário no banco de dados
    let userId = state;
    
    if (!userId) {
      // Se não tiver userId no state, tentar obter do token
      try {
        const token = req.headers.authorization?.split(" ")[1];
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          userId = decoded.id;
        }
      } catch (error) {
        console.error("Erro ao decodificar token:", error);
      }
    }
    
    if (userId) {
      const user = await User.findById(userId);
      
      if (user) {
        user.metaId = userData.id;
        user.metaName = userData.name;
        user.metaEmail = userData.email;
        user.metaAccessToken = tokenData.access_token;
        user.metaTokenExpires = Date.now() + (tokenData.expires_in * 1000);
        
        // Salvar todas as contas de anúncios
        user.metaAdAccounts = adAccountsData.data.map(account => ({
          id: account.id,
          name: account.name,
          status: account.account_status
        }));
        
        // Selecionar e salvar a conta de anúncios principal (a primeira ativa ou a primeira da lista)
        const primaryAdAccount = adAccountsData.data.find(account => account.account_status === 1) || adAccountsData.data[0];
        user.metaPrimaryAdAccountId = primaryAdAccount.id;
        user.metaPrimaryAdAccountName = primaryAdAccount.name;
        
        user.metaConnectionStatus = "connected";
        
        await user.save();
        
        // Registrar no log para debug
        console.log(`Meta login successful for user ${userId}. Primary Ad Account ID: ${user.metaPrimaryAdAccountId}`);
      }
    }
    
    // Adicionar timestamp para evitar problemas de cache
    const timestamp = Date.now();
    
    // Redirecionar para a página de callback no frontend
    res.redirect(`/meta-callback?meta_connected=true&userId=${userId || ""}&timestamp=${timestamp}`);
    
  } catch (error) {
    console.error("Erro no callback do Facebook:", error);
    res.redirect(`/meta-callback?meta_error=true&message=${encodeURIComponent(error.message)}`);
  }
});

// @desc    Obter status de conexão com Meta
// @route   GET /api/meta/connection-status
// @access  Private
const getConnectionStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (!user) {
    res.status(404);
    throw new Error("Usuário não encontrado");
  }
  
  // Verificar se o token expirou
  const tokenExpired = user.metaTokenExpires && user.metaTokenExpires < Date.now();
  
  res.json({
    connected: user.metaConnectionStatus === "connected" && !tokenExpired,
    metaId: user.metaId,
    metaName: user.metaName,
    metaEmail: user.metaEmail,
    adAccounts: user.metaAdAccounts || [],
    primaryAdAccountId: user.metaPrimaryAdAccountId || null,
    primaryAdAccountName: user.metaPrimaryAdAccountName || null,
    tokenExpired: tokenExpired
  });
});

// @desc    Obter perfil do usuário no Meta
// @route   GET /api/meta/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (!user) {
    res.status(404);
    throw new Error("Usuário não encontrado");
  }
  
  if (user.metaConnectionStatus !== "connected" || !user.metaAccessToken) {
    res.status(401);
    throw new Error("Usuário não conectado ao Meta");
  }
  
  try {
    // Obter informações do usuário
    const userResponse = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${user.metaAccessToken}`, {
      method: "GET",
    });
    
    const userData = await userResponse.json();
    
    if (userData.error) {
      throw new Error(userData.error.message);
    }
    
    res.json(userData);
  } catch (error) {
    console.error("Erro ao obter perfil do usuário:", error);
    res.status(500);
    throw new Error("Erro ao obter perfil do usuário: " + error.message);
  }
});

// @desc    Criar anúncio a partir de uma publicação
// @route   POST /api/meta/create-ad-from-post
// @access  Private
const createAdFromPost = asyncHandler(async (req, res) => {
  const { postUrl, adName, dailyBudget, startDate, endDate, targetCountry } = req.body;
  
  if (!postUrl) {
    res.status(400);
    throw new Error("URL da publicação é obrigatória");
  }
  
  if (!adName) {
    res.status(400);
    throw new Error("Nome do anúncio é obrigatório");
  }
  
  if (!dailyBudget || isNaN(dailyBudget) || parseFloat(dailyBudget) < 1) {
    res.status(400);
    throw new Error("Orçamento diário deve ser um número maior que 1");
  }
  
  if (!startDate) {
    res.status(400);
    throw new Error("Data de início é obrigatória");
  }
  
  if (endDate && new Date(endDate) <= new Date(startDate)) {
    res.status(400);
    throw new Error("Data de término deve ser posterior à data de início");
  }
  
  const user = await User.findById(req.user._id);
  
  if (!user) {
    res.status(404);
    throw new Error("Usuário não encontrado");
  }
  
  // Verificar se o usuário está conectado ao Meta
  if (user.metaConnectionStatus !== "connected" || !user.metaAccessToken) {
    res.status(400);
    throw new Error("Você precisa conectar sua conta ao Meta Ads primeiro");
  }
  
  // Verificar se o token expirou
  if (user.metaTokenExpires && user.metaTokenExpires < Date.now()) {
    res.status(401);
    throw new Error("Seu token do Meta expirou. Por favor, reconecte sua conta.");
  }
  
  // Verificar se há conta de anúncios disponível
  if (!user.metaAdAccounts || user.metaAdAccounts.length === 0) {
    res.status(400);
    throw new Error("Nenhuma conta de anúncios encontrada. Por favor, reconecte sua conta Meta.");
  }
  
  try {
    // Extrair ID da publicação da URL
    const postId = extractPostIdFromUrl(postUrl);
    
    // Usar a conta de anúncios principal se disponível, ou selecionar a primeira ativa, ou a primeira da lista
    let adAccountId;
    if (user.metaPrimaryAdAccountId) {
      adAccountId = user.metaPrimaryAdAccountId;
    } else {
      const adAccount = user.metaAdAccounts.find(account => account.status === 1) || user.metaAdAccounts[0];
      adAccountId = adAccount.id;
    }
    
    // Registrar no log para debug
    console.log(`Creating ad using account ID: ${adAccountId} for user ${user._id}`);
    
    // Criar campanha
    const campaignResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/campaigns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `${adName} - Campanha`,
        objective: "OUTCOME_AWARENESS",
        status: "PAUSED",
        special_ad_categories: [],
        access_token: user.metaAccessToken,
      }),
    });
    
    const campaignData = await campaignResponse.json();
    
    if (campaignData.error) {
      throw new Error(`Erro ao criar campanha: ${campaignData.error.message}`);
    }
    
    // Criar conjunto de anúncios
    const adSetResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/adsets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `${adName} - Conjunto`,
        campaign_id: campaignData.id,
        daily_budget: parseFloat(dailyBudget) * 100, // Em centavos
        bid_amount: 1000, // 10 reais em centavos
        billing_event: "IMPRESSIONS",
        optimization_goal: "REACH",
        targeting: {
          geo_locations: {
            countries: [targetCountry],
          },
          age_min: 18,
          age_max: 65,
        },
        status: "PAUSED",
        start_time: new Date(startDate).toISOString(),
        end_time: endDate ? new Date(endDate).toISOString() : null,
        access_token: user.metaAccessToken,
      }),
    });
    
    const adSetData = await adSetResponse.json();
    
    if (adSetData.error) {
      throw new Error(`Erro ao criar conjunto de anúncios: ${adSetData.error.message}`);
    }
    
    // Criar anúncio
    const adResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/ads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: adName,
        adset_id: adSetData.id,
        creative: {
          object_story_id: postId,
        },
        status: "PAUSED",
        access_token: user.metaAccessToken,
      }),
    });
    
    const adData = await adResponse.json();
    
    if (adData.error) {
      throw new Error(`Erro ao criar anúncio: ${adData.error.message}`);
    }
    
    // Retornar detalhes do anúncio criado
    res.status(201).json({
      success: true,
      message: "Anúncio criado com sucesso",
      adDetails: {
        name: adName,
        campaignId: campaignData.id,
        adSetId: adSetData.id,
        adId: adData.id,
        status: "PAUSED",
        dailyBudget: parseFloat(dailyBudget),
        startDate,
        endDate,
        targetCountry,
        postId,
        adAccountId: adAccountId
      },
    });
    
  } catch (error) {
    console.error("Erro ao criar anúncio:", error);
    res.status(500);
    throw new Error("Erro ao criar anúncio: " + error.message);
  }
});

module.exports = {
  facebookLogin,
  facebookCallback,
  getConnectionStatus,
  getUserProfile,
  createAdFromPost,
};
