// Implementação completa do controlador Meta com suporte a campanhas e métricas
const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");

// Configurações do Meta
const APP_ID = process.env.META_APP_ID || "2430942723957669";
const APP_SECRET = process.env.META_APP_SECRET || "470806b6e330fff673451f5689ca3d4d";
const REDIRECT_URI = process.env.META_REDIRECT_URI || "https://chefstudio-production.up.railway.app/api/meta/callback";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://chefstudio.vercel.app";
const SCOPES = "ads_management,ads_read,business_management,public_profile,email";

// Função para extrair ID da publicação a partir da URL
const extractPostIdFromUrl = (url) => {
  try {
    if (!url) {
      throw new Error("URL da publicação não fornecida");
    }
    
    console.log(`Tentando extrair ID da publicação da URL: ${url}`);
    
    // Formato: https://www.facebook.com/photo/?fbid=122102873852863870&set=a.122102873882863870
    const fbidMatch = url.match(/fbid=(\d+)/);
    if (fbidMatch && fbidMatch[1]) {
      console.log(`ID extraído via fbid: ${fbidMatch[1]}`);
      return fbidMatch[1];
    }
    
    // Formato: https://www.facebook.com/username/posts/123456789
    const postsMatch = url.match(/\/posts\/(\d+)/);
    if (postsMatch && postsMatch[1]) {
      console.log(`ID extraído via posts: ${postsMatch[1]}`);
      return postsMatch[1];
    }
    
    // Formato: https://www.facebook.com/permalink.php?story_fbid=123456789
    const storyMatch = url.match(/story_fbid=(\d+)/);
    if (storyMatch && storyMatch[1]) {
      console.log(`ID extraído via story_fbid: ${storyMatch[1]}`);
      return storyMatch[1];
    }
    
    // Formato: https://www.facebook.com/pagename/videos/123456789
    const videosMatch = url.match(/\/videos\/(\d+)/);
    if (videosMatch && videosMatch[1]) {
      console.log(`ID extraído via videos: ${videosMatch[1]}`);
      return videosMatch[1];
    }
    
    // Formato: https://www.facebook.com/pagename/photos/a.123456789/987654321/
    const photosMatch = url.match(/\/photos\/(?:a\.\d+\/)?(\d+)/);
    if (photosMatch && photosMatch[1]) {
      console.log(`ID extraído via photos: ${photosMatch[1]}`);
      return photosMatch[1];
    }
    
    // Formato: https://www.instagram.com/p/ABC123/
    const instagramMatch = url.match(/instagram\.com\/p\/([A-Za-z0-9_-]+)/);
    if (instagramMatch && instagramMatch[1]) {
      console.log(`ID extraído via Instagram: ${instagramMatch[1]}`);
      return instagramMatch[1];
    }
    
    // Verificar se a URL já é um ID puro (apenas dígitos)
    if (/^\d+$/.test(url)) {
      console.log(`URL já é um ID puro: ${url}`);
      return url;
    }
    
    // Se chegou aqui, não conseguiu extrair o ID
    throw new Error("Não foi possível extrair o ID da publicação da URL fornecida");
  } catch (error) {
    console.error("Erro ao extrair ID da publicação:", error);
    throw new Error("Formato de URL inválido ou não suportado: " + error.message);
  }
};

