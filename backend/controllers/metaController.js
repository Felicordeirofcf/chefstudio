const fetch = require("node-fetch");
const qs = require("querystring");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ----------- CONEXÃO COM META ADS -----------

exports.connectMetaAccount = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Usuário não autenticado." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    // Gerar token JWT para ser usado como state no fluxo OAuth
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // Redirecionar para o endpoint de login com Facebook
    const redirectUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/meta/facebook/login?token=${token}`;
    
    res.json({ 
      message: "Iniciando conexão com Meta Ads", 
      redirectUrl 
    });
  } catch (err) {
    console.error("❌ Erro ao iniciar conexão com Meta Ads:", err.message);
    res.status(500).json({ message: "Erro ao iniciar conexão com Meta Ads" });
  }
};

exports.getMetaConnectionStatus = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Usuário não autenticado." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const connected = user.metaConnectionStatus === "connected" && user.metaAccessToken;
    const adAccountId = user.metaAdAccountId || null;
    
    res.json({ 
      connected, 
      adAccountId,
      message: connected ? "Conectado ao Meta Ads" : "Não conectado ao Meta Ads" 
    });
  } catch (err) {
    console.error("❌ Erro ao verificar status de conexão com Meta Ads:", err.message);
    res.status(500).json({ message: "Erro ao verificar status de conexão com Meta Ads" });
  }
};

exports.generateAdCaption = (req, res) => {
  const { productName } = req.body;
  if (!productName) {
    return res.status(400).json({ message: "Nome do produto é obrigatório." });
  }

  const caption = `Experimente agora o incrível ${productName}! #oferta #delivery`;
  res.json({ caption });
};

// ----------- LOGIN REAL COM FACEBOOK -----------

