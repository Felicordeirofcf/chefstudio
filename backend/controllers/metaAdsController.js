const asyncHandler = require("express-async-handler");
const multer = require("multer");
const FormData = require("form-data");
const axios = require("axios");
const User = require("../models/user"); // Corrigido: nome do arquivo em minúsculo
const { FacebookAdsApi, AdAccount, Campaign, AdSet, AdCreative, Ad } = require("facebook-nodejs-business-sdk");

// Configure Multer for image upload (in-memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper function to initialize Facebook API
const initFacebookApi = (accessToken) => {
  if (!accessToken) {
    throw new Error("Access Token do Facebook não encontrado.");
  }
  try {
    return FacebookAdsApi.init(accessToken);
  } catch (e) {
    if (!e.message.includes("already been initialized")) {
      console.warn("Erro não esperado ao inicializar FacebookAdsApi:", e.message);
    }
    return FacebookAdsApi.getInstance();
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
    res.status(400);
    throw new Error("O parâmetro 'adAccountId' é obrigatório.");
  }

  const user = await User.findById(req.user.id);
  if (!user || !user.metaAccessToken) { 
    res.status(401);
    throw new Error("Usuário não encontrado ou token do Facebook ausente.");
  }
  const accessToken = user.metaAccessToken;
  const api = initFacebookApi(accessToken);

  if (!api) {
      res.status(500);
      throw new Error("Falha ao inicializar a API do Facebook.");
  }

  try {
    const account = new AdAccount(adAccountId);
    const campaigns = await account.getCampaigns([
      Campaign.Fields.id,
      Campaign.Fields.name,
      Campaign.Fields.status,
      Campaign.Fields.objective,
      Campaign.Fields.created_time,
      Campaign.Fields.start_time,
      Campaign.Fields.stop_time,
      Campaign.Fields.daily_budget,
      Campaign.Fields.lifetime_budget,
      Campaign.Fields.budget_remaining
    ], {
      limit: 100
    });

    const formattedCampaigns = campaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      created_time: campaign.created_time,
      start_time: campaign.start_time,
      stop_time: campaign.stop_time,
      daily_budget: campaign.daily_budget,
      lifetime_budget: campaign.lifetime_budget,
      budget_remaining: campaign.budget_remaining
    }));

    res.json({ success: true, campaigns: formattedCampaigns });

  } catch (error) {
    console.error(`Erro ao buscar campanhas para a conta ${adAccountId}:`, error.response ? error.response.data : error.message);
    res.status(500);
    let errorMessage = "Falha ao buscar campanhas no Facebook.";
    if (error.response && error.response.data && error.response.data.error) {
      errorMessage = error.response.data.error.message || errorMessage;
    }
    throw new Error(`Erro na integração com Facebook: ${errorMessage}`);
  }
});


/**
 * @description Publica uma foto na página do Facebook e cria um anúncio para impulsioná-la.
 *              Aceita imagem via upload (req.file) ou URL (req.body.imageUrl).
 * @route POST /api/meta-ads/publicar-post-criar-anuncio
 * @access Privado
 */