// @desc    Iniciar login com Facebook
// @route   GET /api/meta/login
// @access  Public
const facebookLogin = (req, res) => {
  try {
    // Obter userId da query e garantir que seja passado para o callback
    const userId = req.query.userId;
    
    if (!userId) {
      console.error("Tentativa de login Meta sem userId");
      return res.redirect(`${FRONTEND_URL}/connect-meta?meta_error=true&message=${encodeURIComponent("ID do usuário não fornecido")}`);
    }
    
    console.log(`Iniciando login Meta para usuário: ${userId}`);
    
    // Gerar URL de autorização do Facebook com userId no state
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&response_type=code&state=${userId}`;
    
    // Redirecionar para a URL de autorização
    res.redirect(authUrl);
  } catch (error) {
    console.error("Erro ao iniciar login com Facebook:", error);
    res.redirect(`${FRONTEND_URL}/connect-meta?meta_error=true&message=${encodeURIComponent(error.message)}`);
  }
};

// @desc    Callback do Facebook após autorização
// @route   GET /api/meta/callback
// @access  Public
const facebookCallback = asyncHandler(async (req, res) => {
  try {
    const { code, state } = req.query;
    
    // O state deve conter o userId
    const userId = state;
    
    if (!userId) {
      console.error("Callback Meta recebido sem userId no state");
      throw new Error("ID do usuário não encontrado no retorno da autenticação");
    }
    
    if (!code) {
      console.error("Callback Meta recebido sem código de autorização");
      throw new Error("Código de autorização não recebido");
    }
    
    console.log(`Processando callback Meta para usuário: ${userId}`);
    
    // Trocar código por token de acesso
    const tokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${APP_SECRET}&code=${code}`, {
      method: "GET",
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error("Token de acesso não recebido do Meta:", tokenData);
      throw new Error("Token de acesso não recebido");
    }
    
    console.log(`Token Meta obtido com sucesso para usuário: ${userId}`);
    
    // Obter informações do usuário Meta
    const userResponse = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${tokenData.access_token}`, {
      method: "GET",
    });
    
    const userData = await userResponse.json();
    
    if (!userData.id) {
      console.error("ID do usuário Meta não recebido:", userData);
      throw new Error("ID do usuário Meta não recebido");
    }
    
    console.log(`Informações do usuário Meta obtidas: ${userData.id} (${userData.name})`);
    
    // Obter contas de anúncios
    const adAccountsResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status&access_token=${tokenData.access_token}`, {
      method: "GET",
    });
    
    const adAccountsData = await adAccountsResponse.json();
    
    // Verificar se há erro na resposta de contas de anúncios
    if (adAccountsData.error) {
      console.error("Erro ao obter contas de anúncios:", adAccountsData.error);
      throw new Error(`Erro ao obter contas de anúncios: ${adAccountsData.error.message}`);
    }
    
    // Verificar se o usuário tem pelo menos uma conta de anúncios
    if (!adAccountsData.data || adAccountsData.data.length === 0) {
      console.error("Nenhuma conta de anúncios encontrada para o usuário Meta");
      throw new Error("Nenhuma conta de anúncios encontrada. Verifique se você tem uma conta de anúncios no Business Manager.");
    }
    
    console.log(`Contas de anúncios encontradas: ${adAccountsData.data.length}`);
    
    // Atualizar usuário no banco de dados
    const user = await User.findById(userId);
    
    if (!user) {
      console.error(`Usuário não encontrado no banco de dados: ${userId}`);
      throw new Error("Usuário não encontrado no sistema");
    }
    
    // Atualizar dados do Meta no usuário
    user.metaId = userData.id;
    user.metaName = userData.name;
    user.metaEmail = userData.email || user.email;
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
    
    // Definir status de conexão como conectado
    user.metaConnectionStatus = "connected";
    
    // Salvar alterações no banco de dados
    await user.save();
    
    console.log(`Usuário ${userId} conectado ao Meta com sucesso. Primary Ad Account ID: ${user.metaPrimaryAdAccountId}`);
    
    // Adicionar timestamp para evitar problemas de cache
    const timestamp = Date.now();
    
    // Redirecionar para a página de callback no frontend
    res.redirect(`${FRONTEND_URL}/meta-callback?meta_connected=true&userId=${userId}&timestamp=${timestamp}`);
    
  } catch (error) {
    console.error("Erro no callback do Facebook:", error);
    res.redirect(`${FRONTEND_URL}/meta-callback?meta_error=true&message=${encodeURIComponent(error.message)}`);
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
  
  // Verificar se o usuário está realmente conectado
  const isConnected = user.metaConnectionStatus === "connected" && 
                      user.metaAccessToken && 
                      user.metaId && 
                      !tokenExpired;
  
  console.log(`Status de conexão Meta para usuário ${user._id}: ${isConnected ? 'Conectado' : 'Desconectado'}`);
  
  if (tokenExpired) {
    console.log(`Token Meta expirado para usuário ${user._id}`);
  }
  
  res.json({
    connected: isConnected,
    metaId: user.metaId || null,
    metaName: user.metaName || null,
    metaEmail: user.metaEmail || null,
    adAccounts: user.metaAdAccounts || [],
    primaryAdAccountId: user.metaPrimaryAdAccountId || null,
    primaryAdAccountName: user.metaPrimaryAdAccountName || null,
    tokenExpired: tokenExpired || false
  });
});

