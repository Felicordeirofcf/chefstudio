const asyncHandler = require("express-async-handler");
const fetch = require("node-fetch");
const User = require("../models/user"); // Certifique-se que o caminho está correto

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
    "ads_read",
    "business_management",
    "pages_read_engagement",
    "pages_manage_ads",
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
  const dashboardUrl = "https://chefstudio.vercel.app/dashboard";
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

    // --- Troca de Token --- 
    console.log(`[Meta Callback] Trocando código por token para ${userId}...`);
    const shortLivedTokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`);
    const shortLivedTokenData = await shortLivedTokenResponse.json();
    if (shortLivedTokenData.error || !shortLivedTokenData.access_token) {
      console.error("[Meta Callback] Erro token curta duração:", shortLivedTokenData.error || "Token não retornado");
      throw new Error(`Erro token curta duração: ${shortLivedTokenData.error?.message || 'Token não retornado'}`);
    }
    const shortLivedAccessToken = shortLivedTokenData.access_token;
    console.log(`[Meta Callback] Token curta duração OK para ${userId}. Trocando por longa...`);

    const longLivedTokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedAccessToken}`);
    const longLivedTokenData = await longLivedTokenResponse.json();
    let accessToken = shortLivedAccessToken; // Default to short-lived
    let tokenExpires = null; // Placeholder for expiry
    if (!longLivedTokenData.error && longLivedTokenData.access_token) {
      accessToken = longLivedTokenData.access_token;
      if (longLivedTokenData.expires_in) {
        tokenExpires = new Date(Date.now() + longLivedTokenData.expires_in * 1000);
      }
      console.log(`[Meta Callback] Token longa duração OK para ${userId}. Expira em: ${tokenExpires}`);
    } else {
      console.warn(`[Meta Callback] Aviso troca token longa duração para ${userId}:`, longLivedTokenData.error || "Token não retornado. Usando curta duração.");
    }

    // --- Busca de Dados Meta --- 
    console.log(`[Meta Callback] Buscando ID Meta (/me) para ${userId}...`);
    const fbUserResponse = await fetch(`https://graph.facebook.com/v18.0/me?fields=id&access_token=${accessToken}`);
    const fbUserData = await fbUserResponse.json();
    if (fbUserData.error || !fbUserData.id) {
      console.error(`[Meta Callback] Erro obter ID Meta para ${userId}:`, fbUserData.error || "ID não retornado");
      throw new Error(`Erro obter ID Meta: ${fbUserData.error?.message || 'ID não retornado'}`);
    }
    const metaUserId = fbUserData.id;
    console.log(`[Meta Callback] ID Meta OK para ${userId}: ${metaUserId}`);

    console.log(`[Meta Callback] Buscando Ad Accounts (/me/adaccounts) para ${userId}...`);
    const adAccountsResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?fields=id,account_id,name&access_token=${accessToken}`);
    const adAccountsData = await adAccountsResponse.json();
    let formattedAdAccounts = [];
    if (!adAccountsData.error && adAccountsData.data) {
      formattedAdAccounts = adAccountsData.data.map(acc => ({ id: acc.id, account_id: acc.account_id, name: acc.name }));
      console.log(`[Meta Callback] Ad Accounts OK para ${userId}:`, JSON.stringify(formattedAdAccounts, null, 2));
    } else {
       console.warn(`[Meta Callback] Aviso obter Ad Accounts para ${userId}:`, adAccountsData.error?.message || "Nenhum dado retornado");
    }

    console.log(`[Meta Callback] Buscando Pages (/me/accounts) para ${userId}...`);
    const pagesResponse = await fetch(`https://graph.facebook.com/v18.0/${metaUserId}/accounts?fields=id,name,access_token&access_token=${accessToken}`);
    const pagesData = await pagesResponse.json();
    let formattedPages = [];
    if (!pagesData.error && pagesData.data) {
      formattedPages = pagesData.data.map(page => ({ id: page.id, name: page.name, access_token: page.access_token }));
      console.log(`[Meta Callback] Pages OK para ${userId}:`, JSON.stringify(formattedPages, null, 2));
    } else {
      console.warn(`[Meta Callback] Aviso obter Pages para ${userId}:`, pagesData.error?.message || "Nenhum dado retornado");
    }

    // --- Salvamento no MongoDB (Usando nomes do Schema) --- 
    console.log(`[Meta Callback] Preparando para salvar no MongoDB para ${userId}...`);
    user.metaAccessToken = accessToken;
    user.metaUserId = metaUserId;
    user.metaTokenExpires = tokenExpires;
    user.metaAdAccounts = formattedAdAccounts; // Usar nome do schema
    user.metaPages = formattedPages;           // Usar nome do schema
    user.metaConnectionStatus = 'connected';   // Usar nome do schema

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
    res.redirect(dashboardUrl);

  } catch (error) {
    console.error(`[Meta Callback] ERRO GERAL para ${userId}:`, error);
    try {
      console.log(`[Meta Callback] Tentando limpar dados Meta para ${userId} devido a erro...`);
      await User.findByIdAndUpdate(userId, { 
        $unset: { metaAccessToken: "", metaUserId: "", metaTokenExpires: "", metaAdAccounts: "", metaPages: "" },
        metaConnectionStatus: 'disconnected' 
      });
      console.log(`[Meta Callback] Dados Meta limpos para ${userId}.`);
    } catch (cleanupError) {
      console.error(`[Meta Callback] Erro ao limpar dados Meta para ${userId}:`, cleanupError);
    }
    res.redirect(`${dashboardUrl}?meta_connect=error&message=${encodeURIComponent(error.message)}`);
  }
});

// @desc    Obter status da conexão Meta e dados associados
// @route   GET /api/meta/connection-status
// @access  Private
const getConnectionStatus = asyncHandler(async (req, res) => {
  try {
    // Selecionar os campos corretos do schema
    const user = await User.findById(req.user.id).select('metaConnectionStatus metaAdAccounts metaPages'); 
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const isConnected = user.metaConnectionStatus === 'connected';
    const adAccounts = user.metaAdAccounts || [];
    const metaPages = user.metaPages || [];

    // Log antes de retornar
    console.log(`[Connection Status] Retornando para ${req.user.id}: isConnected=${isConnected}, adAccounts=${adAccounts.length}, metaPages=${metaPages.length}`);
    
    // Retornar estrutura esperada pelo frontend
    res.status(200).json({
      isConnected: isConnected,
      adAccounts: adAccounts, 
      metaPages: metaPages    
    });

  } catch (error) {
    console.error(`[Connection Status] Erro para ${req.user.id}:`, error);
    res.status(500).json({ message: "Erro interno ao verificar status da conexão Meta." });
  }
});

// @desc    Desconectar conta Meta
// @route   POST /api/meta/disconnect
// @access  Private
const disconnectMeta = asyncHandler(async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, {
      $unset: { metaAccessToken: "", metaUserId: "", metaTokenExpires: "", metaAdAccounts: "", metaPages: "" },
      metaConnectionStatus: 'disconnected'
    }, { new: true });

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    console.log(`[Disconnect] Usuário ${req.user.id} desconectado da Meta.`);
    res.status(200).json({ message: "Conta Meta desconectada com sucesso." });

  } catch (error) {
    console.error(`[Disconnect] Erro para ${req.user.id}:`, error);
    res.status(500).json({ message: "Erro interno ao desconectar conta Meta." });
  }
});

module.exports = {
  getMetaAuthUrl,
  facebookCallback,
  getConnectionStatus,
  disconnectMeta
};

