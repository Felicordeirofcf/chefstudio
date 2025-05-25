const asyncHandler = require("express-async-handler");
const fetch = require("node-fetch");
const User = require("../models/user"); // Certifique-se que o caminho está correto
const fs = require('fs');
const FormData = require('form-data'); // Precisa instalar: npm install form-data

// @desc    Obter URL de autorização do Facebook/Meta
// @route   GET /api/meta/auth-url
// @access  Private
const getMetaAuthUrl = asyncHandler(async (req, res) => {
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
  const clientId = process.env.FB_APP_ID;
  const userId = req.user.id;

  if (!clientId || !redirectUri) {
    console.error("ERRO: Variáveis de ambiente FB_APP_ID ou FACEBOOK_REDIRECT_URI não definidas.");
    return res.status(500).json({ message: "Erro de configuração do servidor." });
  }

  const scope = [
    "ads_management",
    "pages_read_engagement",
    "pages_manage_posts",
    "public_profile",
    "email",
    "pages_show_list"
  ].join(",");

  const state = userId;

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${state}`;

  console.log(`[Auth URL] Gerando para userId: ${userId}`);
  res.json({ authUrl });
});

// @desc    Callback do Facebook
// @route   GET /api/meta/callback
// @access  Public
const facebookCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
  const clientId = process.env.FB_APP_ID;
  const clientSecret = process.env.FB_APP_SECRET;
  const dashboardUrl = "https://chefstudio.vercel.app/dashboard"; // Ou a URL do seu frontend
  const userId = state;

  console.log(`[Meta Callback] Iniciando para userId: ${userId}`);

  if (!code || !userId) {
    console.error("[Meta Callback] Erro: Código ou state (userId) ausente.");
    return res.redirect(`${dashboardUrl}?meta_connect=error&message=auth_code_or_state_missing`);
  }

  try {
    console.log(`[Meta Callback] Buscando usuário: ${userId}`);
    const user = await User.findById(userId);
    if (!user) {
      console.error(`[Meta Callback] Erro: Usuário não encontrado: ${userId}`);
      return res.redirect(`${dashboardUrl}?meta_connect=error&message=user_not_found`);
    }
    console.log(`[Meta Callback] Usuário ${userId} encontrado.`);

    // --- Troca de Código por Token de Curta Duração ---
    console.log(`[Meta Callback] Trocando código por token de curta duração para ${userId}...`);
    const shortLivedTokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`
    );
    const shortLivedTokenData = await shortLivedTokenResponse.json();

    if (shortLivedTokenData.error || !shortLivedTokenData.access_token) {
      console.error("[Meta Callback] Erro ao obter token de curta duração:", shortLivedTokenData.error || "Token não retornado");
      throw new Error(`Erro ao obter token de curta duração: ${shortLivedTokenData.error?.message || 'Token não retornado'}`);
    }
    const shortLivedUserAccessToken = shortLivedTokenData.access_token;
    console.log(`[Meta Callback] Token de curta duração (USUÁRIO) OK para ${userId}.`);

    // --- Troca por Token de Longa Duração (Token do Usuário) ---
    console.log(`[Meta Callback] Trocando token de curta duração por longa duração (USUÁRIO) para ${userId}...`);
    const longLivedTokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedUserAccessToken}`
    );
    const longLivedTokenData = await longLivedTokenResponse.json();

    let userAccessToken = shortLivedUserAccessToken; // Default to short-lived user token
    let userTokenExpires = null; // Placeholder for expiry

    if (!longLivedTokenData.error && longLivedTokenData.access_token) {
      userAccessToken = longLivedTokenData.access_token;
      if (longLivedTokenData.expires_in) {
        userTokenExpires = new Date(Date.now() + longLivedTokenData.expires_in * 1000);
      }
      console.log(`[Meta Callback] Token de longa duração (USUÁRIO) OK para ${userId}. Expira em: ${userTokenExpires}`);
    } else {
      console.warn(`[Meta Callback] Aviso ao trocar por token de longa duração (USUÁRIO) para ${userId}:`, longLivedTokenData.error || "Token não retornado. Usando curta duração.");
      userTokenExpires = new Date(Date.now() + (shortLivedTokenData.expires_in || 3600) * 1000); // Default 1h
    }

    // --- Busca de Dados Meta (usando o token do USUÁRIO) ---
    console.log(`[Meta Callback] Buscando ID Meta (/me) para ${userId} usando token do usuário...`);
    const fbUserResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id&access_token=${userAccessToken}`
    );
    const fbUserData = await fbUserResponse.json();

    if (fbUserData.error || !fbUserData.id) {
      console.error(`[Meta Callback] Erro ao obter ID Meta para ${userId}:`, fbUserData.error || "ID não retornado");
      throw new Error(`Erro ao obter ID Meta: ${fbUserData.error?.message || 'ID não retornado'}`);
    }
    const metaUserId = fbUserData.id;
    console.log(`[Meta Callback] ID Meta OK para ${userId}: ${metaUserId}`);

    // --- Busca de Contas de Anúncio (Ad Accounts) --- (Opcional, manter se necessário)
    console.log(`[Meta Callback] Buscando Ad Accounts (/me/adaccounts) para ${userId} usando token do usuário...`);
    const adAccountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,account_id,name&access_token=${userAccessToken}`
    );
    const adAccountsData = await adAccountsResponse.json();
    let formattedAdAccounts = [];
    if (!adAccountsData.error && adAccountsData.data) {
      formattedAdAccounts = adAccountsData.data.map(acc => ({
        id: acc.id,
        account_id: acc.account_id,
        name: acc.name
      }));
      console.log(`[Meta Callback] Ad Accounts OK para ${userId}:`, JSON.stringify(formattedAdAccounts, null, 2));
    } else {
      console.warn(`[Meta Callback] Aviso ao obter Ad Accounts para ${userId}:`, adAccountsData.error?.message || "Nenhum dado retornado");
    }

    // --- Busca de Páginas e TOKENS DE PÁGINA (Page Access Tokens) --- << IMPORTANTE >>
    console.log(`[Meta Callback] Buscando Pages e Page Tokens (/me/accounts) para ${userId} usando token do usuário...`);
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/${metaUserId}/accounts?fields=id,name,access_token&access_token=${userAccessToken}`
    );
    const pagesData = await pagesResponse.json();
    let formattedPages = [];
    if (!pagesData.error && pagesData.data) {
      formattedPages = pagesData.data.map(page => ({
        id: page.id, // ID da Página
        name: page.name, // Nome da Página
        access_token: page.access_token // << TOKEN DA PÁGINA >>
      }));
      console.log(`[Meta Callback] Pages e Page Tokens OK para ${userId}:`, JSON.stringify(formattedPages.map(p => ({ id: p.id, name: p.name, token: '...' + (p.access_token ? p.access_token.slice(-5) : 'N/A') })), null, 2));
    } else {
      console.warn(`[Meta Callback] Aviso ao obter Pages e Page Tokens para ${userId}:`, pagesData.error?.message || "Nenhum dado retornado");
    }

    // --- Salvamento no MongoDB --- 
    console.log(`[Meta Callback] Preparando para salvar no MongoDB para ${userId}...`);
    user.metaAccessToken = userAccessToken;
    user.metaUserId = metaUserId;
    user.metaTokenExpires = userTokenExpires;
    user.metaAdAccounts = formattedAdAccounts;
    user.metaPages = formattedPages;
    user.metaConnectionStatus = 'connected';

    console.log(`[Meta Callback] Dados a serem salvos para ${userId}:`, {
      metaAccessToken: user.metaAccessToken ? '...' + user.metaAccessToken.slice(-5) : null,
      metaUserId: user.metaUserId,
      metaTokenExpires: user.metaTokenExpires,
      metaAdAccountsCount: user.metaAdAccounts.length,
      metaPagesCount: user.metaPages.length,
      metaConnectionStatus: user.metaConnectionStatus
    });

    console.log(`[Meta Callback] Executando user.save() para ${userId}...`);
    await user.save();
    console.log(`[Meta Callback] user.save() concluído com sucesso para ${userId}!`);

    // --- Redirecionamento --- 
    console.log(`[Meta Callback] Redirecionando ${userId} para dashboard com sucesso.`);
    res.redirect(`${dashboardUrl}?meta_connect=success`);

  } catch (error) {
    console.error(`[Meta Callback] ERRO GERAL para ${userId}:`, error);
    try {
      console.log(`[Meta Callback] Tentando limpar dados Meta para ${userId} devido a erro...`);
      await User.findByIdAndUpdate(userId, {
        $unset: {
          metaAccessToken: "",
          metaUserId: "",
          metaTokenExpires: "",
          metaAdAccounts: "",
          metaPages: ""
        },
        metaConnectionStatus: 'disconnected'
      });
      console.log(`[Meta Callback] Dados Meta limpos para ${userId}.`);
    } catch (cleanupError) {
      console.error(`[Meta Callback] Erro ao limpar dados Meta para ${userId}:`, cleanupError);
    }
    res.redirect(`${dashboardUrl}?meta_connect=error&message=${encodeURIComponent(error.message || 'Erro desconhecido durante conexão Meta')}`);
  }
});

