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
    console.log(`[Page Token] Buscando Page Access Token para a página ${pageId} usando token do usuário (últimos 5: ...${userAccessToken.slice(-5)})...`);
    const response = await axios.get(`https://graph.facebook.com/v18.0/me/accounts`, {
      params: {
        fields: "id,name,access_token",
        access_token: userAccessToken, // Use user token to get page tokens
      },
    });

    if (response.data && response.data.data) {
      const pageAccount = response.data.data.find(acc => acc.id === pageId);
      if (pageAccount && pageAccount.access_token) {
        console.log(`[Page Token] Page Access Token encontrado para a página ${pageId}. Últimos 5: ...${pageAccount.access_token.slice(-5)}`);
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
    const errorDetails = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
    console.error(`[Page Token] Erro ao buscar Page Access Token para pageId ${pageId}:`, errorDetails);
    // Rethrow with a more specific message including details if available
    throw new Error(`Falha ao obter o token de acesso da página ${pageId}: ${error.response?.data?.error?.message || error.message}`);
  }
};

/**
 * @description Lista as campanhas de uma conta de anúncios específica.
 * @route GET /api/meta-ads/campaigns
 * @access Privado
 */
const listCampaigns = asyncHandler(async (req, res) => {
  // ... (código de listCampaigns permanece o mesmo, já usa user token corretamente para SDK)
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
    console.log(`[List Campaigns] Buscando campanhas para Ad Account ID: ${adAccountId} usando token do usuário (últimos 5: ...${userAccessToken.slice(-5)})...`);
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
  const { caption, pageId, adAccountId, campaignName, weeklyBudget, startDate, endDate, imageUrl, link } = req.body; // Adicionado 'link' se vier do body
  const imageFile = req.file;
  const facebookApiVersion = "v18.0"; // Manter a versão consistente

  // <<< ADICIONADO LOG INICIAL DETALHADO >>>
  console.log("[Publish Post/Ad] Dados recebidos do frontend:", {
    caption,
    pageId,
    adAccountId,
    campaignName,
    weeklyBudget,
    startDate,
    endDate,
    imageUrl: imageUrl || 'N/A',
    link: link || 'N/A', // Logar o link recebido
    imageFile: imageFile ? { name: imageFile.originalname, size: imageFile.size, type: imageFile.mimetype } : 'Nenhum arquivo enviado'
  });

  // --- Validação de Entrada ---
  if (!imageFile && !imageUrl) {
    return res.status(400).json({ message: "Nenhuma imagem foi enviada (nem arquivo, nem URL)." });
  }
  // Adicionar validação para link se for obrigatório
  // if (!link) { return res.status(400).json({ message: "O campo 'link' é obrigatório." }); }
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

  let pageAccessToken;
  try {
    // *** OBTER O PAGE ACCESS TOKEN ***
    pageAccessToken = await getPageAccessToken(userAccessToken, pageId);
    // Log já está dentro de getPageAccessToken

    // --- Publicação da Foto (usando Page Access Token via Axios/FormData ou Axios JSON) ---
    let postId;
    let photoId; // ID da foto, usado no AdCreative

    if (imageFile) {
      console.log(`[Publish Post - File] Preparando para publicar foto via upload para pageId ${pageId} usando Page Token (últimos 5: ...${pageAccessToken.slice(-5)})...`);
      const photoFormData = new FormData();
      photoFormData.append("caption", caption);
      photoFormData.append("published", "false"); // Cria como dark post
      photoFormData.append("source", imageFile.buffer, {
        filename: imageFile.originalname,
        contentType: imageFile.mimetype
      });

      // *** USAR PAGE ACCESS TOKEN NO HEADER ***
      const uploadResponse = await axios.post(
        `https://graph.facebook.com/${facebookApiVersion}/${pageId}/photos`,
        photoFormData,
        {
          headers: {
            ...photoFormData.getHeaders(),
            Authorization: `Bearer ${pageAccessToken}` // Passa o token no Header
          }
        }
      );
      console.log(`[Publish Post - File] Resposta da API /photos (upload):`, uploadResponse.data);

      if (!uploadResponse.data || (!uploadResponse.data.post_id && !uploadResponse.data.id)) {
        console.error("[Publish Post - File] Resposta inválida da API /photos (upload):", uploadResponse.data);
        throw new Error("Falha ao fazer upload da foto (arquivo) para o Facebook. Resposta inválida.");
      }
      postId = uploadResponse.data.post_id || `${pageId}_${uploadResponse.data.id}`; 
      photoId = uploadResponse.data.id;
      console.log(`[Publish Post - File] Foto publicada com sucesso. Post ID: ${postId}, Photo ID: ${photoId}`);

    } else if (imageUrl) {
      console.log(`[Publish Post - URL] Preparando para publicar foto via URL (${imageUrl}) para pageId ${pageId} usando Page Token (últimos 5: ...${pageAccessToken.slice(-5)})...`);
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
      console.log(`[Publish Post - URL] Resposta da API /photos (URL):`, uploadResponse.data);

      if (!uploadResponse.data || (!uploadResponse.data.post_id && !uploadResponse.data.id)) {
        console.error("[Publish Post - URL] Resposta inválida da API /photos (URL):", uploadResponse.data);
        throw new Error("Falha ao fazer upload da foto (URL) para o Facebook. Resposta inválida.");
      }
      postId = uploadResponse.data.post_id || `${pageId}_${uploadResponse.data.id}`;
      photoId = uploadResponse.data.id;
      console.log(`[Publish Post - URL] Foto publicada com sucesso. Post ID: ${postId}, Photo ID: ${photoId}`);
    }

    // O object_story_id para AdCreative geralmente é o ID do post (postId)
    const objectStoryId = postId;
    console.log(`[Ad Creation] Object Story ID (Post ID) para o anúncio: ${objectStoryId}`);
    console.log(`[Ad Creation] Photo ID para o criativo: ${photoId}`);

    // --- Criação da Campanha de Anúncio (usando SDK inicializado com User Token) ---
    console.log(`[Ad Creation] Iniciando criação da campanha: ${campaignName} na conta ${adAccountId} usando token do usuário (últimos 5: ...${userAccessToken.slice(-5)})...`);
    const adAccount = new AdAccount(adAccountId);

    // Orçamento: Converter para centavos e calcular diário
    const budgetInCents = Math.round(parseFloat(weeklyBudget) * 100);
    const dailyBudget = Math.round(budgetInCents / 7);
    if (dailyBudget < 100) { // Verifica orçamento mínimo (ex: $1 por dia)
        throw new Error("Orçamento semanal resulta em um orçamento diário abaixo do mínimo permitido pelo Facebook (aprox. $1/dia).");
    }
    console.log(`[Ad Creation] Orçamento semanal: R$${weeklyBudget}, Orçamento diário calculado: ${dailyBudget} centavos`);

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
    console.log(`[Ad Creation] Campanha criada com sucesso. ID: ${campaign.id}`);

    // 2. Criar Ad Set (Conjunto de Anúncios)
    console.log("[Ad Creation] Criando Ad Set...");
    const adSetData = {
      [AdSet.Fields.name]: `Ad Set para ${campaignName}`,
      [AdSet.Fields.campaign_id]: campaign.id,
      [AdSet.Fields.status]: AdSet.Status.paused,
      [AdSet.Fields.billing_event]: AdSet.BillingEvent.impressions,
      [AdSet.Fields.optimization_goal]: AdSet.OptimizationGoal.post_engagement, 
      [AdSet.Fields.daily_budget]: dailyBudget,
      [AdSet.Fields.start_time]: new Date(startDate).toISOString(),
      [AdSet.Fields.targeting]: {
        geo_locations: { countries: ["BR"] },
      },
    };
    if (endDate) {
      adSetData[AdSet.Fields.end_time] = new Date(endDate).toISOString();
    }
    console.log("[Ad Creation] Payload para createAdSet:", JSON.stringify(adSetData, null, 2)); // <<< ADICIONADO LOG DETALHADO
    const adSet = await adAccount.createAdSet([], adSetData);
    console.log(`[Ad Creation] Ad Set criado com sucesso. ID: ${adSet.id}`);

    // 3. Criar Ad Creative (Criativo do Anúncio)
    let adCreative; // Declare outside try block
    try {
      console.log("[Ad Creation] Criando Ad Creative...");
      // <<< LOG CONFORME SUGESTÃO DO USUÁRIO >>>
      console.log("[Ad Creation] Criando AdCreative com:", { // <<< USANDO FORMATO SUGERIDO PELO USUÁRIO >>>
        adAccountId: adAccountId,
        postId: objectStoryId, // Renomeado para postId para clareza no log
        name: `Criativo para ${campaignName}`,
        // token: userAccessToken // Não enviar token no log por segurança
      });
      const adCreativeData = {
        [AdCreative.Fields.name]: `Criativo para ${campaignName}`,
        [AdCreative.Fields.object_story_id]: objectStoryId, // <<< USA O ID DO POST (postId)
        // [AdCreative.Fields.page_id]: pageId // <<< Considerar adicionar page_id se necessário para visibilidade do post
      };
      console.log("[Ad Creation] Payload para createAdCreative (SDK):", JSON.stringify(adCreativeData, null, 2)); // <<< LOG DETALHADO JÁ EXISTENTE

      // <<< ENVOLVER CHAMADA ESPECÍFICA COM TRY/CATCH ROBUSTO >>>
      adCreative = await adAccount.createAdCreative([], adCreativeData);
      console.log(`[Ad Creation] Ad Creative criado com sucesso. ID: ${adCreative.id}`);

    } catch (error) {
        console.error("[Ad Creation - Specific Catch] Erro completo ao criar AdCreative:", error); // <<< LOG COMPLETO DO ERRO >>>
        // Tenta logar a resposta do erro da API do Facebook, se disponível
        if (error.response && error.response.error) {
            console.error("[Ad Creation - Specific Catch] Facebook API Error Response:", JSON.stringify(error.response.error, null, 2));
        } else {
            // Log adicional para casos onde error.response.error não existe (como o erro 'undefined' original)
            console.error("[Ad Creation - Specific Catch] Detalhes adicionais do erro (message):", error.message);
            console.error("[Ad Creation - Specific Catch] Detalhes adicionais do erro (stack):", error.stack);
        }
        // <<< RE-THROW PARA SER CAPTURADO PELO CATCH EXTERNO E MANTER FLUXO DE ERRO >>>
        throw error; // Re-lança o erro para ser pego pelo catch geral da função publishPostAndCreateAd
    }

    // 4. Criar Ad (Anúncio)
    console.log("[Ad Creation] Criando Ad...");
    const adData = {
      [Ad.Fields.name]: `Anúncio para ${campaignName}`,
      [Ad.Fields.adset_id]: adSet.id,
      [Ad.Fields.creative]: { creative_id: adCreative.id }, // <<< USA O ID DO CRIATIVO GERADO
      [Ad.Fields.status]: Ad.Status.paused,
    };
    console.log("[Ad Creation] Payload para createAd:", JSON.stringify(adData, null, 2)); // <<< ADICIONADO LOG DETALHADO
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
    // Log detalhado do erro, incluindo a resposta completa da API se disponível
    const errorDetails = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
    console.error(`[Publish Post/Ad Creation] ERRO GERAL ao processar para pageId ${pageId}, adAccountId ${adAccountId}:`, errorDetails);
    if (error.stack) {
        console.error("[Publish Post/Ad Creation] Stack Trace:", error.stack);
    }

    let errorMessage = "Falha ao publicar post ou criar anúncio no Facebook.";
    let statusCode = 500;
    let fbErrorData = null;

    if (error.response?.data?.error) {
      fbErrorData = error.response.data.error;
      errorMessage = `(#${fbErrorData.code || 'N/A'}) ${fbErrorData.message || 'Erro desconhecido do Facebook.'}`;
      // Specific error handling for permissions
      if (fbErrorData.code === 200 || fbErrorData.error_subcode === 200) {
        errorMessage = `Erro de permissão: ${errorMessage}. Verifique se o token (usuário para SDK: ...${userAccessToken.slice(-5)}, página para post: ...${pageAccessToken ? pageAccessToken.slice(-5) : 'N/A'}) tem as permissões necessárias (ads_management, pages_manage_posts, etc.).`;
        statusCode = 403; // Forbidden due to permissions
      } else if (fbErrorData.code === 10) {
         errorMessage = `Erro de permissão da aplicação: ${errorMessage}. Verifique as configurações do app e permissões do usuário.`;
         statusCode = 403;
      } else if (fbErrorData.code === 100) {
          errorMessage = `Parâmetro inválido: ${errorMessage}. Verifique os dados enviados.`;
          statusCode = 400; // Bad request
      } else {
          errorMessage = `Erro do Facebook: ${errorMessage}`;
      }
    } else if (error.message.includes("token de acesso da página")) {
        // Error from getPageAccessToken helper
        errorMessage = error.message;
        statusCode = 401; // Unauthorized or token issue
    } else if (error.message.includes("Orçamento semanal")) {
        errorMessage = error.message;
        statusCode = 400; // Bad request due to budget
    } else {
        // Erro genérico ou de outra parte do processo
        errorMessage = `Erro interno: ${error.message}`;
    }

    // Retorna a mensagem de erro e os detalhes do erro do Facebook (se houver)
    res.status(statusCode).json({ 
        message: `Erro na integração com Facebook: ${errorMessage}`, 
        details: fbErrorData // Inclui o objeto de erro completo do Facebook para depuração
    });
  }
});

module.exports = {
  listCampaigns,
  publishPostAndCreateAd: [upload.single("imageFile"), publishPostAndCreateAd], // Apply multer middleware here
};

