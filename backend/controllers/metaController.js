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
    "ads_management", // Mantido conforme solicitado
    // "ads_read", // Removido - não explicitamente solicitado para postagem
    // "business_management", // Removido - não explicitamente solicitado para postagem
    "pages_read_engagement", // Mantido conforme solicitado
    "pages_manage_posts", // ADICIONADO conforme solicitado
    // "pages_manage_ads", // Removido - não explicitamente solicitado para postagem
    "public_profile",
    "email",
    "pages_show_list" // Mantido conforme solicitado
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
      // Calcula expiração aproximada do token de curta duração (geralmente 1-2 horas)
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
    // Solicita explicitamente o access_token da página
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
    user.metaAccessToken = userAccessToken; // Salva o token do USUÁRIO (pode ser útil para outras chamadas /me)
    user.metaUserId = metaUserId;
    user.metaTokenExpires = userTokenExpires; // Expiração do token do USUÁRIO
    user.metaAdAccounts = formattedAdAccounts; // Salva contas de anúncio
    user.metaPages = formattedPages; // << SALVA AS PÁGINAS COM SEUS RESPECTIVOS TOKENS >>
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
    res.redirect(`${dashboardUrl}?meta_connect=success`); // Adiciona parâmetro de sucesso

  } catch (error) {
    console.error(`[Meta Callback] ERRO GERAL para ${userId}:`, error);
    // Tenta limpar dados Meta no usuário em caso de erro durante o processo
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
    // Redireciona com mensagem de erro
    res.redirect(`${dashboardUrl}?meta_connect=error&message=${encodeURIComponent(error.message || 'Erro desconhecido durante conexão Meta')}`);
  }
});

// @desc    Obter status da conexão Meta
// @route   GET /api/meta/status
// @access  Private
const getMetaStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('metaConnectionStatus metaPages metaAdAccounts');
  if (!user) {
    return res.status(404).json({ message: 'Usuário não encontrado' });
  }

  res.json({
    status: user.metaConnectionStatus || 'disconnected',
    pages: user.metaPages || [],
    adAccounts: user.metaAdAccounts || []
  });
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

    // Opcional: Invalidar o token no Facebook (requer chamada à API)
    // try {
    //   if (user.metaAccessToken) {
    //     console.log(`[Meta Disconnect] Invalidando token no Facebook para ${userId}...`);
    //     await fetch(`https://graph.facebook.com/${user.metaUserId}/permissions`, {
    //       method: 'DELETE',
    //       headers: { 'Authorization': `Bearer ${user.metaAccessToken}` }
    //     });
    //     console.log(`[Meta Disconnect] Token invalidado (ou tentativa feita) para ${userId}.`);
    //   }
    // } catch (fbError) {
    //   console.error(`[Meta Disconnect] Erro ao invalidar token no Facebook para ${userId}:`, fbError);
    //   // Continua mesmo se a invalidação falhar
    // }

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


module.exports = {
  getMetaAuthUrl,
  facebookCallback,
  getMetaStatus,
  disconnectMeta,
  getMetaMetrics, // <-- Adicionado para exportar a função que faltava
};