// @desc    Obter status da conexão Meta
// @route   GET /api/meta/status
// @access  Private
const getMetaStatus = asyncHandler(async (req, res) => {
  console.log(`[DEBUG] getMetaStatus - Iniciando para userId: ${req.user.id}`);
  const user = await User.findById(req.user.id).select('metaConnectionStatus metaPages metaAdAccounts').lean(); // Add .lean() here
  if (!user) {
    console.log(`[DEBUG] getMetaStatus - Usuário não encontrado: ${req.user.id}`);
    return res.status(404).json({ message: 'Usuário não encontrado' });
  }

  console.log(`[DEBUG] getMetaStatus - Dados brutos do usuário (metaPages):`, JSON.stringify(user.metaPages, null, 2));
  console.log(`[DEBUG] getMetaStatus - Dados brutos do usuário (metaAdAccounts):`, JSON.stringify(user.metaAdAccounts, null, 2));

  // Use map and filter explicitly as suggested by the user
  const pages = (user.metaPages || [])
    .map(p => ({ id: p?.id, name: p?.name })) // Map first, handle potential undefined properties
    .filter(p => p.id && p.name); // Then filter for valid items

  console.log(`[DEBUG] getMetaStatus - Pages após map/filter:`, JSON.stringify(pages, null, 2));

  const adAccounts = (user.metaAdAccounts || [])
    .map(a => ({ id: a?.id, name: a?.name })) // Map first, handle potential undefined properties
    .filter(a => a.id && a.name); // Then filter for valid items

  console.log(`[DEBUG] getMetaStatus - AdAccounts após map/filter:`, JSON.stringify(adAccounts, null, 2));

  const responsePayload = {
    status: user.metaConnectionStatus || 'disconnected',
    pages: pages,
    adAccounts: adAccounts
  };

  console.log(`[DEBUG] getMetaStatus - Payload final da resposta:`, JSON.stringify(responsePayload, null, 2));

  res.json(responsePayload);
});

