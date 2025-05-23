const asyncHandler = require("express-async-handler");
const fetch = require("node-fetch");
const User = require("../models/user"); // Certifique-se que o caminho está correto

// @desc    Obter URL de autorização do Facebook/Meta
// @route   GET /api/meta/auth-url
// @access  Private (requer autenticação)
const getMetaAuthUrl = asyncHandler(async (req, res) => {
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

  // Adicionando 'pages_show_list' para garantir que podemos listar as páginas
  const scope = [
    "ads_management",
    "ads_read",
    "business_management",
    "pages_read_engagement",
    "pages_manage_ads",
    "public_profile",
    "email",
    "pages_show_list" // Permissão para listar páginas
  ].join(",");

  // Incluir o userId no parâmetro state
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
  const { code, state } = req.query; // Obter code e state
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
  const clientId = process.env.FB_APP_ID;
  const clientSecret = process.env.FB_APP_SECRET;
  const dashboardUrl = "https://chefstudio.vercel.app/dashboard"; // URL de redirecionamento solicitada

  // 1. Validar code e state
  if (!code) {
    console.error("Erro no callback: Código de autorização não fornecido.");
    return res.redirect(`${dashboardUrl}?meta_connect=error&message=auth_code_missing`);
  }
  if (!state) {
    console.error("Erro no callback: Parâmetro state não fornecido.");
    return res.redirect(`${dashboardUrl}?meta_connect=error&message=state_missing`);
  }

  // O 'state' aqui é o userId que passamos na getMetaAuthUrl
  const userId = state;

  try {
    // 2. Buscar o usuário no MongoDB usando o userId (state)
    const user = await User.findById(userId);
    if (!user) {
      console.error(`Erro no callback: Usuário não encontrado com ID: ${userId}`);
      return res.redirect(`${dashboardUrl}?meta_connect=error&message=user_not_found`);
    }

    // 3. Trocar o code por um access_token de longa duração
    const shortLivedTokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&client_secret=${clientSecret}&code=${code}`
    );
    const shortLivedTokenData = await shortLivedTokenResponse.json();

    if (shortLivedTokenData.error || !shortLivedTokenData.access_token) {
      console.error("Erro ao obter token de acesso de curta duração:", shortLivedTokenData.error || "Token não retornado");
      throw new Error(`Erro ao obter token (curta duração): ${shortLivedTokenData.error?.message || 'Token não retornado'}`);
    }
    const shortLivedAccessToken = shortLivedTokenData.access_token;

    const longLivedTokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedAccessToken}`
    );
    const longLivedTokenData = await longLivedTokenResponse.json();

    let accessToken;
    if (longLivedTokenData.error || !longLivedTokenData.access_token) {
      console.warn("Aviso ao trocar por token de longa duração:", longLivedTokenData.error || "Token não retornado. Usando token de curta duração.");
      accessToken = shortLivedAccessToken;
    } else {
      accessToken = longLivedTokenData.access_token;
      console.log("Token de longa duração obtido com sucesso.");
    }

    // 4. Buscar o ID do usuário do Facebook (/me)
    const fbUserResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id&access_token=${accessToken}`
    );
    const fbUserData = await fbUserResponse.json();

    if (fbUserData.error || !fbUserData.id) {
      console.error("Erro ao obter ID do usuário do Facebook:", fbUserData.error || "ID não retornado");
      throw new Error(`Erro ao obter ID do usuário do Facebook: ${fbUserData.error?.message || 'ID não retornado'}`);
    }
    const metaUserId = fbUserData.id;

    // 5. Buscar as contas de anúncio (adAccounts)
    const adAccountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,account_id,name&access_token=${accessToken}`
    );
    const adAccountsData = await adAccountsResponse.json();

    if (adAccountsData.error) {
      console.warn(
        `Aviso ao obter contas de anúncios para usuário ${userId}: ${adAccountsData.error.message}`
      );
    }
    const formattedAdAccounts = adAccountsData?.data?.map(acc => ({
      id: acc.id,
      account_id: acc.account_id,
      name: acc.name
    })) || [];

    // 6. Buscar as Páginas do Facebook (accounts)
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/${metaUserId}/accounts?fields=id,name,access_token&access_token=${accessToken}`
    );
    const pagesData = await pagesResponse.json();

    if (pagesData.error) {
      console.warn(
        `Aviso ao obter páginas do Facebook para usuário ${userId}: ${pagesData.error.message}`
      );
    }
    const formattedPages = pagesData?.data?.map(page => ({
      id: page.id,
      name: page.name,
      access_token: page.access_token
    })) || [];

    // 7. Salvar as informações no MongoDB
    user.metaAccessToken = accessToken;
    user.metaUserId = metaUserId;
    user.adAccounts = formattedAdAccounts;
    user.metaPages = formattedPages;
    user.isMetaConnected = true;

    await user.save();
    console.log(`Dados da Meta (incluindo páginas) salvos com sucesso para o usuário ${userId}`);

    // 8. Redirecionar para o dashboard em caso de sucesso
    res.redirect(dashboardUrl);

  } catch (error) {
    console.error(`Erro no callback do Facebook para usuário ${userId}:`, error);
    // Considerar limpar dados parciais em caso de erro
    try {
      await User.findByIdAndUpdate(userId, { 
        $unset: { metaAccessToken: "", metaUserId: "", adAccounts: "", metaPages: "" },
        isMetaConnected: false 
      });
      console.log(`Dados Meta limpos para usuário ${userId} devido a erro no callback.`);
    } catch (cleanupError) {
      console.error(`Erro ao limpar dados Meta para usuário ${userId}:`, cleanupError);
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
  try {
    const user = await User.findById(req.user.id).select('isMetaConnected adAccounts metaPages'); // Selecionar campos relevantes
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

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
  getConnectionStatus, // Exportar a nova função
  disconnectMeta      // Exportar função de desconectar (se for usada)
};

