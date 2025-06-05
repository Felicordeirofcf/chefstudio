const asyncHandler = require("express-async-handler");
const multer = require("multer");
const FormData = require("form-data");
const axios = require("axios");
const User = require("../models/user");
const { FacebookAdsApi, AdAccount, Campaign, AdSet, AdCreative, Ad } = require("facebook-nodejs-business-sdk");
const path = require('path'); // <<< ADICIONADO: Para extrair extensão da URL

// Configure Multer for image upload (in-memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper function to initialize Facebook API
const initFacebookApi = (accessToken) => {
  if (!accessToken) {
    throw new Error("Access Token do Facebook (usuário) não encontrado para inicializar SDK.");
  }
  try {
    console.log("[SDK Init] Inicializando SDK do Facebook com token do usuário...");
    return FacebookAdsApi.init(accessToken);
  } catch (e) {
    if (!e.message.includes("already been initialized")) {
      console.warn("[SDK Init] Erro não esperado ao inicializar FacebookAdsApi:", e.message);
    }
    return FacebookAdsApi.getInstance();
  }
};

// Helper function to get Page Access Token
const getPageAccessToken = async (userAccessToken, pageId) => {
  try {
    console.log(`[Page Token] Buscando Page Access Token para a página ${pageId} usando token do usuário...`);
    const response = await axios.get(`https://graph.facebook.com/v18.0/me/accounts`, {
      params: {
        fields: "id,name,access_token",
        access_token: userAccessToken,
      },
    });

    if (response.data && response.data.data) {
      const pageAccount = response.data.data.find(acc => acc.id === pageId);
      if (pageAccount && pageAccount.access_token) {
        console.log(`[Page Token] Page Access Token encontrado para a página ${pageId}.`);
        return pageAccount.access_token;
      } else {
        console.error(`[Page Token] Página com ID ${pageId} não encontrada ou sem token.`);
        throw new Error(`Página ${pageId} não encontrada ou sem permissão de acesso.`);
      }
    } else {
      console.error("[Page Token] Resposta inesperada ao buscar contas:", response.data);
      throw new Error("Não foi possível obter as contas da página do usuário.");
    }
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
    console.error(`[Page Token] Erro ao buscar Page Access Token para pageId ${pageId}:`, errorDetails);
    throw new Error(`Falha ao obter o token de acesso da página ${pageId}: ${error.response?.data?.error?.message || error.message}`);
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
    return res.status(400).json({ message: "O parâmetro 'adAccountId' é obrigatório." });
  }

  const user = await User.findById(req.user.id);
  if (!user || !user.metaAccessToken) {
    return res.status(401).json({ message: "Usuário não encontrado ou token do Facebook (usuário) ausente." });
  }

  const userAccessToken = user.metaAccessToken;
  const api = initFacebookApi(userAccessToken);
  if (!api) {
    return res.status(500).json({ message: "Falha ao inicializar a API do Facebook." });
  }

  try {
    console.log(`[List Campaigns] Buscando campanhas para Ad Account ID: ${adAccountId}...`);
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

    const formattedCampaigns = campaigns.map(campaign => campaign._data);
    console.log(`[List Campaigns] ${formattedCampaigns.length} campanhas encontradas para ${adAccountId}.`);
    res.json({ success: true, campaigns: formattedCampaigns });

  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
    console.error(`[List Campaigns] Erro ao buscar campanhas para a conta ${adAccountId}:`, errorDetails);
    let errorMessage = "Falha ao buscar campanhas no Facebook.";
    let statusCode = 500;
    if (error.response?.data?.error) {
        const fbError = error.response.data.error;
        errorMessage = `(#${fbError.code || 'N/A'}) ${fbError.message || 'Erro desconhecido do Facebook.'}`;
        if (fbError.code === 200 || fbError.error_subcode === 200) {
            errorMessage = `Erro de permissão ao buscar campanhas: ${errorMessage}. Verifique as permissões do token do usuário.`;
            statusCode = 403;
        } else {
            errorMessage = `Erro do Facebook ao buscar campanhas: ${errorMessage}`;
        }
    }
    res.status(statusCode).json({ message: `Erro na integração com Facebook: ${errorMessage}`, details: error.response?.data?.error });
  }
});

/**
 * @description Publica uma foto na página do Facebook e cria um anúncio para impulsioná-la.
 * Usa Page Access Token para publicar o post.
 * Usa User Access Token para inicializar o SDK e criar o anúncio.
 * @route POST /api/meta-ads/publicar-post-criar-anuncio
 * @access Privado
 */
