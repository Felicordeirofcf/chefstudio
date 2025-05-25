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
    throw new Error("Access Token do Facebook (usuário) não encontrado para inicializar SDK.");
  }
  try {
    // Initialize with user token for SDK operations like ad creation
    console.log("[SDK Init] Inicializando SDK do Facebook com token do usuário...");
    return FacebookAdsApi.init(accessToken);
  } catch (e) {
    // Handle potential re-initialization error gracefully
    if (!e.message.includes("already been initialized")) {
      console.warn("[SDK Init] Erro não esperado ao inicializar FacebookAdsApi:", e.message);
    }
    // Return the existing instance if already initialized
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
        access_token: userAccessToken, // Use user token to get page tokens
      },
    });

    if (response.data && response.data.data) {
      const pageAccount = response.data.data.find(acc => acc.id === pageId);
      if (pageAccount && pageAccount.access_token) {
        console.log(`[Page Token] Page Access Token encontrado para a página ${pageId}.`);
        return pageAccount.access_token; // Return the specific page's token
      } else {
        console.error(`[Page Token] Página com ID ${pageId} não encontrada ou sem token nas contas do usuário.`);
        throw new Error(`Página ${pageId} não encontrada ou sem permissão de acesso.`);
      }
    } else {
      console.error("[Page Token] Resposta inesperada ao buscar contas:", response.data);
      throw new Error("Não foi possível obter as contas da página do usuário.");
    }
  } catch (error) {
    console.error("[Page Token] Erro ao buscar Page Access Token:", error.response ? error.response.data : error.message);
    // Rethrow with a more specific message
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
    return res.status(400).json({ message: "O parâmetro 'adAccountId' é obrigatório." });
  }

  const user = await User.findById(req.user.id);
  if (!user || !user.metaAccessToken) {
    return res.status(401).json({ message: "Usuário não encontrado ou token do Facebook (usuário) ausente." });
  }

  const userAccessToken = user.metaAccessToken;
  const api = initFacebookApi(userAccessToken); // Init SDK with user token
  if (!api) {
    return res.status(500).json({ message: "Falha ao inicializar a API do Facebook." });
  }

  try {
    console.log(`[List Campaigns] Buscando campanhas para Ad Account ID: ${adAccountId} usando token do usuário...`);
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
    console.error(`[List Campaigns] Erro ao buscar campanhas para a conta ${adAccountId}:`, error.response ? error.response.data : error.message);
    let errorMessage = "Falha ao buscar campanhas no Facebook.";
    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    }
    // Check for permission error specifically
    if (error.response?.data?.error?.code === 200 || error.response?.data?.error?.error_subcode === 200) {
        errorMessage = `(#200) Erro de permissão ao buscar campanhas. Verifique as permissões do token: ${errorMessage}`;
    }
    res.status(500).json({ message: `Erro na integração com Facebook: ${errorMessage}` });
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
  const { caption, pageId, adAccountId, campaignName, weeklyBudget, startDate, endDate, imageUrl } = req.body;
  const imageFile = req.file;
  const facebookApiVersion = "v18.0"; // Manter a versão consistente

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

  // Inicializa a API do SDK com o token do usuário (necessário para criação de anúncios)
  const api = initFacebookApi(userAccessToken);
  if (!api) {
    return res.status(500).json({ message: "Falha ao inicializar a API do Facebook." });
  }

  try {
    // *** OBTER O PAGE ACCESS TOKEN ***
    const pageAccessToken = await getPageAccessToken(userAccessToken, pageId);
    console.log(`[Publish Post] Token da página ${pageId} obtido. Últimos 5 chars: ...${pageAccessToken.slice(-5)}`);

    // --- Publicação da Foto (usando Page Access Token via Axios/FormData ou Axios JSON) ---
    let postId;
    let photoId; // ID da foto, usado no AdCreative

    if (imageFile) {
      console.log("[Publish Post] Publicando foto via upload de arquivo usando Page Token...");
      const photoFormData = new FormData();
      photoFormData.append("caption", caption);
      // Define published=false para criar um post não publicado (dark post) que pode ser usado em anúncios
      // Se quiser que apareça na timeline, remova ou defina como true.
      photoFormData.append("published", "false");
      photoFormData.append("source", imageFile.buffer, {
        filename: imageFile.originalname,
        contentType: imageFile.mimetype
      });

      // *** USAR PAGE ACCESS TOKEN AQUI ***
      // Não precisa adicionar ao FormData, será passado no header ou params

      const uploadResponse = await axios.post(
        `https://graph.facebook.com/${facebookApiVersion}/${pageId}/photos`,
        photoFormData,
        {
          headers: {
            ...photoFormData.getHeaders(),
            Authorization: `Bearer ${pageAccessToken}` // Passa o token no Header
          }
          // params: { access_token: pageAccessToken } // Alternativa: passar como parâmetro
        }
      );

      if (!uploadResponse.data || (!uploadResponse.data.post_id && !uploadResponse.data.id)) {
        console.error("[Publish Post] Facebook Photo Upload Response (File):", uploadResponse.data);
        throw new Error("Falha ao fazer upload da foto (arquivo) para o Facebook. Resposta inválida.");
      }
      // O ID do post pode vir em post_id (se publicado) ou id (se não publicado)
      postId = uploadResponse.data.post_id || `${pageId}_${uploadResponse.data.id}`; // Formato comum para posts
      photoId = uploadResponse.data.id; // ID da foto em si
      console.log(`[Publish Post] Foto publicada via arquivo com sucesso. Post ID: ${postId}, Photo ID: ${photoId}`);

    } else if (imageUrl) {
      console.log(`[Publish Post] Publicando foto via URL: ${imageUrl} usando Page Token...`);
      const uploadResponse = await axios.post(
        `https://graph.facebook.com/${facebookApiVersion}/${pageId}/photos`,
        {
          caption: caption,
          url: imageUrl,
          published: false // Cria como dark post por padrão
        },
        {
          params: { access_token: pageAccessToken } // Passa o token como parâmetro
        }
      );

      if (!uploadResponse.data || (!uploadResponse.data.post_id && !uploadResponse.data.id)) {
        console.error("[Publish Post] Facebook Photo Upload Response (URL):", uploadResponse.data);
        throw new Error("Falha ao fazer upload da foto (URL) para o Facebook. Resposta inválida.");
      }
      postId = uploadResponse.data.post_id || `${pageId}_${uploadResponse.data.id}`;
      photoId = uploadResponse.data.id;
      console.log(`[Publish Post] Foto publicada via URL com sucesso. Post ID: ${postId}, Photo ID: ${photoId}`);
    }

    // O object_story_id para AdCreative geralmente é o ID do post (postId)
    // O object_id para AdCreative pode ser o ID da foto (photoId)
    const objectStoryId = postId;
    console.log(`[Ad Creation] Object Story ID (Post ID) para o anúncio: ${objectStoryId}`);
    console.log(`[Ad Creation] Photo ID para o criativo: ${photoId}`);

    // --- Criação da Campanha de Anúncio (usando SDK inicializado com User Token) ---
    console.log(`[Ad Creation] Iniciando criação da campanha: ${campaignName} na conta ${adAccountId} usando token do usuário...`);
    const adAccount = new AdAccount(adAccountId);

    // Orçamento: Converter para centavos e calcular diário
    const budgetInCents = Math.round(parseFloat(weeklyBudget) * 100);
    const dailyBudget = Math.round(budgetInCents / 7);
    if (dailyBudget < 100) { // Verifica orçamento mínimo (ex: $1 por dia)
        console.warn(`[Ad Creation] Orçamento diário calculado (${dailyBudget} centavos) é muito baixo. Ajustando para o mínimo (100 centavos).`);
        // dailyBudget = 100;
        // Ou lançar erro:
        throw new Error("Orçamento semanal resulta em um orçamento diário abaixo do mínimo permitido pelo Facebook.");
    }
    console.log(`[Ad Creation] Orçamento semanal: R$${weeklyBudget}, Orçamento diário calculado: ${dailyBudget} centavos`);

    // 1. Criar Campanha
    console.log("[Ad Creation] Criando Campanha...");
    const campaignData = {
      [Campaign.Fields.name]: campaignName,
      [Campaign.Fields.objective]: Campaign.Objective.outcome_engagement, // Objetivo de Engajamento com a Publicação
      [Campaign.Fields.status]: Campaign.Status.paused, // Começa pausada
      [Campaign.Fields.special_ad_categories]: [], // Categoria especial (se aplicável)
      [Campaign.Fields.buying_type]: "AUCTION",
    };
    const campaign = await adAccount.createCampaign([], campaignData);
    console.log(`[Ad Creation] Campanha criada com sucesso. ID: ${campaign.id}`);

    // 2. Criar Ad Set (Conjunto de Anúncios)
    console.log("[Ad Creation] Criando Ad Set...");
    const adSetData = {
      [AdSet.Fields.name]: `Ad Set para ${campaignName}`,
      [AdSet.Fields.campaign_id]: campaign.id,
      [AdSet.Fields.status]: AdSet.Status.paused,
      [AdSet.Fields.billing_event]: AdSet.BillingEvent.impressions,
      [AdSet.Fields.optimization_goal]: AdSet.OptimizationGoal.post_engagement, // Otimizar para engajamento
      [AdSet.Fields.daily_budget]: dailyBudget,
      [AdSet.Fields.start_time]: new Date(startDate).toISOString(),
      // Targeting (Exemplo: Brasil)
      [AdSet.Fields.targeting]: {
        geo_locations: { countries: ["BR"] },
        // Adicionar mais opções de segmentação aqui (idade, interesses, etc.)
        // publisher_platforms: ["facebook", "instagram"], // Onde exibir
        // facebook_positions: ["feed"], // Posições específicas
      },
    };
    if (endDate) {
      adSetData[AdSet.Fields.end_time] = new Date(endDate).toISOString();
    }
    const adSet = await adAccount.createAdSet([], adSetData);
    console.log(`[Ad Creation] Ad Set criado com sucesso. ID: ${adSet.id}`);

    // 3. Criar Ad Creative (Criativo do Anúncio)
    console.log("[Ad Creation] Criando Ad Creative...");
    const adCreativeData = {
      [AdCreative.Fields.name]: `Criativo para ${campaignName}`,
      // Usar object_story_id para promover um post existente
      [AdCreative.Fields.object_story_id]: objectStoryId,
      // OU usar object_id para criar um anúncio com a foto diretamente (sem post visível)
      // [AdCreative.Fields.object_id]: photoId, 
      // [AdCreative.Fields.body]: caption, // Se usar object_id, precisa do body
      // [AdCreative.Fields.image_hash]: imageFile ? await getAdImageHash(adAccountId, imageFile) : undefined, // Se usar object_id com upload
      // [AdCreative.Fields.image_url]: imageUrl, // Se usar object_id com URL
    };
    const adCreative = await adAccount.createAdCreative([], adCreativeData);
    console.log(`[Ad Creation] Ad Creative criado com sucesso. ID: ${adCreative.id}`);

    // 4. Criar Ad (Anúncio)
    console.log("[Ad Creation] Criando Ad...");
    const adData = {
      [Ad.Fields.name]: `Anúncio para ${campaignName}`,
      [Ad.Fields.adset_id]: adSet.id,
      [Ad.Fields.creative]: { creative_id: adCreative.id },
      [Ad.Fields.status]: Ad.Status.paused,
    };
    const ad = await adAccount.createAd([], adData);
    console.log(`[Ad Creation] Ad criado com sucesso. ID: ${ad.id}`);

    // --- Resposta Final --- 
    res.status(201).json({
      success: true,
      message: "Post publicado e anúncio criado com sucesso (iniciado em modo pausado).",
      postId: postId,
      campaignId: campaign.id,
      adSetId: adSet.id,
      adCreativeId: adCreative.id,
      adId: ad.id,
    });

  } catch (error) {
    console.error("[Publish Post/Ad Creation] ERRO GERAL:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    let errorMessage = "Falha ao publicar post ou criar anúncio no Facebook.";
    let statusCode = 500;

    if (error.response?.data?.error) {
      const fbError = error.response.data.error;
      errorMessage = `(#${fbError.code || 'N/A'}) ${fbError.message || 'Erro desconhecido do Facebook.'}`;
      // Specific error handling for permissions
      if (fbError.code === 200 || fbError.error_subcode === 200) {
        errorMessage = `Erro de permissão: ${errorMessage}. Verifique se o token (usuário para SDK, página para post) tem as permissões necessárias (ads_management, pages_manage_posts, etc.).`;
        statusCode = 403; // Forbidden due to permissions
      } else if (fbError.code === 10) {
         errorMessage = `Erro de permissão da aplicação: ${errorMessage}. Verifique as configurações do app e permissões do usuário.`;
         statusCode = 403;
      } else if (fbError.code === 100) {
          errorMessage = `Parâmetro inválido: ${errorMessage}. Verifique os dados enviados.`;
          statusCode = 400; // Bad request
      }
    } else if (error.message.includes("token de acesso da página")) {
        // Error from getPageAccessToken helper
        errorMessage = error.message;
        statusCode = 401; // Unauthorized or token issue
    } else if (error.message.includes("Orçamento semanal")) {
        errorMessage = error.message;
        statusCode = 400; // Bad request due to budget
    }

    res.status(statusCode).json({ message: `Erro na integração com Facebook: ${errorMessage}` });
  }
});

module.exports = {
  listCampaigns,
  publishPostAndCreateAd: [upload.single("imageFile"), publishPostAndCreateAd], // Apply multer middleware here
};

