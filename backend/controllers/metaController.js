const asyncHandler = require("express-async-handler");
const fetch = require("node-fetch");
const User = require("../models/user"); // Certifique-se que o caminho está correto

// @desc    Obter URL de autorização do Facebook/Meta
// @route   GET /api/meta/auth-url
// @access  Private (requer autenticação)
const getMetaAuthUrl = asyncHandler(async (req, res) => {
  // ... (código existente para getMetaAuthUrl - sem alterações aqui)
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
  const clientId = process.env.FB_APP_ID;
  const userId = req.user.id; // Obter o ID do usuário logado

  if (!clientId) {
    console.error("ERRO: FB_APP_ID não está definido nas variáveis de ambiente");
    return res.status(500).json({
      error: "Configuração incompleta",
      message: "ID do cliente Facebook não está configurado no servidor",
    });
  }

  if (!redirectUri) {
    console.error(
      "ERRO: FACEBOOK_REDIRECT_URI não está definido nas variáveis de ambiente"
    );
    return res.status(500).json({
      error: "Configuração incompleta",
      message: "URI de redirecionamento não está configurado no servidor",
    });
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

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${scope}&response_type=code&state=${state}`;

  console.log(
    `Gerando authUrl para usuário ${userId} com clientId=${clientId} e redirectUri=${redirectUri}`
  );

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

  if (!code) {
    console.error("[Meta Callback] Erro: Código de autorização não fornecido.");
    return res.redirect(`${dashboardUrl}?meta_connect=error&message=auth_code_missing`);
  }
  if (!userId) {
    console.error("[Meta Callback] Erro: Parâmetro state (userId) não fornecido.");
    return res.redirect(`${dashboardUrl}?meta_connect=error&message=state_missing`);
  }

  try {
    console.log(`[Meta Callback] Buscando usuário: ${userId}`);
    const user = await User.findById(userId);
    if (!user) {
      console.error(`[Meta Callback] Erro: Usuário não encontrado com ID: ${userId}`);
      return res.redirect(`${dashboardUrl}?meta_connect=error&message=user_not_found`);
    }
    console.log(`[Meta Callback] Usuário ${userId} encontrado.`);

    // --- Troca de Token --- 
    console.log(`[Meta Callback] Trocando código por token para usuário ${userId}...`);
    const shortLivedTokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&client_secret=${clientSecret}&code=${code}`
    );
    const shortLivedTokenData = await shortLivedTokenResponse.json();
    if (shortLivedTokenData.error || !shortLivedTokenData.access_token) {
      console.error("[Meta Callback] Erro ao obter token de acesso de curta duração:", shortLivedTokenData.error || "Token não retornado");
      throw new Error(`Erro ao obter token (curta duração): ${shortLivedTokenData.error?.message || 'Token não retornado'}`);
    }
    const shortLivedAccessToken = shortLivedTokenData.access_token;
    console.log(`[Meta Callback] Token de curta duração obtido para ${userId}. Trocando por longa duração...`);

    const longLivedTokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedAccessToken}`
    );
    const longLivedTokenData = await longLivedTokenResponse.json();
    let accessToken;
    if (longLivedTokenData.error || !longLivedTokenData.access_token) {
      console.warn(`[Meta Callback] Aviso ao trocar por token de longa duração para ${userId}:`, longLivedTokenData.error || "Token não retornado. Usando token de curta duração.");
      accessToken = shortLivedAccessToken;
    } else {
      accessToken = longLivedTokenData.access_token;
      console.log(`[Meta Callback] Token de longa duração obtido com sucesso para ${userId}.`);
    }

    // --- Busca de Dados Meta --- 
    console.log(`[Meta Callback] Buscando ID do usuário Meta (/me) para ${userId}...`);
    const fbUserResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id&access_token=${accessToken}`
    );
    const fbUserData = await fbUserResponse.json();
    if (fbUserData.error || !fbUserData.id) {
      console.error(`[Meta Callback] Erro ao obter ID do usuário do Facebook para ${userId}:`, fbUserData.error || "ID não retornado");
      throw new Error(`Erro ao obter ID do usuário do Facebook: ${fbUserData.error?.message || 'ID não retornado'}`);
    }
    const metaUserId = fbUserData.id;
    console.log(`[Meta Callback] ID do usuário Meta obtido para ${userId}: ${metaUserId}`);

    console.log(`[Meta Callback] Buscando contas de anúncios (/me/adaccounts) para ${userId}...`);
    const adAccountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,account_id,name&access_token=${accessToken}`
    );
    const adAccountsData = await adAccountsResponse.json();
    if (adAccountsData.error) {
      console.warn(`[Meta Callback] Aviso ao obter contas de anúncios para ${userId}:`, adAccountsData.error.message);
    }
    // *** LOG ADICIONADO ***
    console.log(`[Meta Callback] Resposta da API Ad Accounts para ${userId}:`, JSON.stringify(adAccountsData, null, 2));
    const formattedAdAccounts = adAccountsData?.data?.map(acc => ({
      id: acc.id,
      account_id: acc.account_id,
      name: acc.name
    })) || [];
    // *** LOG ADICIONADO ***
    console.log(`[Meta Callback] Contas de anúncios formatadas para ${userId}:`, JSON.stringify(formattedAdAccounts, null, 2));

    console.log(`[Meta Callback] Buscando páginas (/me/accounts) para ${userId}...`);
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/${metaUserId}/accounts?fields=id,name,access_token&access_token=${accessToken}`
    );
    const pagesData = await pagesResponse.json();
    if (pagesData.error) {
      console.warn(`[Meta Callback] Aviso ao obter páginas do Facebook para ${userId}:`, pagesData.error.message);
    }
    // *** LOG ADICIONADO ***
    console.log(`[Meta Callback] Resposta da API Pages para ${userId}:`, JSON.stringify(pagesData, null, 2));
    const formattedPages = pagesData?.data?.map(page => ({
      id: page.id,
      name: page.name,
      access_token: page.access_token
    })) || [];
     // *** LOG ADICIONADO ***
    console.log(`[Meta Callback] Páginas formatadas para ${userId}:`, JSON.stringify(formattedPages, null, 2));

    // --- Salvamento no MongoDB --- 
    console.log(`[Meta Callback] Preparando para salvar dados no MongoDB para ${userId}...`);
    user.metaAccessToken = accessToken;
    user.metaUserId = metaUserId;
    user.adAccounts = formattedAdAccounts;
    user.metaPages = formattedPages;
    user.isMetaConnected = true; // Definindo explicitamente como true

    // *** LOG ADICIONADO ***
    console.log(`[Meta Callback] Dados a serem salvos para ${userId}:`, {
        metaAccessToken: user.metaAccessToken ? '...' + user.metaAccessToken.slice(-5) : null, // Não logar token inteiro
        metaUserId: user.metaUserId,
        adAccountsCount: user.adAccounts.length,
        metaPagesCount: user.metaPages.length,
        isMetaConnected: user.isMetaConnected
    });

    console.log(`[Meta Callback] Executando user.save() para ${userId}...`);
    await user.save();
    // *** LOG ADICIONADO ***
    console.log(`[Meta Callback] user.save() concluído com sucesso para ${userId}!`);

    // --- Redirecionamento --- 
    console.log(`[Meta Callback] Redirecionando usuário ${userId} para o dashboard com sucesso.`);
    res.redirect(dashboardUrl);

  } catch (error) {
    console.error(`[Meta Callback] ERRO GERAL no callback do Facebook para usuário ${userId}:`, error);
    // Limpar dados parciais em caso de erro
    try {
      console.log(`[Meta Callback] Tentando limpar dados Meta para ${userId} devido a erro...`);
      await User.findByIdAndUpdate(userId, { 
        $unset: { metaAccessToken: "", metaUserId: "", adAccounts: "", metaPages: "" },
        isMetaConnected: false 
      });
      console.log(`[Meta Callback] Dados Meta limpos para usuário ${userId} devido a erro no callback.`);
    } catch (cleanupError) {
      console.error(`[Meta Callback] Erro ao limpar dados Meta para usuário ${userId}:`, cleanupError);
    }
    res.redirect(
      `${dashboardUrl}?meta_connect=error&message=${encodeURIComponent(error.message)}`
    );
  }
});