const publishPostAndCreateAd = asyncHandler(async (req, res) => {
  const { caption, pageId, adAccountId, campaignName, weeklyBudget, startDate, endDate, imageUrl, link } = req.body;
  const imageFile = req.file;
  const facebookApiVersion = "v18.0";

  console.log("[Publish Post/Ad] Dados recebidos:", {
    caption, pageId, adAccountId, campaignName, weeklyBudget, startDate, endDate,
    imageUrl: imageUrl || 'N/A', link: link || 'N/A',
    imageFile: imageFile ? { name: imageFile.originalname, size: imageFile.size, type: imageFile.mimetype } : 'Nenhum arquivo enviado'
  });

  // --- Validação de Entrada ---
  if (!imageFile && !imageUrl) {
    return res.status(400).json({ message: "Nenhuma imagem foi enviada (nem arquivo, nem URL)." });
  }
  if (!caption || !pageId || !adAccountId || !campaignName || !weeklyBudget || !startDate) {
    return res.status(400).json({ message: "Campos obrigatórios faltando: caption, pageId, adAccountId, campaignName, weeklyBudget, startDate." });
  }

  // --- Autenticação e Obtenção de Tokens ---
  const user = await User.findById(req.user.id);
  if (!user || !user.metaAccessToken) {
    return res.status(401).json({ message: "Usuário não encontrado ou token do Facebook (usuário) ausente." });
  }
  const userAccessToken = user.metaAccessToken;

  const api = initFacebookApi(userAccessToken);
  if (!api) {
    return res.status(500).json({ message: "Falha ao inicializar a API do Facebook." });
  }

  let pageAccessToken;
  try {
    pageAccessToken = await getPageAccessToken(userAccessToken, pageId);

    // --- Publicação da Foto ---
    let postId;
    let photoId;
    let imageBuffer;
    let imageFilename;
    let imageContentType;

    if (imageFile) {
      console.log(`[Publish Post - File] Usando arquivo enviado: ${imageFile.originalname}`);
      imageBuffer = imageFile.buffer;
      imageFilename = imageFile.originalname;
      imageContentType = imageFile.mimetype;
    } else if (imageUrl) {
      console.log(`[Publish Post - URL] Baixando imagem da URL: ${imageUrl}`);
      try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        imageBuffer = Buffer.from(response.data, 'binary');
        imageContentType = response.headers['content-type'] || 'image/jpeg'; // Default to jpeg if not provided
        // Tenta extrair um nome de arquivo da URL
        try {
          const urlPath = new URL(imageUrl).pathname;
          imageFilename = path.basename(urlPath) || `downloaded_image${path.extname(urlPath) || '.jpg'}`;
        } catch (urlError) {
          console.warn('[Publish Post - URL] Não foi possível extrair nome do arquivo da URL, usando nome padrão.');
          imageFilename = 'downloaded_image.jpg'; // Nome padrão
        }
        console.log(`[Publish Post - URL] Imagem baixada: ${imageFilename}, Tipo: ${imageContentType}, Tamanho: ${imageBuffer.length} bytes`);
      } catch (downloadError) {
        console.error(`[Publish Post - URL] Erro ao baixar imagem da URL ${imageUrl}:`, downloadError.message);
        throw new Error(`Falha ao baixar a imagem da URL fornecida: ${downloadError.message}`);
      }
    }

    // Agora publica a imagem usando o buffer (seja do upload ou do download)
    console.log(`[Publish Post] Preparando para publicar foto (buffer) para pageId ${pageId} usando Page Token...`);
    const photoFormData = new FormData();
    photoFormData.append("caption", caption);
    photoFormData.append("published", "true");
    photoFormData.append("source", imageBuffer, {
      filename: imageFilename,
      contentType: imageContentType
    });

    const uploadResponse = await axios.post(
      `https://graph.facebook.com/${facebookApiVersion}/${pageId}/photos`,
      photoFormData,
      {
        headers: {
          ...photoFormData.getHeaders(),
          Authorization: `Bearer ${pageAccessToken}`
        }
      }
    );
    console.log(`[Publish Post] Resposta da API /photos:`, uploadResponse.data);

    if (!uploadResponse.data || (!uploadResponse.data.post_id && !uploadResponse.data.id)) {
      console.error("[Publish Post] Resposta inválida da API /photos:", uploadResponse.data);
      throw new Error("Falha ao fazer upload da foto para o Facebook. Resposta inválida.");
    }
    postId = uploadResponse.data.post_id || `${pageId}_${uploadResponse.data.id}`;
    photoId = uploadResponse.data.id;
    console.log(`[Publish Post] Foto publicada com sucesso. Post ID: ${postId}, Photo ID: ${photoId}`);

    // --- Criação da Campanha de Anúncio ---
    const objectStoryId = postId;
    console.log(`[Ad Creation] Iniciando criação da campanha: ${campaignName} na conta ${adAccountId}...`);
    const adAccount = new AdAccount(adAccountId);

    const budgetInCents = Math.round(parseFloat(weeklyBudget) * 100);
    const dailyBudget = Math.round(budgetInCents / 7);
    if (dailyBudget < 100) {
        throw new Error("Orçamento semanal resulta em um orçamento diário abaixo do mínimo permitido (aprox. $1/dia).");
    }
    console.log(`[Ad Creation] Orçamento diário calculado: ${dailyBudget} centavos`);

    // 1. Criar Campanha
    console.log("[Ad Creation] Criando Campanha...");
    const campaignData = {
      [Campaign.Fields.name]: campaignName,
      [Campaign.Fields.objective]: Campaign.Objective.outcome_engagement,
      [Campaign.Fields.status]: Campaign.Status.paused,
      [Campaign.Fields.special_ad_categories]: [],
      [Campaign.Fields.buying_type]: "AUCTION",
    };
    const campaign = await adAccount.createCampaign([], campaignData);
    console.log(`[Ad Creation] Campanha criada. ID: ${campaign.id}`);

    // 2. Criar Ad Creative
    console.log("[Ad Creation] Criando Ad Creative...");
    const adCreativeData = {
      [AdCreative.Fields.name]: `Criativo para ${campaignName}`,
      [AdCreative.Fields.object_story_id]: objectStoryId,
    };
    const adCreative = await adAccount.createAdCreative([], adCreativeData);
    console.log(`[Ad Creation] Ad Creative criado. ID: ${adCreative.id}`);

    // 3. Criar Ad Set
    console.log("[Ad Creation] Criando Ad Set...");
    const adSetData = {
      [AdSet.Fields.name]: `Ad Set para ${campaignName}`,
      [AdSet.Fields.campaign_id]: campaign.id,
      [AdSet.Fields.status]: AdSet.Status.active,
      [AdSet.Fields.billing_event]: AdSet.BillingEvent.impressions,
      [AdSet.Fields.optimization_goal]: AdSet.OptimizationGoal.post_engagement,
      [AdSet.Fields.bid_strategy]: "LOWEST_COST_WITHOUT_CAP",
      [AdSet.Fields.daily_budget]: dailyBudget,
      [AdSet.Fields.start_time]: new Date(startDate).toISOString(),
      [AdSet.Fields.targeting]: {
        geo_locations: { countries: ["BR"] },
      }
    };
    if (endDate) {
      adSetData[AdSet.Fields.end_time] = new Date(endDate).toISOString();
    }
    const adSet = await adAccount.createAdSet([], adSetData);
    console.log(`[Ad Creation] Ad Set criado. ID: ${adSet.id}`);

    // 4. Criar Ad
    console.log("[Ad Creation] Criando Ad...");
    const adData = {
      [Ad.Fields.name]: `Anúncio para ${campaignName}`,
      [Ad.Fields.adset_id]: adSet.id,
      [Ad.Fields.creative]: { [AdCreative.Fields.id]: adCreative.id },
      [Ad.Fields.status]: Ad.Status.active,
    };
    const ad = await adAccount.createAd([], adData);
    console.log(`[Ad Creation] Ad criado. ID: ${ad.id}`);

    // --- Resposta Final ---
    const adsManagerUrl = `https://business.facebook.com/adsmanager/manage/campaigns?act=${adAccountId.replace('act_','')}`;
    console.log(`[Publish Post/Ad] Processo concluído com sucesso para usuário ${req.user.id}.`);
    res.status(200).json({
      success: true,
      message: "Post publicado e anúncio criado com sucesso (iniciado em pausa).",
      postId: postId,
      campaignId: campaign.id,
      adSetId: adSet.id,
      adId: ad.id,
      adsManagerUrl: adsManagerUrl
    });

  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
    console.error(`[Publish Post/Ad] ERRO GERAL para usuário ${req.user?.id}:`, errorDetails);
    let errorMessage = "Falha ao publicar post ou criar anúncio.";
    let statusCode = 500;
    if (error.response?.data?.error) {
        const fbError = error.response.data.error;
        errorMessage = `(#${fbError.code || 'N/A'}) ${fbError.message || 'Erro desconhecido do Facebook.'}`;
        if (fbError.code === 200 || fbError.error_subcode === 200) {
            errorMessage = `Erro de permissão: ${errorMessage}. Verifique as permissões do token.`;
            statusCode = 403;
        } else {
            errorMessage = `Erro do Facebook: ${errorMessage}`;
        }
    } else if (error.message.includes("Orçamento semanal")) {
        errorMessage = error.message;
        statusCode = 400;
    } else if (error.message.includes("Falha ao baixar a imagem")) {
        errorMessage = error.message;
        statusCode = 400;
    } else if (error.message.includes("Página") && error.message.includes("não encontrada")) {
        errorMessage = error.message;
        statusCode = 404;
    }
    res.status(statusCode).json({ message: `Erro na integração com Facebook: ${errorMessage}`, details: error.response?.data?.error || error.message });
  }
});

module.exports = {
  listCampaigns,
  publishPostAndCreateAd,
};

