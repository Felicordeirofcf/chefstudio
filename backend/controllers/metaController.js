const asyncHandler = require("express-async-handler");
const fetch = require("node-fetch");
const User = require("../models/user");

// @desc    Obter URL de autorização do Facebook/Meta
// @route   GET /api/meta/auth-url
// @access  Private (requer autenticação)
const getMetaAuthUrl = asyncHandler(async (req, res) => {
  // Usar as variáveis de ambiente com os nomes corretos conforme definido no Railway
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
  const clientId = process.env.FB_APP_ID;

  // Verificar se as variáveis de ambiente estão definidas
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

  // Construir URL de autorização do Facebook
  const scope = [
    "ads_management",
    "ads_read",
    "business_management",
    "pages_read_engagement",
    "pages_manage_ads",
    "public_profile",
    "email",
  ].join(",");

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${scope}&response_type=code`;

  // Logar para debug
  console.log(
    `Gerando authUrl para usuário ${req.user.id} com clientId=${clientId} e redirectUri=${redirectUri}`
  );

  res.json({ authUrl });
});

// @desc    Callback do Facebook
// @route   GET /api/meta/callback
// @access  Public
const facebookCallback = asyncHandler(async (req, res) => {
  const { code } = req.query;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
  const clientId = process.env.FB_APP_ID;
  const clientSecret = process.env.FB_APP_SECRET;

  if (!code) {
    res.status(400);
    throw new Error("Código de autorização não fornecido");
  }

  try {
    // Trocar código por token de acesso
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&client_secret=${clientSecret}&code=${code}`
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(`Erro ao obter token: ${tokenData.error.message}`);
    }

    const accessToken = tokenData.access_token;

    // Obter informações do usuário do Facebook
    const fbUserResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${accessToken}`
    );
    const fbUserData = await fbUserResponse.json();

    if (fbUserData.error) {
      throw new Error(
        `Erro ao obter dados do usuário do Facebook: ${fbUserData.error.message}`
      );
    }

    // Obter contas de anúncios
    const adAccountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status,amount_spent,business_name,currency,account_id&access_token=${accessToken}`
    );
    const adAccountsData = await adAccountsResponse.json();

    if (adAccountsData.error) {
      console.warn(
        `Aviso ao obter contas de anúncios: ${adAccountsData.error.message}`
      );
      // Continuar mesmo se houver erro ao buscar contas de anúncios
    }

    // Obter páginas
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}`
    );
    const pagesData = await pagesResponse.json();

    if (pagesData.error) {
      console.warn(`Aviso ao obter páginas: ${pagesData.error.message}`);
      // Continuar mesmo se houver erro ao buscar páginas
    }

    // Encontrar o usuário no seu banco de dados pelo ID que iniciou o fluxo
    // (Assumindo que você passou o userId no state ou de alguma forma)
    // const userId = req.query.state; // Exemplo: se você passou o userId no parâmetro state
    // Se não passou o state, precisa de outra forma de associar o callback ao usuário
    // Por enquanto, vamos assumir que o usuário está logado e o ID está em req.user (se aplicável)
    // const user = await User.findById(userId);

    // ATENÇÃO: O callback é público, req.user não estará disponível aqui
    // Você precisa de uma forma de associar este callback ao usuário que iniciou o fluxo.
    // Uma abordagem comum é usar o parâmetro 'state' na URL de autorização.
    // Por exemplo, gerar um state único, armazená-lo com o userId e verificá-lo no callback.

    // Exemplo simplificado (requer ajuste para associar ao usuário correto):
    // Atualizar dados do usuário (exemplo, precisa encontrar o usuário correto)
    // user.metaAccessToken = accessToken;
    // user.metaUserId = fbUserData.id;
    // user.metaAdAccounts = adAccountsData?.data || [];
    // user.metaPages = pagesData?.data || [];
    // user.isMetaConnected = true;
    // await user.save();

    // Redirecionar para o frontend com sucesso
    // Idealmente, passar um token ou indicador de sucesso
    res.redirect(
      `${process.env.FRONTEND_URL || "/dashboard"}?meta_connect=success`
    );
  } catch (error) {
    console.error("Erro no callback do Facebook:", error);
    // Redirecionar para o frontend com erro
    res.redirect(
      `${process.env.FRONTEND_URL || "/dashboard"}?meta_connect=error&message=${encodeURIComponent(error.message)}`
    );
  }
});

// Outras funções do controlador (getConnectionStatus, verifyConnection, etc.)
// ... (manter as funções existentes)

// Exportar todas as funções do controlador, incluindo a nova
module.exports = {
  getMetaAuthUrl, // Nova função
  facebookCallback,
  // ... (manter os outros exports existentes)
};