// @desc    Verificar e atualizar status de conexão Meta
// @route   GET /api/meta/verify-connection
// @access  Private
const verifyConnection = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (!user) {
    res.status(404);
    throw new Error("Usuário não encontrado");
  }
  
  // Verificar se o usuário tem token Meta
  if (!user.metaAccessToken) {
    user.metaConnectionStatus = "disconnected";
    await user.save();
    
    return res.json({
      connected: false,
      message: "Usuário não possui token Meta"
    });
  }
  
  // Verificar se o token expirou
  if (user.metaTokenExpires && user.metaTokenExpires < Date.now()) {
    user.metaConnectionStatus = "disconnected";
    await user.save();
    
    return res.json({
      connected: false,
      tokenExpired: true,
      message: "Token Meta expirado"
    });
  }
  
  try {
    // Verificar se o token é válido fazendo uma chamada à API do Meta
    const response = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${user.metaAccessToken}`);
    const data = await response.json();
    
    if (data.error) {
      // Token inválido, atualizar status
      user.metaConnectionStatus = "disconnected";
      await user.save();
      
      return res.json({
        connected: false,
        message: `Token Meta inválido: ${data.error.message}`
      });
    }
    
    // Token válido, garantir que o status esteja como conectado
    if (user.metaConnectionStatus !== "connected") {
      user.metaConnectionStatus = "connected";
      await user.save();
    }
    
    return res.json({
      connected: true,
      metaId: data.id,
      metaName: data.name
    });
    
  } catch (error) {
    console.error("Erro ao verificar conexão Meta:", error);
    
    // Em caso de erro, marcar como desconectado
    user.metaConnectionStatus = "disconnected";
    await user.save();
    
    return res.json({
      connected: false,
      message: `Erro ao verificar conexão: ${error.message}`
    });
  }
});

// @desc    Criar anúncio a partir de uma publicação
// @route   POST /api/meta/create-ad-from-post
// @access  Private
const createAdFromPost = asyncHandler(async (req, res) => {
  const { postUrl, campaignName, dailyBudget, startDate, endDate, targetCountry, adTitle, adDescription, callToAction } = req.body;
  
  if (!postUrl) {
    res.status(400);
    throw new Error("URL da publicação é obrigatória");
  }
  
  if (!campaignName) {
    res.status(400);
    throw new Error("Nome da campanha é obrigatório");
  }
  
  if (!dailyBudget || isNaN(dailyBudget) || parseFloat(dailyBudget) < 1) {
    res.status(400);
    throw new Error("Orçamento diário deve ser um número maior que 1");
  }
  
  // Validação mais robusta para a data de início
  if (!startDate) {
    res.status(400);
    throw new Error("Data de início é obrigatória");
  }
  
  // Tentar converter a data para garantir formato válido
  try {
    const parsedStartDate = new Date(startDate);
    if (isNaN(parsedStartDate.getTime())) {
      throw new Error("Formato de data inválido");
    }
  } catch (error) {
    res.status(400);
    throw new Error("Data de início em formato inválido. Use o formato YYYY-MM-DD");
  }
  
  // Validação da data de término, se fornecida
  if (endDate) {
    try {
      const parsedEndDate = new Date(endDate);
      const parsedStartDate = new Date(startDate);
      
      if (isNaN(parsedEndDate.getTime())) {
        throw new Error("Formato de data inválido");
      }
      
      if (parsedEndDate <= parsedStartDate) {
        res.status(400);
        throw new Error("Data de término deve ser posterior à data de início");
      }
    } catch (error) {
      res.status(400);
      throw new Error("Data de término em formato inválido ou anterior à data de início");
    }
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
    
    console.log(`Post ID extraído: ${postId}`);
    
    // Usar a conta de anúncios principal se disponível, ou selecionar a primeira ativa, ou a primeira da lista
    let adAccountId;
    if (user.metaPrimaryAdAccountId) {
      adAccountId = user.metaPrimaryAdAccountId;
      console.log(`Usando conta de anúncios principal: ${adAccountId}`);
    } else {
      const adAccount = user.metaAdAccounts.find(account => account.status === 1) || user.metaAdAccounts[0];
      adAccountId = adAccount.id;
      console.log(`Usando conta de anúncios alternativa: ${adAccountId}`);
    }
    
    // Verificar se temos um token de acesso válido
    if (!user.metaAccessToken) {
      throw new Error("Token de acesso Meta não encontrado");
    }
    
    // Verificar se temos um ID de usuário Meta válido
    if (!user.metaId) {
      throw new Error("ID de usuário Meta não encontrado");
    }
    
    // Registrar no log para debug
    console.log(`Creating ad using account ID: ${adAccountId} for user ${user._id} (Meta ID: ${user.metaId})`);
    
    // Criar campanha
    const campaignResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/campaigns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `${campaignName} - Campanha`,
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
        name: `${campaignName} - Conjunto`,
        campaign_id: campaignData.id,
        daily_budget: parseFloat(dailyBudget) * 100, // Em centavos
        bid_amount: 1000, // 10 reais em centavos
        billing_event: "IMPRESSIONS",
        optimization_goal: "REACH",
        targeting: {
          geo_locations: {
            countries: [targetCountry || "BR"],
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
        name: campaignName,
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
        name: campaignName,
        campaignId: campaignData.id,
        adSetId: adSetData.id,
        adId: adData.id,
        status: "PAUSED",
        dailyBudget: parseFloat(dailyBudget),
        startDate,
        endDate,
        targetCountry: targetCountry || "BR",
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

// @desc    Obter campanhas do usuário
// @route   GET /api/meta/campaigns
// @access  Private
const getCampaigns = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (!user) {
    res.status(404);
    throw new Error("Usuário não encontrado");
  }
  
  // Verificar se o usuário está conectado ao Meta
  if (user.metaConnectionStatus !== "connected" || !user.metaAccessToken) {
    res.status(400);
    throw new Error("Usuário não está conectado ao Meta");
  }
  
  // Verificar se o token expirou
  if (user.metaTokenExpires && user.metaTokenExpires < Date.now()) {
    res.status(401);
    throw new Error("Seu token do Meta expirou. Por favor, reconecte sua conta.");
  }
  
  try {
    // Verificar se há conta de anúncios disponível
    if (!user.metaAdAccounts || user.metaAdAccounts.length === 0) {
      return res.json([]);
    }
    
    // Usar a conta de anúncios principal se disponível, ou selecionar a primeira ativa, ou a primeira da lista
    let adAccountId;
    if (user.metaPrimaryAdAccountId) {
      adAccountId = user.metaPrimaryAdAccountId;
    } else {
      const adAccount = user.metaAdAccounts.find(account => account.status === 1) || user.metaAdAccounts[0];
      adAccountId = adAccount.id;
    }
    
    // Obter campanhas
    const campaignsResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/campaigns?fields=id,name,status,objective,created_time,updated_time&access_token=${user.metaAccessToken}`, {
      method: "GET",
    });
    
    const campaignsData = await campaignsResponse.json();
    
    if (campaignsData.error) {
      throw new Error(campaignsData.error.message);
    }
    
    res.json(campaignsData.data || []);
    
  } catch (error) {
    console.error("Erro ao obter campanhas:", error);
    res.status(500);
    throw new Error("Erro ao obter campanhas: " + error.message);
  }
});