exports.loginWithFacebook = (req, res) => {
  console.log("[DEBUG] loginWithFacebook - FB_APP_ID:", process.env.FB_APP_ID);
  console.log("[DEBUG] loginWithFacebook - FACEBOOK_REDIRECT_URI:", process.env.FACEBOOK_REDIRECT_URI);
  const appId = process.env.FB_APP_ID;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
  // Escopos: ads_management (gerenciar anúncios), business_management (gerenciar negócios), ads_read (ler dados de anúncios)
  // pages_read_engagement (ler conteúdo de páginas), read_insights (ler métricas)
  const scope = "ads_management,business_management,pages_read_engagement,ads_read,read_insights";

  const chefStudioJwt = req.query.token; // Este é o JWT do ChefStudio, que será passado como 'state'
  if (!chefStudioJwt) {
    console.error("❌ Erro loginWithFacebook: Token JWT do ChefStudio (para ser usado como state) ausente na query.");
    return res.status(400).json({ message: "Token JWT do ChefStudio ausente na URL para iniciar o login com Facebook." });
  }

  if (!appId) {
    console.error("❌ Erro: FB_APP_ID não está definido nas variáveis de ambiente.");
    return res.status(500).json({ message: "Erro de configuração do servidor: FB_APP_ID ausente." });
  }
  if (!redirectUri) {
    console.error("❌ Erro: FACEBOOK_REDIRECT_URI não está definido nas variáveis de ambiente.");
    return res.status(500).json({ message: "Erro de configuração do servidor: FACEBOOK_REDIRECT_URI ausente." });
  }

  // O 'state' que o Facebook retornará é o JWT do ChefStudio
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${encodeURIComponent(chefStudioJwt)}`;
  console.log("[DEBUG] loginWithFacebook - Redirecting to Facebook auth URL. State (ChefStudio JWT) is being passed.");
  return res.redirect(authUrl);
};

exports.facebookCallback = async (req, res) => {
  const { code, state } = req.query; // 'state' aqui é o JWT do ChefStudio retornado pelo Facebook

  console.log("[DEBUG] facebookCallback - Iniciando...");
  console.log("[DEBUG] facebookCallback - Code recebido:", code ? "Presente" : "Ausente");
  console.log("[DEBUG] facebookCallback - State (ChefStudio JWT) recebido:", state ? "Presente" : "Ausente");

  const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
  const clientId = process.env.FB_APP_ID;
  const clientSecret = process.env.FB_APP_SECRET;
  const frontendUrl = process.env.FRONTEND_URL || 'https://chefstudio.vercel.app';

  if (!code || !state) {
    console.error("❌ Erro facebookCallback: Código de autorização do Facebook ou state (ChefStudio JWT) ausente.");
    return res.redirect(`${frontendUrl}/meta-callback?meta_error=true&message=${encodeURIComponent("Código ou state ausente no callback do Facebook.")}`);
  }

  if (!clientId || !clientSecret || !redirectUri) {
    console.error("❌ Erro facebookCallback: Variáveis de ambiente FB_APP_ID, FB_APP_SECRET ou FACEBOOK_REDIRECT_URI não definidas.");
    return res.redirect(`${frontendUrl}/meta-callback?meta_error=true&message=${encodeURIComponent("Erro de configuração do servidor Facebook.")}`);
  }

  try {
    const params = qs.stringify({
      client_id: clientId,
      redirect_uri: redirectUri,
      client_secret: clientSecret,
      code,
    });

    const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${params}`);
    const tokenData = await tokenRes.json();
    console.log("[DEBUG] facebookCallback - Resposta da troca de código por token de acesso Meta:", JSON.stringify(tokenData));

    if (tokenData.error) {
      console.error("❌ Erro facebookCallback ao obter token de acesso Meta:", JSON.stringify(tokenData.error));
      return res.redirect(`${frontendUrl}/meta-callback?meta_error=true&message=${encodeURIComponent("Erro ao obter token do Facebook: " + tokenData.error.message)}`);
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
        console.error("❌ Erro facebookCallback: Access token Meta não recebido.");
        return res.redirect(`${frontendUrl}/meta-callback?meta_error=true&message=${encodeURIComponent("Token de acesso Meta não recebido.")}`);
    }

    const meRes = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,email`);
    const meData = await meRes.json();
    console.log("[DEBUG] facebookCallback - Resposta do endpoint /me do Facebook:", JSON.stringify(meData));

    if (meData.error) {
        console.error("❌ Erro facebookCallback ao obter dados do usuário do Facebook (/me):", JSON.stringify(meData.error));
        return res.redirect(`${frontendUrl}/meta-callback?meta_error=true&message=${encodeURIComponent("Erro ao obter dados do usuário do Facebook: " + meData.error.message)}`);
    }

    let decodedChefStudioJwt;
    try {
        decodedChefStudioJwt = jwt.verify(state, process.env.JWT_SECRET);
        console.log("[DEBUG] facebookCallback - State (ChefStudio JWT) decodificado com sucesso. Payload:", decodedChefStudioJwt);
    } catch (jwtError) {
        console.error("❌ Erro facebookCallback: Falha ao verificar/decodificar o ChefStudio JWT (state):", jwtError.message);
        return res.redirect(`${frontendUrl}/meta-callback?meta_error=true&message=${encodeURIComponent("Token de estado (JWT) inválido ou expirado.")}`);
    }

    const user = await User.findById(decodedChefStudioJwt.id);
    if (!user) {
      console.error(`❌ Erro facebookCallback: Usuário ChefStudio não encontrado no DB com ID: ${decodedChefStudioJwt.id}.`);
      return res.redirect(`${frontendUrl}/meta-callback?meta_error=true&message=${encodeURIComponent("Usuário ChefStudio não encontrado.")}`);
    }

    user.metaAccessToken = accessToken;
    user.metaUserId = meData.id; // Facebook User ID
    user.metaConnectionStatus = "connected";
    user.metaEmail = meData.email; 
    user.metaName = meData.name; 

    // Buscar e salvar o ID da Conta de Anúncios
    try {
      const adAccountsRes = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?access_token=${accessToken}&fields=id,name,account_status`);
      const adAccountsData = await adAccountsRes.json();
      console.log("[DEBUG] facebookCallback - Resposta do /me/adaccounts:", JSON.stringify(adAccountsData));

      if (adAccountsData.error) {
        console.warn("⚠️ Aviso facebookCallback: Erro ao obter contas de anúncio do Facebook. O Ad Account ID não será salvo automaticamente.", JSON.stringify(adAccountsData.error));
        user.metaAdAccountId = null; // Limpar qualquer valor anterior se houver erro
      } else if (adAccountsData.data && adAccountsData.data.length > 0) {
        user.metaAdAccountId = adAccountsData.data[0].id; // Salva o ID da primeira conta (ex: "act_xxxxxxxxxxxxxxx")
        console.log(`✅ Ad Account ID (${user.metaAdAccountId}) obtido e será salvo para o usuário ChefStudio: ${user.email}`);
      } else {
        console.warn(`⚠️ Aviso facebookCallback: Nenhuma conta de anúncio encontrada para o usuário Facebook ID: ${meData.id}. O Ad Account ID não será salvo.`);
        user.metaAdAccountId = null; // Nenhuma conta encontrada
      }
    } catch (adAccountError) {
      console.warn("⚠️ Aviso facebookCallback: Exceção ao tentar obter contas de anúncio:", adAccountError.message);
      user.metaAdAccountId = null; // Limpar em caso de exceção
    }

    await user.save();
    console.log(`✅ Dados da conexão Meta (Token, FB UserID, Ad Account ID: ${user.metaAdAccountId}) salvos para o usuário ChefStudio: ${user.email}`);
    
    // Corrigido: Garantir que o redirecionamento seja para a rota correta no frontend
    // Adicionando timestamp para evitar cache
    const timestamp = Date.now();
    return res.redirect(`${frontendUrl}/meta-callback?meta_connected=true&userId=${user._id}&t=${timestamp}`);

  } catch (err) {
    console.error("❌ Erro GERAL no facebookCallback:", err.message, err.stack);
    return res.redirect(`${frontendUrl}/meta-callback?meta_error=true&message=${encodeURIComponent("Erro inesperado ao processar conexão com Facebook: " + err.message)}`);
  }
};