// @desc    Desconectar da Meta
// @route   DELETE /api/meta/disconnect
// @access  Private
const disconnectMeta = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  console.log(`[Meta Disconnect] Iniciando desconexão para userId: ${userId}`);
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.error(`[Meta Disconnect] Usuário não encontrado: ${userId}`);
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Limpa os dados do usuário no banco de dados
    console.log(`[Meta Disconnect] Limpando dados Meta no DB para ${userId}...`);
    user.metaAccessToken = undefined;
    user.metaUserId = undefined;
    user.metaTokenExpires = undefined;
    user.metaAdAccounts = [];
    user.metaPages = [];
    user.metaConnectionStatus = 'disconnected';

    await user.save();
    console.log(`[Meta Disconnect] Dados Meta limpos no DB para ${userId}.`);

    res.json({ message: 'Desconectado da Meta com sucesso.' });

  } catch (error) {
    console.error(`[Meta Disconnect] ERRO GERAL para ${userId}:`, error);
    res.status(500).json({ message: 'Erro ao desconectar da Meta.', error: error.message });
  }
});

// @desc    Obter métricas de anúncios do Meta Ads (Placeholder)
// @route   GET /api/meta/metrics
// @access  Private
const getMetaMetrics = asyncHandler(async (req, res) => {
  // TODO: Implementar lógica real para buscar métricas da API do Facebook
  console.log(`[Meta Metrics] Rota /metrics chamada para userId: ${req.user.id}. Placeholder ativo.`);
  res.json({ 
    message: 'Placeholder: Métricas obtidas com sucesso!',
    userId: req.user.id,
    timeRange: req.query.timeRange || 'last_30_days',
    impressions: Math.floor(Math.random() * 10000),
    clicks: Math.floor(Math.random() * 500),
    spend: (Math.random() * 100).toFixed(2),
    ctr: (Math.random() * 2).toFixed(2)
  });
});

// <<< Definição da função getMetaMetrics movida para ANTES do module.exports



// @desc    Criar campanha de tráfego recomendada (Placeholder)
// @route   POST /api/ads/create-recommended-traffic-campaign
// @access  Private
const createRecommendedTrafficCampaign = asyncHandler(async (req, res) => {
  console.log(`[Meta Campaign] Rota /create-recommended-traffic-campaign chamada para userId: ${req.user?.id}. Placeholder ativo.`);
  // TODO: Implementar lógica real para criar campanha de tráfego recomendada na API do Facebook/Meta
  // Exemplo: Acessar req.body (objetivo, nome, etc.), req.file (imagem), req.user (para tokens e IDs)
  // Chamar API da Meta para criar a campanha com os dados fornecidos
  // Retornar o ID da campanha criada ou detalhes

  // Resposta placeholder
  res.status(201).json({
    message: 'Placeholder: Campanha de tráfego recomendada criada com sucesso (implementação pendente)!',
    userId: req.user?.id,
    campaignDetails: { // Exemplo de dados que podem ser retornados
      objective: req.body?.objective || 'TRAFFIC',
      name: req.body?.name || 'Campanha Recomendada',
      image: req.file ? req.file.path : 'Nenhuma imagem enviada'
    }
  });
});


module.exports = {
  getMetaAuthUrl,
  facebookCallback,
  getMetaStatus,
  disconnectMeta,
  getMetaMetrics, // Agora a função está definida acima e pode ser exportada corretamente
  createRecommendedTrafficCampaign, // Adicionando a nova função exportada
};
