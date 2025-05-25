const asyncHandler = require("express-async-handler");
const multer = require("multer");
const FormData = require("form-data");
const axios = require("axios");
const User = require("../models/user");
const { FacebookAdsApi, AdAccount, Campaign, AdSet, AdCreative, Ad } = require("facebook-nodejs-business-sdk");

// Configure Multer for image upload (in-memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper function to initialize Facebook API (remains the same, uses user token for SDK init)
const initFacebookApi = (accessToken) => {
  if (!accessToken) {
    throw new Error("Access Token do Facebook não encontrado.");
  }
  try {
    // Initialize with user token for SDK operations like ad creation
    return FacebookAdsApi.init(accessToken);
  } catch (e) {
    if (!e.message.includes("already been initialized")) {
      console.warn("Erro não esperado ao inicializar FacebookAdsApi:", e.message);
    }
    return FacebookAdsApi.getInstance();
  }
};

// Helper function to get Page Access Token
const getPageAccessToken = async (userAccessToken, pageId) => {
  try {
    console.log(`Buscando Page Access Token para a página ${pageId}...`);
    const response = await axios.get(`https://graph.facebook.com/v18.0/me/accounts`, {
      params: {
        fields: "id,name,access_token",
        access_token: userAccessToken,
      },
    });

    if (response.data && response.data.data) {
      const pageAccount = response.data.data.find(acc => acc.id === pageId);
      if (pageAccount && pageAccount.access_token) {
        console.log(`Page Access Token encontrado para a página ${pageId}.`);
        return pageAccount.access_token;
      } else {
        console.error(`Página com ID ${pageId} não encontrada ou sem token nas contas do usuário.`);
        throw new Error(`Página ${pageId} não encontrada ou sem permissão de acesso.`);
      }
    } else {
      console.error("Resposta inesperada ao buscar contas:", response.data);
      throw new Error("Não foi possível obter as contas da página do usuário.");
    }
  } catch (error) {
    console.error("Erro ao buscar Page Access Token:", error.response ? error.response.data : error.message);
    throw new Error(`Falha ao obter o token de acesso da página: ${error.message}`);
  }
};


/**
 * @description Lista as campanhas de uma conta de anúncios específica.
 * @route GET /api/meta-ads/campaigns
 * @access Privado
 */
const listCampaigns = asyncHandler(async (req, res) => {
  const { adAccountId } = req.query;
  if (!adAccountId) {
    res.status(400).json({ message: "O parâmetro 'adAccountId' é obrigatório." });
    return;
  }
  const user = await User.findById(req.user.id);
  if (!user || !user.metaAccessToken) {
    res.status(401).json({ message: "Usuário não encontrado ou token do Facebook ausente." });
    return;
  }
  const accessToken = user.metaAccessToken;
  const api = initFacebookApi(accessToken);
  if (!api) {
      res.status(500).json({ message: "Falha ao inicializar a API do Facebook." });
      return;
  }
  try {
    const account = new AdAccount(adAccountId);
    const campaigns = await account.getCampaigns([
      Campaign.Fields.id, Campaign.Fields.name, Campaign.Fields.status, Campaign.Fields.objective,
      Campaign.Fields.created_time, Campaign.Fields.start_time, Campaign.Fields.stop_time,
      Campaign.Fields.daily_budget, Campaign.Fields.lifetime_budget, Campaign.Fields.budget_remaining
    ], { limit: 100 });
    const formattedCampaigns = campaigns.map(campaign => campaign._data);
    res.json({ success: true, campaigns: formattedCampaigns });
  } catch (error) {
    console.error(`Erro ao buscar campanhas para a conta ${adAccountId}:`, error.response ? error.response.data : error.message);
    let errorMessage = "Falha ao buscar campanhas no Facebook.";
    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    }
    res.status(500).json({ message: `Erro na integração com Facebook: ${errorMessage}` });
  }
});


/**
 * @description Publica uma foto na página do Facebook e cria um anúncio para impulsioná-la.
 *              Usa Page Access Token para publicar o post.
 * @route POST /api/meta-ads/publicar-post-criar-anuncio
 * @access Privado
 */