// @desc    Criar anúncio a partir de uma imagem
// @route   POST /api/meta/create-from-image
// @access  Private
const createAdFromImage = asyncHandler(async (req, res) => {
  const { 
    campaignName, 
    dailyBudget, 
    startDate, 
    endDate, 
    targetCountry, 
    adTitle, 
    adDescription, 
    callToAction,
    menuUrl,
    imageUrl
  } = req.body;
  
  // Validações básicas
  if (!campaignName) {
    res.status(400);
    throw new Error("Nome da campanha é obrigatório");
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
  
  if (!imageUrl && !req.file) {
    res.status(400);
    throw new Error("URL da imagem ou arquivo de imagem é obrigatório");
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
    // Usar a conta de anúncios principal se disponível, ou selecionar a primeira ativa, ou a primeira da lista
    let adAccountId;
    if (user.metaPrimaryAdAccountId) {
      adAccountId = user.metaPrimaryAdAccountId;
    } else {
      const adAccount = user.metaAdAccounts.find(account => account.status === 1) || user.metaAdAccounts[0];
      adAccountId = adAccount.id;
    }
    
    // Registrar no log para debug
    console.log(`Creating image ad using account ID: ${adAccountId} for user ${user._id}`);
    
    // Criar campanha
    const campaignResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/campaigns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `${campaignName} - Campanha`,
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
        name: `${campaignName} - Conjunto`,
        campaign_id: campaignData.id,
        daily_budget: parseFloat(dailyBudget) * 100, // Em centavos
        bid_amount: 1000, // 10 reais em centavos
        billing_event: "IMPRESSIONS",
        optimization_goal: "REACH",
        targeting: {
          geo_locations: {
            countries: [targetCountry || "BR"],
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
    
    // Primeiro, fazer upload da imagem para o Meta Ads
    let imageId;
    
    if (imageUrl) {
      // Se temos uma URL de imagem, usamos a API para fazer upload a partir da URL
      const imageUploadResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/adimages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: imageUrl,
          access_token: user.metaAccessToken,
        }),
      });
      
      const imageUploadData = await imageUploadResponse.json();
      
      if (imageUploadData.error) {
        throw new Error(`Erro ao fazer upload da imagem: ${imageUploadData.error.message}`);
      }
      
      // Extrair o hash da imagem
      const images = imageUploadData.images || {};
      const firstImageKey = Object.keys(images)[0];
      
      if (!firstImageKey || !images[firstImageKey] || !images[firstImageKey].hash) {
        throw new Error("Não foi possível obter o hash da imagem após o upload");
      }
      
      imageId = images[firstImageKey].hash;
    } else if (req.file) {
      // Se temos um arquivo de imagem, precisamos fazer upload do arquivo
      // Implementação depende do middleware de upload de arquivos usado
      // Esta é uma implementação simplificada assumindo que o arquivo está disponível
      
      // Converter o arquivo para base64
      const imageBase64 = req.file.buffer.toString('base64');
      
      const imageUploadResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/adimages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bytes: imageBase64,
          access_token: user.metaAccessToken,
        }),
      });
      
      const imageUploadData = await imageUploadResponse.json();
      
      if (imageUploadData.error) {
        throw new Error(`Erro ao fazer upload da imagem: ${imageUploadData.error.message}`);
      }
      
      // Extrair o hash da imagem
      const images = imageUploadData.images || {};
      const firstImageKey = Object.keys(images)[0];
      
      if (!firstImageKey || !images[firstImageKey] || !images[firstImageKey].hash) {
        throw new Error("Não foi possível obter o hash da imagem após o upload");
      }
      
      imageId = images[firstImageKey].hash;
    } else {
      throw new Error("Nenhuma imagem fornecida para o anúncio");
    }
    
    // Criar o criativo do anúncio com a imagem
    const creativeResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/adcreatives`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `${campaignName} - Criativo`,
        object_story_spec: {
          page_id: user.metaId, // Usar o ID do usuário Meta como page_id
          link_data: {
            image_hash: imageId,
            link: menuUrl || "https://chefstudio.vercel.app",
            message: adDescription || campaignName,
            name: adTitle || campaignName,
            call_to_action: {
              type: callToAction || "LEARN_MORE",
            },
          },
        },
        access_token: user.metaAccessToken,
      }),
    });
    
    const creativeData = await creativeResponse.json();
    
    if (creativeData.error) {
      throw new Error(`Erro ao criar criativo do anúncio: ${creativeData.error.message}`);
    }
    
    // Criar anúncio com o criativo
    const adResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/ads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: campaignName,
        adset_id: adSetData.id,
        creative: {
          creative_id: creativeData.id,
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
      message: "Anúncio com imagem criado com sucesso",
      adDetails: {
        name: campaignName,
        campaignId: campaignData.id,
        adSetId: adSetData.id,
        adId: adData.id,
        creativeId: creativeData.id,
        imageId: imageId,
        status: "PAUSED",
        dailyBudget: parseFloat(dailyBudget),
        startDate,
        endDate,
        targetCountry: targetCountry || "BR",
// Função auxiliar para obter métricas de forma assíncrona
async function getMetricsAsync(adAccountId, since, until, accessToken) {
  const metricsResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/insights?fields=impressions,clicks,ctr,spend,reach,frequency&time_range={"since":"${since}","until":"${until}"}&access_token=${accessToken}`, {
    method: "GET",
  });
  
  const metricsData = await metricsResponse.json();
  return metricsData;
}