const publishPostAndCreateAd = asyncHandler(async (req, res) => {
  const { 
    caption, 
    pageId, 
    adAccountId, 
    campaignName, 
    weeklyBudget, 
    startDate, 
    endDate, // Opcional
    imageUrl // <<< NOVO: Receber URL da imagem do iFood
  } = req.body;
  const imageFile = req.file; // Image file from multer

  // --- Validação de Entrada ---
  if (!imageFile && !imageUrl) { // Precisa de um dos dois
    res.status(400);
    throw new Error("Nenhuma imagem foi enviada (nem arquivo, nem URL).");
  }
  if (imageFile && imageUrl) {
     console.warn("Imagem enviada via arquivo e URL. Priorizando arquivo.");
     // Prioriza o arquivo se ambos forem enviados
  }

  if (!caption || !pageId || !adAccountId || !campaignName || !weeklyBudget || !startDate) {
    res.status(400);
    throw new Error("Campos obrigatórios faltando: caption, pageId, adAccountId, campaignName, weeklyBudget, startDate.");
  }

  // --- Autenticação e Inicialização da API ---
  const user = await User.findById(req.user.id);
  if (!user || !user.metaAccessToken) { 
    res.status(401);
    throw new Error("Usuário não encontrado ou token do Facebook ausente.");
  }
  const accessToken = user.metaAccessToken;
  const api = initFacebookApi(accessToken);
   if (!api) {
      res.status(500);
      throw new Error("Falha ao inicializar a API do Facebook.");
  }

  try {
    // --- Publicação da Foto --- 
    let postId;
    // Prioriza upload de arquivo
    if (imageFile) {
        console.log("Publicando foto via upload de arquivo...");
        const photoFormData = new FormData();
        photoFormData.append("caption", caption);
        photoFormData.append("source", imageFile.buffer, { filename: imageFile.originalname, contentType: imageFile.mimetype });
        photoFormData.append("access_token", accessToken);

        const uploadResponse = await axios.post(
          `https://graph.facebook.com/v18.0/${pageId}/photos`,
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
        console.log(`Publicando foto via URL: ${imageUrl}`);
        // Publicar usando a URL
        const uploadResponse = await axios.post(
          `https://graph.facebook.com/v18.0/${pageId}/photos`,
          {
            caption: caption,
            url: imageUrl, // Usar a URL fornecida
            access_token: accessToken
          }
          // Não precisa de headers especiais para JSON
        );
         if (!uploadResponse.data || !uploadResponse.data.post_id) {
            console.error("Facebook Photo Upload Response (URL):", uploadResponse.data);
            throw new Error("Falha ao fazer upload da foto (URL) para o Facebook. Resposta inválida.");
        }
        postId = uploadResponse.data.post_id;
        console.log(`Foto publicada via URL com sucesso. Post ID: ${postId}`);
    }

    const objectStoryId = `${pageId}_${postId.split("_")[1]}`; // Format: pageId_postId
    console.log(`Object Story ID para o anúncio: ${objectStoryId}`);

    // --- Criação da Campanha de Anúncio --- 
    console.log(`Iniciando criação da campanha: ${campaignName} na conta ${adAccountId}`);
    const adAccount = new AdAccount(adAccountId);
    
    // Converter orçamento semanal (BRL) para diário (centavos)
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
    const targeting = {
      geo_locations: { countries: ["BR"] }, // Exemplo: Brasil
      // Adicionar mais opções de segmentação aqui se necessário
    };
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

    // Opcional: Ativar Campanha, AdSet, Ad (deixando em pausa por padrão)
    // await new Campaign(campaignId).update([], { [Campaign.Fields.status]: Campaign.Status.active });
    // await new AdSet(adSetId).update([], { [AdSet.Fields.status]: AdSet.Status.active });
    // await new Ad(adId).update([], { [Ad.Fields.status]: Ad.Status.active });

    res.json({
      success: true,
      message: "Post publicado e anúncio criado com sucesso (iniciado em pausa).",
      postId: postId,
      campaignId: campaignId,
      adSetId: adSetId,
      adId: adId,
      adsManagerUrl: `https://business.facebook.com/adsmanager/manage/campaigns?act=${adAccountId.replace("act_","")}`
    });

  } catch (error) {
    console.error("Erro detalhado ao publicar post ou criar anúncio:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    // Tentar extrair a mensagem de erro específica do Facebook
    let fbErrorMessage = "Falha ao integrar com o Facebook.";
    if (error.response && error.response.data && error.response.data.error) {
      fbErrorMessage = error.response.data.error.message || fbErrorMessage;
      if (error.response.data.error.error_user_title && error.response.data.error.error_user_msg) {
          fbErrorMessage = `${error.response.data.error.error_user_title}: ${error.response.data.error.error_user_msg}`;
      }
    }
    res.status(500);
    throw new Error(`Erro na integração com Facebook: ${fbErrorMessage}`);
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