const publishPostAndCreateAd = asyncHandler(async (req, res) => {
  const { 
    caption, pageId, adAccountId, campaignName, weeklyBudget, startDate, endDate, imageUrl
  } = req.body;
  const imageFile = req.file;

  // --- Validação de Entrada ---
  if (!imageFile && !imageUrl) {
    res.status(400).json({ message: "Nenhuma imagem foi enviada (nem arquivo, nem URL)." });
    return;
  }
  if (!caption || !pageId || !adAccountId || !campaignName || !weeklyBudget || !startDate) {
    res.status(400).json({ message: "Campos obrigatórios faltando: caption, pageId, adAccountId, campaignName, weeklyBudget, startDate." });
    return;
  }

  // --- Autenticação e Obtenção de Tokens ---
  const user = await User.findById(req.user.id);
  if (!user || !user.metaAccessToken) {
    res.status(401).json({ message: "Usuário não encontrado ou token do Facebook ausente." });
    return;
  }
  const userAccessToken = user.metaAccessToken;
  
  // Inicializa a API do SDK com o token do usuário (para criação de anúncios)
  const api = initFacebookApi(userAccessToken);
  if (!api) {
      res.status(500).json({ message: "Falha ao inicializar a API do Facebook." });
      return;
  }

  try {
    // *** OBTER O PAGE ACCESS TOKEN ***
    const pageAccessToken = await getPageAccessToken(userAccessToken, pageId);

    // --- Publicação da Foto (usando Page Access Token) --- 
    let postId;
    const facebookApiVersion = "v18.0"; // Manter a versão consistente

    if (imageFile) {
        console.log("Publicando foto via upload de arquivo usando Page Token...");
        const photoFormData = new FormData();
        photoFormData.append("caption", caption);
        photoFormData.append("source", imageFile.buffer, { filename: imageFile.originalname, contentType: imageFile.mimetype });
        // *** USAR PAGE ACCESS TOKEN AQUI ***
        photoFormData.append("access_token", pageAccessToken); 

        const uploadResponse = await axios.post(
          `https://graph.facebook.com/${facebookApiVersion}/${pageId}/photos`,
          photoFormData,
          { headers: photoFormData.getHeaders() }
        );
        if (!uploadResponse.data || !uploadResponse.data.post_id) {
            console.error("Facebook Photo Upload Response (File):", uploadResponse.data);
            throw new Error("Falha ao fazer upload da foto (arquivo) para o Facebook. Resposta inválida.");
        }
        postId = uploadResponse.data.post_id;
        console.log(`Foto publicada via arquivo com sucesso. Post ID: ${postId}`);
    } else if (imageUrl) {
        console.log(`Publicando foto via URL: ${imageUrl} usando Page Token...`);
        const uploadResponse = await axios.post(
          `https://graph.facebook.com/${facebookApiVersion}/${pageId}/photos`,
          {
            caption: caption,
            url: imageUrl,
            // *** USAR PAGE ACCESS TOKEN AQUI ***
            access_token: pageAccessToken 
          }
        );
         if (!uploadResponse.data || !uploadResponse.data.post_id) {
            console.error("Facebook Photo Upload Response (URL):", uploadResponse.data);
            throw new Error("Falha ao fazer upload da foto (URL) para o Facebook. Resposta inválida.");
        }
        postId = uploadResponse.data.post_id;
        console.log(`Foto publicada via URL com sucesso. Post ID: ${postId}`);
    }

    // O object_story_id geralmente é pageId_photoPostId (o ID retornado em post_id já inclui o pageId)
    const objectStoryId = postId; 
    console.log(`Object Story ID para o anúncio: ${objectStoryId}`);

    // --- Criação da Campanha de Anúncio (usando SDK inicializado com User Token) --- 
    console.log(`Iniciando criação da campanha: ${campaignName} na conta ${adAccountId}`);
    const adAccount = new AdAccount(adAccountId);
    const budgetInCents = Math.round(parseFloat(weeklyBudget) * 100);
    const dailyBudget = Math.round(budgetInCents / 7);
    console.log(`Orçamento semanal: R$${weeklyBudget}, Orçamento diário calculado: ${dailyBudget} centavos`);

    // Criar Campanha
    const campaignData = {
      [Campaign.Fields.name]: campaignName,
      [Campaign.Fields.objective]: Campaign.Objective.outcome_engagement, 
      [Campaign.Fields.status]: Campaign.Status.paused, 
      [Campaign.Fields.special_ad_categories]: [],
      [Campaign.Fields.buying_type]: "AUCTION",
    };
    const campaign = await adAccount.createCampaign([], campaignData);
    const campaignId = campaign.id;
    console.log(`Campanha criada com ID: ${campaignId}`);

    // Criar Conjunto de Anúncios (AdSet)
    const targeting = { geo_locations: { countries: ["BR"] } };
    const adSetData = {
      [AdSet.Fields.name]: `AdSet - ${campaignName}`,
      [AdSet.Fields.campaign_id]: campaignId,
      [AdSet.Fields.status]: AdSet.Status.paused,
      [AdSet.Fields.billing_event]: AdSet.BillingEvent.impressions,
      [AdSet.Fields.optimization_goal]: AdSet.OptimizationGoal.post_engagement,
      [AdSet.Fields.daily_budget]: dailyBudget,
      [AdSet.Fields.targeting]: targeting,
      [AdSet.Fields.start_time]: new Date(startDate).toISOString(),
      ...(endDate && { [AdSet.Fields.end_time]: new Date(endDate).toISOString() }),
    };
    const adSet = await adAccount.createAdSet([], adSetData);
    const adSetId = adSet.id;
    console.log(`Conjunto de anúncios criado com ID: ${adSetId}`);

    // Criar Criativo do Anúncio (AdCreative)
    const creativeData = {
      [AdCreative.Fields.name]: `Creative - ${campaignName}`,
      // Usar o postId retornado pela publicação da foto
      [AdCreative.Fields.object_story_id]: objectStoryId, 
    };
    const creative = await adAccount.createAdCreative([], creativeData);
    const creativeId = creative.id;
    console.log(`Criativo do anúncio criado com ID: ${creativeId}`);

    // Criar Anúncio (Ad)
    const adData = {
      [Ad.Fields.name]: `Ad - ${campaignName}`,
      [Ad.Fields.adset_id]: adSetId,
      [Ad.Fields.creative]: { creative_id: creativeId },
      [Ad.Fields.status]: Ad.Status.paused,
    };
    const ad = await adAccount.createAd([], adData);
    const adId = ad.id;
    console.log(`Anúncio criado com ID: ${adId}`);

    res.json({
      success: true,
      message: "Post publicado com Page Token e anúncio criado com sucesso (iniciado em pausa).",
      postId: postId,
      campaignId: campaignId,
      adSetId: adSetId,
      adId: adId,
      adsManagerUrl: `https://business.facebook.com/adsmanager/manage/campaigns?act=${adAccountId.replace("act_","")}`
    });

  } catch (error) {
    console.error("Erro detalhado ao publicar post ou criar anúncio:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    let fbErrorMessage = "Falha ao integrar com o Facebook.";
    if (error.response?.data?.error?.message) {
      fbErrorMessage = error.response.data.error.message;
      if (error.response.data.error.error_user_title && error.response.data.error.error_user_msg) {
          fbErrorMessage = `${error.response.data.error.error_user_title}: ${error.response.data.error.error_user_msg}`;
      }
    }
    // Se o erro for na busca do token da página, a mensagem já vem formatada
    if (error.message.includes("Falha ao obter o token de acesso da página")) {
        fbErrorMessage = error.message;
    }
    res.status(500).json({ message: `Erro na integração com Facebook: ${fbErrorMessage}` });
  }
});

// Placeholder para a função antiga, se necessário
function criarCampanha(req, res) {
  res.status(501).json({ message: "Função criarCampanha não implementada neste contexto." });
}

module.exports = {
  publishPostAndCreateAd,
  listCampaigns,
  upload, // Exportar multer middleware
  criarCampanha // Manter se necessário
};