// @desc    Obter métricas do Meta Ads
// @route   GET /api/meta/metrics
// @access  Private
const getMetrics = asyncHandler(async (req, res) => {
  const { timeRange = 'last_30_days' } = req.query;
  
  const user = await User.findById(req.user._id);
  
  if (!user) {
    res.status(404);
    throw new Error("Usuário não encontrado");
  }
  
  // Verificar se o usuário está conectado ao Meta
  if (user.metaConnectionStatus !== "connected" || !user.metaAccessToken) {
    res.status(400);
    throw new Error("Usuário não está conectado ao Meta");
  }
  
  // Verificar se o token expirou
  if (user.metaTokenExpires && user.metaTokenExpires < Date.now()) {
    res.status(401);
    throw new Error("Seu token do Meta expirou. Por favor, reconecte sua conta.");
  }
  
  try {
    // Verificar se há conta de anúncios disponível
    if (!user.metaAdAccounts || user.metaAdAccounts.length === 0) {
      return res.json({
        impressions: 0,
        clicks: 0,
        ctr: 0,
        spend: 0,
        reach: 0,
        frequency: 0
      });
    }
    
    // Usar a conta de anúncios principal se disponível, ou selecionar a primeira ativa, ou a primeira da lista
    let adAccountId;
    if (user.metaPrimaryAdAccountId) {
      adAccountId = user.metaPrimaryAdAccountId;
    } else {
      const adAccount = user.metaAdAccounts.find(account => account.status === 1) || user.metaAdAccounts[0];
      adAccountId = adAccount.id;
    }
    
    // Definir intervalo de datas com base no timeRange
    let since, until;
    const now = new Date();
    
    switch (timeRange) {
      case 'today':
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
        until = now.toISOString().split('T')[0];
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        since = yesterday.toISOString().split('T')[0];
        until = yesterday.toISOString().split('T')[0];
        break;
      case 'last_7_days':
        const last7Days = new Date(now);
        last7Days.setDate(last7Days.getDate() - 7);
        since = last7Days.toISOString().split('T')[0];
        until = now.toISOString().split('T')[0];
        break;
      case 'this_month':
        since = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        until = now.toISOString().split('T')[0];
        break;
      case 'last_month':
        const lastMonth = new Date(now);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        since = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString().split('T')[0];
        until = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      default: // last_30_days
        const last30Days = new Date(now);
        last30Days.setDate(last30Days.getDate() - 30);
        since = last30Days.toISOString().split('T')[0];
        until = now.toISOString().split('T')[0];
    }
    
    // Obter métricas usando a função assíncrona
    const metricsData = await getMetricsAsync(adAccountId, since, until, user.metaAccessToken);
    
    if (metricsData.error) {
      throw new Error(metricsData.error.message);
    }
    
    // Se não houver dados, retornar zeros
    if (!metricsData.data || metricsData.data.length === 0) {
      return res.json({
        impressions: 0,
        clicks: 0,
        ctr: 0,
        spend: 0,
        reach: 0,
        frequency: 0
      });
    }
    
    // Extrair métricas
    const metrics = metricsData.data[0];
    
    res.json({
      impressions: parseInt(metrics.impressions) || 0,
      clicks: parseInt(metrics.clicks) || 0,
      ctr: parseFloat(metrics.ctr) || 0,
      spend: parseFloat(metrics.spend) || 0,
      reach: parseInt(metrics.reach) || 0,
      frequency: parseFloat(metrics.frequency) || 0,
      timeRange,
      since,
      until
    });
    
  } catch (error) {
    console.error("Erro ao obter métricas:", error);
    res.status(500);
    throw new Error("Erro ao obter métricas: " + error.message);
  }
});