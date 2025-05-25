const asyncHandler = require("express-async-handler");
const multer = require("multer");
const FormData = require("form-data");
const axios = require("axios");
const User = require("../models/user"); // Corrigido: nome do arquivo em minúsculo
const { FacebookAdsApi, AdAccount, Campaign, AdSet, AdCreative, Ad } = require('facebook-nodejs-business-sdk');

// Configure Multer for image upload (in-memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper function to initialize Facebook API
const initFacebookApi = (accessToken) => {
  if (!accessToken) {
    throw new Error("Access Token do Facebook não encontrado.");
  }
  // Verifica se a API já foi inicializada para evitar erros
  try {
    return FacebookAdsApi.init(accessToken);
  } catch (e) {
    // Ignora erro se já inicializado, mas loga para debug se for outro erro
    if (!e.message.includes("already been initialized")) {
      console.warn("Erro não esperado ao inicializar FacebookAdsApi:", e.message);
    }
    // Retorna a instância existente ou null se falhar por outro motivo
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

  // 1. Get User's Facebook Access Token
  const user = await User.findById(req.user.id);
  if (!user || !user.facebookAccessToken) {
    res.status(401);
    throw new Error("Usuário não encontrado ou token do Facebook ausente.");
  }
  const accessToken = user.facebookAccessToken;
  const api = initFacebookApi(accessToken);

  if (!api) {
      res.status(500);
      throw new Error("Falha ao inicializar a API do Facebook.");
  }

  try {
    const account = new AdAccount(adAccountId); // Não precisa do 'act_'
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
      limit: 100 // Ajuste o limite conforme necessário
    });

    // Mapeia os dados para um formato mais simples, se necessário
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
 * @route POST /api/meta-ads/publicar-post-criar-anuncio
 * @access Privado
 */
const publishPostAndCreateAd = asyncHandler(async (req, res) => {
  const { 
    caption, 
    pageId, 
    adAccountId, 
    campaignName, 
    weeklyBudget, // Orçamento semanal em REAIS (precisa converter para centavos)
    startDate, 
    endDate // Opcional
  } = req.body;
  const imageFile = req.file; // Image file from multer

  if (!imageFile) {
    res.status(400);
    throw new Error("Nenhuma imagem foi enviada.");
  }

  if (!caption || !pageId || !adAccountId || !campaignName || !weeklyBudget || !startDate) {
    res.status(400);
    throw new Error("Campos obrigatórios faltando: caption, pageId, adAccountId, campaignName, weeklyBudget, startDate.");
  }

  // 1. Get User's Facebook Access Token
  const user = await User.findById(req.user.id); // Assuming req.user is populated by 'protect' middleware
  if (!user || !user.facebookAccessToken) {
    res.status(401);
    throw new Error("Usuário não encontrado ou token do Facebook ausente.");
  }
  const accessToken = user.facebookAccessToken;
  const api = initFacebookApi(accessToken);
   if (!api) {
      res.status(500);
      throw new Error("Falha ao inicializar a API do Facebook.");
  }

  try {
    // 2. Upload Photo to Facebook Page
    const photoFormData = new FormData();
    photoFormData.append('caption', caption);
    photoFormData.append('source', imageFile.buffer, { filename: imageFile.originalname, contentType: imageFile.mimetype });
    photoFormData.append('access_token', accessToken); // Include token for direct API call

    const uploadResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${pageId}/photos`,
      photoFormData,
      { headers: photoFormData.getHeaders() }
    );

    if (!uploadResponse.data || !uploadResponse.data.post_id) {
      console.error("Facebook Photo Upload Response:", uploadResponse.data);
      throw new Error("Falha ao fazer upload da foto para o Facebook. Resposta inválida.");
    }
    const postId = uploadResponse.data.post_id;
    const objectStoryId = `${pageId}_${postId.split('_')[1]}`; // Format: pageId_postId

    // 3. Create Ad Campaign (Boost Post)
    const adAccount = new AdAccount(adAccountId); // Não precisa do 'act_'
    
    // Convert budget from BRL string/number to cents integer
    const budgetInCents = Math.round(parseFloat(weeklyBudget) * 100);
    const dailyBudget = Math.round(budgetInCents / 7);

    // --- Create Campaign ---
    const campaignData = {
      [Campaign.Fields.name]: campaignName,
      [Campaign.Fields.objective]: Campaign.Objective.outcome_engagement, // Objective for boosting posts
      [Campaign.Fields.status]: Campaign.Status.paused, // Start paused, activate later
      [Campaign.Fields.special_ad_categories]: [], // Assuming no special categories
      [Campaign.Fields.buying_type]: 'AUCTION',
    };
    const campaign = await adAccount.createCampaign([], campaignData);
    const campaignId = campaign.id;

    // --- Create Ad Set ---
    const targeting = {
      geo_locations: { countries: ['BR'] }, // Example: Target Brazil
    };
    const adSetData = {
      [AdSet.Fields.name]: `AdSet - ${campaignName}`,
      [AdSet.Fields.campaign_id]: campaignId,
      [AdSet.Fields.status]: AdSet.Status.paused,
      [AdSet.Fields.billing_event]: AdSet.BillingEvent.impressions,
      [AdSet.Fields.optimization_goal]: AdSet.OptimizationGoal.post_engagement,
      [AdSet.Fields.daily_budget]: dailyBudget, // Use daily budget calculated from weekly
      [AdSet.Fields.targeting]: targeting,
      [AdSet.Fields.start_time]: new Date(startDate).toISOString(),
      ...(endDate && { [AdSet.Fields.end_time]: new Date(endDate).toISOString() }), // Add end date if provided
    };
    const adSet = await adAccount.createAdSet([], adSetData);
    const adSetId = adSet.id;

    // --- Create Ad Creative (using existing post) ---
    const creativeData = {
      [AdCreative.Fields.name]: `Creative - ${campaignName}`,
      [AdCreative.Fields.object_story_id]: objectStoryId,
    };
    const creative = await adAccount.createAdCreative([], creativeData);
    const creativeId = creative.id;

    // --- Create Ad ---
    const adData = {
      [Ad.Fields.name]: `Ad - ${campaignName}`,
      [Ad.Fields.adset_id]: adSetId,
      [Ad.Fields.creative]: { creative_id: creativeId },
      [Ad.Fields.status]: Ad.Status.paused, // Start paused
    };
    const ad = await adAccount.createAd([], adData);
    const adId = ad.id;

    // Activate Campaign, AdSet, Ad (Optional - can leave paused)
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
      adsManagerUrl: `https://business.facebook.com/adsmanager/manage/campaigns?act=${adAccountId.replace('act_','')}` // Remove act_ prefix for URL
    });

  } catch (error) {
    console.error("Erro ao publicar post ou criar anúncio no Facebook:", error.response ? error.response.data : error.message);
    res.status(500);
    let errorMessage = "Falha ao integrar com o Facebook.";
    if (error.response && error.response.data && error.response.data.error) {
      errorMessage = error.response.data.error.message || errorMessage;
    }
    throw new Error(`Erro na integração com Facebook: ${errorMessage}`);
  }
});

// Placeholder for the old criarCampanha function if it's still needed elsewhere
function criarCampanha(req, res) {
  res.status(501).json({ message: 'Função criarCampanha não implementada neste contexto.' });
}

module.exports = {
  publishPostAndCreateAd,
  listCampaigns, // Exportar a nova função
  upload, // Export multer middleware
  criarCampanha // Keep if needed, otherwise remove
};

