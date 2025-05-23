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

  const scope = [
    "ads_management",
    "ads_read",
    "business_management",
    "pages_read_engagement",
    "pages_manage_ads",
    "public_profile",
    "email",
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

    // 3. Trocar o code por um access_token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&client_secret=${clientSecret}&code=${code}`
    );
    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error("Erro ao obter token de acesso:", tokenData.error || "Token não retornado");
      throw new Error(`Erro ao obter token: ${tokenData.error?.message || 'Token não retornado'}`);
    }
    const accessToken = tokenData.access_token;

    // 4. Buscar o ID do usuário do Facebook (/me)
    const fbUserResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id&access_token=${accessToken}` // Apenas o ID é necessário aqui
    );
    const fbUserData = await fbUserResponse.json();

    if (fbUserData.error || !fbUserData.id) {
      console.error("Erro ao obter ID do usuário do Facebook:", fbUserData.error || "ID não retornado");
      throw new Error(`Erro ao obter ID do usuário do Facebook: ${fbUserData.error?.message || 'ID não retornado'}`);
    }
    const metaUserId = fbUserData.id;

    // 5. Buscar as contas de anúncio (adAccounts)
    const adAccountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,account_id,name&access_token=${accessToken}` // Campos solicitados
    );
    const adAccountsData = await adAccountsResponse.json();

    // Não lançar erro se contas não forem encontradas, mas logar
    if (adAccountsData.error) {
      console.warn(
        `Aviso ao obter contas de anúncios para usuário ${userId}: ${adAccountsData.error.message}`
      );
    }

    // Formatar as contas de anúncio conforme solicitado
    const formattedAdAccounts = adAccountsData?.data?.map(acc => ({
      id: acc.id,           // Ex: act_1234567890
      account_id: acc.account_id, // Ex: 1234567890
      name: acc.name
    })) || [];

    // 6. Salvar as informações no MongoDB
    user.metaAccessToken = accessToken;
    user.metaUserId = metaUserId;
    user.adAccounts = formattedAdAccounts; // Salvar array formatado
    user.isMetaConnected = true; // Marcar como conectado

    await user.save();
    console.log(`Dados da Meta salvos com sucesso para o usuário ${userId}`);

    // 7. Redirecionar para o dashboard em caso de sucesso
    res.redirect(dashboardUrl); // Redirecionamento solicitado

  } catch (error) {
    console.error(`Erro no callback do Facebook para usuário ${userId}:`, error);
    // Redirecionar para o dashboard com erro
    res.redirect(
      `${dashboardUrl}?meta_connect=error&message=${encodeURIComponent(error.message)}`
    );
  }
});

// Manter outras funções do controlador se existirem...
// Exemplo:
// const getConnectionStatus = asyncHandler(async (req, res) => { ... });

module.exports = {
  getMetaAuthUrl,
  facebookCallback,
  // ... outros exports
};