// @desc    Obter status da conexão Meta e dados associados
// @route   GET /api/meta/connection-status
// @access  Private
const getConnectionStatus = asyncHandler(async (req, res) => {
  // ... (código existente para getConnectionStatus - sem alterações aqui)
  try {
    const user = await User.findById(req.user.id).select('isMetaConnected adAccounts metaPages');
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    // *** LOG ADICIONADO ***
    console.log(`[Connection Status] Retornando status para ${req.user.id}: isConnected=${user.isMetaConnected}, adAccounts=${user.adAccounts?.length || 0}, metaPages=${user.metaPages?.length || 0}`);
    res.status(200).json({
      isConnected: user.isMetaConnected || false,
      adAccounts: user.adAccounts || [],
      metaPages: user.metaPages || []
    });
  } catch (error) {
    console.error(`Erro ao obter status da conexão Meta para usuário ${req.user.id}:`, error);
    res.status(500).json({ message: "Erro interno ao verificar status da conexão Meta." });
  }
});

// @desc    Desconectar conta Meta
// @route   POST /api/meta/disconnect
// @access  Private
const disconnectMeta = asyncHandler(async (req, res) => {
  // ... (código existente para disconnectMeta - sem alterações aqui)
  try {
    const user = await User.findByIdAndUpdate(req.user.id, {
      $unset: { metaAccessToken: "", metaUserId: "", adAccounts: "", metaPages: "" },
      isMetaConnected: false
    }, { new: true });

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    console.log(`Usuário ${req.user.id} desconectado da Meta.`);
    res.status(200).json({ message: "Conta Meta desconectada com sucesso." });

  } catch (error) {
    console.error(`Erro ao desconectar Meta para usuário ${req.user.id}:`, error);
    res.status(500).json({ message: "Erro interno ao desconectar conta Meta." });
  }
});

module.exports = {
  getMetaAuthUrl,
  facebookCallback,
  getConnectionStatus,
  disconnectMeta
};