// ----------- CONTAS DE ANÚNCIO -----------

exports.getAdAccounts = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Usuário não autenticado."})
    }
    // Busca o usuário mais recente do DB para garantir que temos o metaAccessToken atualizado
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || !currentUser.metaAccessToken) {
      return res.status(401).json({ message: "Token Meta não encontrado para o usuário. Por favor, conecte-se ao Facebook." });
    }
    const token = currentUser.metaAccessToken;

    const response = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?access_token=${token}&fields=id,name,account_status,balance,currency,business_name`);
    const data = await response.json();

    if (data.error) {
      console.error("❌ Erro ao obter contas de anúncio do Facebook em getAdAccounts:", JSON.stringify(data.error));
      if (data.error.code === 190) { 
        return res.status(401).json({ message: "Sessão com o Facebook expirou ou é inválida. Por favor, reconecte.", error: data.error, reconectRequired: true });
      }
      return res.status(400).json({ message: "Erro ao obter contas de anúncio do Facebook.", error: data.error });
    }
    
    const adAccounts = data.data && Array.isArray(data.data) ? data.data : [];
    console.log(`[DEBUG] getAdAccounts - Contas de anúncio encontradas: ${adAccounts.length}`);
    res.json({ adAccounts });

  } catch (err) {
    console.error("❌ Erro interno ao buscar contas de anúncio em getAdAccounts:", err.message, err.stack);
    res.status(500).json({ message: "Erro interno do servidor ao buscar contas de anúncio." });
  }
};

// ----------- CAMPANHA -----------

exports.createMetaCampaign = async (req, res) => {
  const { adAccountId, name, objective = "LINK_CLICKS", status = "PAUSED" } = req.body;

  if (!adAccountId || !name) {
    return res.status(400).json({ message: "ID da Conta de Anúncios (adAccountId) e Nome da Campanha (name) são obrigatórios." });
  }
  if (!req.user || !req.user.metaAccessToken) {
     return res.status(401).json({ message: "Token Meta não encontrado. Conecte-se ao Facebook." });
  }
  const token = req.user.metaAccessToken;

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${adAccountId}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        name, 
        objective, 
        status, 
        special_ad_categories: ['NONE'], // Importante para evitar erros de categoria especial
        access_token: token 
      })
    });

    const data = await response.json();
    if (data.error) {
      console.error("❌ Erro ao criar campanha no Facebook:", JSON.stringify(data.error));
      return res.status(data.error.code === 100 && data.error.error_subcode === 33 ? 400 : (data.error.code || 400) ).json({ message: `Erro ao criar campanha: ${data.error.message}`, error: data.error });
    }

    console.log("✅ Campanha criada com sucesso no Facebook:", JSON.stringify(data));
    res.status(201).json({ message: "Campanha criada com sucesso!", campaign: data });
  } catch (err) {
    console.error("❌ Erro interno ao criar campanha:", err.message, err.stack);
    res.status(500).json({ message: "Erro interno do servidor ao criar campanha." });
  }
};
