const fetch = require("node-fetch");
const User = require("../models/User");

// ----------- CAMPANHAS REAL META ADS -----------

exports.getAllCampaigns = async (req, res) => {
  try {
    const token = req.user.metaAccessToken;
    const adAccountId = req.query.adAccountId; // passado como query param

    if (!token || !adAccountId) {
      return res.status(400).json({ message: "Token ou adAccountId ausente." });
    }

    const response = await fetch(`https://graph.facebook.com/v19.0/act_${adAccountId}/campaigns?access_token=${token}`);
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ message: "Erro ao buscar campanhas", error: data.error });
    }

    res.status(200).json(data.data);
  } catch (err) {
    console.error("❌ Erro ao listar campanhas:", err);
    res.status(500).json({ message: "Erro interno ao listar campanhas" });
  }
};

exports.createCampaign = async (req, res) => {
  const { adAccountId, name, objective = "LINK_CLICKS", status = "PAUSED" } = req.body;

  try {
    const token = req.user.metaAccessToken;
    if (!token || !adAccountId || !name) {
      return res.status(400).json({ message: "Token, adAccountId e nome são obrigatórios." });
    }

    const response = await fetch(`https://graph.facebook.com/v19.0/act_${adAccountId}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        objective,
        status,
        access_token: token
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ message: "Erro ao criar campanha", error: data.error });
    }

    res.status(201).json({ message: "Campanha criada com sucesso!", campaign: data });
  } catch (err) {
    console.error("❌ Erro ao criar campanha:", err);
    res.status(500).json({ message: "Erro interno ao criar campanha" });
  }
};

exports.getCampaignById = async (req, res) => {
  const { id } = req.params;

  try {
    const token = req.user.metaAccessToken;
    if (!token) return res.status(400).json({ message: "Token não encontrado." });

    const response = await fetch(`https://graph.facebook.com/v19.0/${id}?access_token=${token}`);
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ message: "Erro ao buscar campanha", error: data.error });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("❌ Erro ao buscar campanha:", err);
    res.status(500).json({ message: "Erro interno ao buscar campanha" });
  }
};

exports.updateCampaignStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const token = req.user.metaAccessToken;
    if (!token || !status) {
      return res.status(400).json({ message: "Token e status são obrigatórios." });
    }

    const response = await fetch(`https://graph.facebook.com/v19.0/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        access_token: token
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ message: "Erro ao atualizar status", error: data.error });
    }

    res.status(200).json({ message: `Status atualizado para ${status}`, result: data });
  } catch (err) {
    console.error("❌ Erro ao atualizar status:", err);
    res.status(500).json({ message: "Erro interno ao atualizar status" });
  }
};

exports.getCampaignMetrics = async (req, res) => {
  const { id } = req.params;

  try {
    const token = req.user.metaAccessToken;
    if (!token) return res.status(400).json({ message: "Token não encontrado." });

    const response = await fetch(`https://graph.facebook.com/v19.0/${id}/insights?access_token=${token}`);
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ message: "Erro ao obter métricas", error: data.error });
    }

    res.status(200).json(data.data);
  } catch (err) {
    console.error("❌ Erro ao obter métricas:", err);
    res.status(500).json({ message: "Erro interno ao obter métricas" });
  }
};

// ----------- LOCALIZAÇÃO REAL -----------

exports.saveLocationSettings = async (req, res) => {
  const { latitude, longitude, radius } = req.body;

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    typeof radius !== "number"
  ) {
    return res.status(400).json({ message: "Latitude, longitude e raio devem ser números." });
  }

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Usuário não autenticado." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    // Salvar configurações de localização no perfil do usuário
    user.locationSettings = {
      latitude,
      longitude,
      radius
    };
    
    await user.save();

    res.status(201).json({
      message: "Localização salva com sucesso",
      data: user.locationSettings
    });
  } catch (err) {
    console.error("❌ Erro ao salvar configurações de localização:", err.message);
    res.status(500).json({ message: "Erro ao salvar configurações de localização" });
  }
};

exports.getLocationSettings = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Usuário não autenticado." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    // Se o usuário não tiver configurações de localização, retornar valores padrão
    const locationSettings = user.locationSettings || {
      latitude: -23.5505,  // São Paulo como padrão
      longitude: -46.6333,
      radius: 5
    };

    res.json(locationSettings);
  } catch (err) {
    console.error("❌ Erro ao obter configurações de localização:", err.message);
    res.status(500).json({ message: "Erro ao obter configurações de localização" });
  }
};



// Função movida para metaController.js
// exports.createRecommendedTrafficCampaign = async (req, res) => { ... };
  // Extrair dados do corpo da requisição (frontend)
  const {
    adAccountId, // ID da conta de anúncios selecionada (ex: act_12345)
    pageId,      // ID da página do Facebook selecionada
    campaignName,
    weeklyBudget, // Orçamento SEMANAL em R$
    startDate,   // Formato YYYY-MM-DD
    endDate,     // Formato YYYY-MM-DD (opcional)
    location,    // { latitude, longitude, radius } (radius em KM)
    adType,      // 'image' ou 'post'
    adTitle,     // Título do anúncio (opcional)
    adDescription, // Descrição/texto principal do anúncio
    imageFile,   // Objeto do arquivo de imagem (se adType === 'image') - PRECISA AJUSTAR ROTA COM MULTER
    postUrl,     // URL da publicação (se adType === 'post')
    callToAction, // Tipo de CTA (ex: 'LEARN_MORE')
    menuUrl      // Link de destino (URL do cardápio)
  } = req.body;

  // Obter token de acesso do usuário logado
  const user = req.user;
  const accessToken = user.metaAccessToken;

  // --- Validações Iniciais --- 
  if (!adAccountId || !pageId || !campaignName || !weeklyBudget || !startDate || !location || !adType || !adDescription || !callToAction || !menuUrl) {
    return res.status(400).json({ message: "Parâmetros obrigatórios ausentes para criar a campanha recomendada." });
  }
  if (adType === 'image' && !req.file) { // Verifica se o arquivo foi enviado via multer
     return res.status(400).json({ message: "Arquivo de imagem é obrigatório para anúncios de imagem." });
  }
  if (adType === 'post' && !postUrl) {
     return res.status(400).json({ message: "URL da publicação é obrigatória para anúncios de post existente." });
  }
  if (!accessToken) {
    return res.status(401).json({ message: "Token de acesso do Meta não encontrado para o usuário." });
  }

  // Encontrar o Page Access Token específico para a página selecionada
  const selectedPage = user.metaPages.find(p => p.id === pageId);
  if (!selectedPage || !selectedPage.access_token) {
    return res.status(400).json({ message: `Token de acesso não encontrado para a página selecionada (ID: ${pageId}). Tente reconectar a conta Meta.` });
  }
  const pageAccessToken = selectedPage.access_token;

  // --- Constantes e Configurações --- 
  const API_VERSION = "v18.0"; // Usar a versão consistente
  const GRAPH_URL = `https://graph.facebook.com/${API_VERSION}`;
  const dailyBudgetInCents = Math.round((parseFloat(weeklyBudget) / 7) * 100); // Converter para orçamento diário em centavos

  try {
    console.log(`Iniciando criação de campanha de Tráfego para Ad Account: ${adAccountId}`);

    // --- Passo 1: Criar Campanha --- 
    console.log("Passo 1: Criando Campanha...");
    const campaignResponse = await fetch(`${GRAPH_URL}/${adAccountId}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: campaignName,
        objective: "TRAFFIC", // Objetivo de Tráfego
        status: "ACTIVE",      // Ativa por padrão
        special_ad_categories: [], // Nenhuma categoria especial por padrão
        access_token: accessToken
      })
    });
    const campaignData = await campaignResponse.json();
    if (campaignData.error) {
      console.error("Erro ao criar campanha:", campaignData.error);
      throw new Error(`Erro API (Campanha): ${campaignData.error.message}`);
    }
    const campaignId = campaignData.id;
    console.log(`Campanha criada com sucesso: ${campaignId}`);

    // --- Passo 2: Criar Conjunto de Anúncios (Ad Set) --- 
    console.log("Passo 2: Criando Conjunto de Anúncios...");
    const adSetPayload = {
      name: `${campaignName} - Ad Set`, 
      campaign_id: campaignId,
      status: "ACTIVE",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP", // Estratégia de lance recomendada (sem limite explícito)
      daily_budget: dailyBudgetInCents,
      billing_event: "IMPRESSIONS", // Cobrança por impressões
      optimization_goal: "LINK_CLICKS", // Otimização para cliques no link
      targeting: {
        geo_locations: {
          custom_locations: [{
            latitude: location.latitude,
            longitude: location.longitude,
            radius: location.radius, // Raio em KM
            distance_unit: 'kilometer'
          }]
        },
        // Plataformas e Posicionamentos (Padrão recomendado: Advantage+ Placements)
        publisher_platforms: ["facebook", "instagram", "messenger", "audience_network"],
        facebook_positions: ["feed"], // Exemplo mínimo, idealmente deixar automático
        instagram_positions: ["stream"], // Exemplo mínimo
        device_platforms: ["mobile", "desktop"],
        // advantage_plus_audience: true // Considerar usar público Advantage+
      },
      start_time: new Date(startDate).toISOString(), // Data de início
      access_token: accessToken
    };
    if (endDate) {
      adSetPayload.end_time = new Date(endDate).toISOString(); // Data de término opcional
    }

    const adSetResponse = await fetch(`${GRAPH_URL}/${adAccountId}/adsets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adSetPayload)
    });
    const adSetData = await adSetResponse.json();
    if (adSetData.error) {
      console.error("Erro ao criar Ad Set:", adSetData.error);
      throw new Error(`Erro API (Ad Set): ${adSetData.error.message}`);
    }
    const adSetId = adSetData.id;
    console.log(`Conjunto de Anúncios criado com sucesso: ${adSetId}`);

    // --- Passo 3: Preparar Criativo (Ad Creative) --- 
    console.log("Passo 3: Preparando Criativo...");
    let creativePayload = {
      name: `${campaignName} - Creative`,
      object_story_spec: {
        page_id: pageId,
        link_data: {
          message: adDescription,
          link: menuUrl,
          call_to_action: { type: callToAction.toUpperCase() }, // CTA em maiúsculas
          // name: adTitle || campaignName, // Título do link (opcional, pode vir da página)
        }
      },
      access_token: pageAccessToken // Usar Page Access Token para criar o criativo
    };

    if (adType === 'image') {
      // 3.1: Upload da Imagem (se necessário)
      console.log("Fazendo upload da imagem...");
      const imageFormData = new FormData();
      // O arquivo 'req.file' vem do middleware 'multer'
      // Precisamos converter o buffer para um Blob ou similar se 'fetch' não suportar buffer diretamente
      // Ou usar uma lib como 'form-data' para construir o form-data corretamente
      // **NOTA:** O 'fetch' padrão do Node pode ter limitações com FormData e Buffers.
      //             Usar 'axios' ou 'form-data' pode ser mais robusto aqui.
      //             Por simplicidade, vamos assumir que o fetch funciona, mas isso pode precisar de ajuste.
      
      // **AJUSTE NECESSÁRIO:** A forma de anexar o arquivo depende de como o multer o disponibiliza (buffer, path)
      // e como o 'fetch' ou 'axios' lida com isso. 
      // Exemplo conceitual (PODE PRECISAR DE AJUSTE REAL):
      // imageFormData.append('source', req.file.buffer, req.file.originalname);
      // imageFormData.append('access_token', accessToken);
      
      // **SOLUÇÃO MAIS SEGURA (usando path se multer salvar em disco):**
      const fs = require('fs');
      const FormData = require('form-data'); // Precisa instalar: npm install form-data
      const imageForm = new FormData();
      imageForm.append('source', fs.createReadStream(req.file.path));
      imageForm.append('access_token', accessToken);

      const imageUploadResponse = await fetch(`${GRAPH_URL}/${adAccountId}/adimages`, {
        method: "POST",
        body: imageForm, // Usar o objeto FormData
        // headers: imageForm.getHeaders() // Necessário se usar a lib 'form-data'
      });
      const imageData = await imageUploadResponse.json();
      
      // Remover arquivo temporário após upload
      fs.unlinkSync(req.file.path);

      if (imageData.error || !imageData.images || !imageData.images[req.file.filename]) {
        console.error("Erro ao fazer upload da imagem:", imageData.error || "Hash da imagem não encontrado");
        throw new Error(`Erro API (Upload Imagem): ${imageData.error?.message || 'Falha no upload'}`);
      }
      const imageHash = imageData.images[req.file.filename].hash;
      console.log(`Imagem enviada com sucesso. Hash: ${imageHash}`);

      // Atualizar payload do criativo com image_hash
      creativePayload.object_story_spec.link_data.image_hash = imageHash;
      if(adTitle) creativePayload.object_story_spec.link_data.name = adTitle; // Adiciona título se fornecido

    } else { // adType === 'post'
      // 3.2: Obter ID do Post existente
      // Precisamos extrair o ID do post da URL (ex: pageId_postId)
      // A URL pode ter formatos diferentes: 
      // https://www.facebook.com/{page-name}/posts/{post-id}
      // https://www.facebook.com/{page-name}/photos/a.xxx/yyy/
      // https://www.facebook.com/permalink.php?story_fbid=xxx&id=yyy
      // A forma mais segura é usar o endpoint de lookup: oembed_post
      console.log(`Buscando ID do post para URL: ${postUrl}`);
      const postLookupResponse = await fetch(`${GRAPH_URL}/oembed_post?url=${encodeURIComponent(postUrl)}&access_token=${accessToken}`);
      const postLookupData = await postLookupResponse.json();
      
      if (postLookupData.error || !postLookupData.post_id) {
         console.error("Erro ao buscar ID do post:", postLookupData.error || "ID não encontrado");
         // Tentar extração manual como fallback (menos confiável)
         const match = postUrl.match(/(\d+)_(\d+)/) || postUrl.match(/posts\/(\d+)/) || postUrl.match(/fbid=(\d+)/);
         const extractedPostId = match ? (match.length > 2 ? `${pageId}_${match[2]}` : match[1]) : null;
         if (!extractedPostId) {
            throw new Error(`Erro API (Post Lookup): ${postLookupData.error?.message || 'Não foi possível obter o ID do post'}`);
         }
         console.warn(`Usando ID extraído manualmente: ${extractedPostId}`);
         creativePayload.object_story_id = extractedPostId; // Usar page_id_post_id
      } else {
         creativePayload.object_story_id = postLookupData.post_id; // Usar page_id_post_id
         console.log(`ID do post obtido: ${postLookupData.post_id}`);
      }
      // Remover link_data quando usamos object_story_id
      delete creativePayload.object_story_spec.link_data;
      creativePayload.object_story_spec = undefined; // API espera object_story_id OU object_story_spec
    }

    // 3.3: Criar o Ad Creative
    console.log("Criando Ad Creative...");
    const creativeResponse = await fetch(`${GRAPH_URL}/${adAccountId}/adcreatives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creativePayload)
    });
    const creativeData = await creativeResponse.json();
    if (creativeData.error) {
      console.error("Erro ao criar Ad Creative:", creativeData.error);
      throw new Error(`Erro API (Ad Creative): ${creativeData.error.message}`);
    }
    const creativeId = creativeData.id;
    console.log(`Ad Creative criado com sucesso: ${creativeId}`);

    // --- Passo 4: Criar Anúncio (Ad) --- 
    console.log("Passo 4: Criando Anúncio...");
    const adResponse = await fetch(`${GRAPH_URL}/${adAccountId}/ads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${campaignName} - Ad`,
        adset_id: adSetId,
        creative: { creative_id: creativeId },
        status: "ACTIVE",
        access_token: accessToken
      })
    });
    const adData = await adResponse.json();
    if (adData.error) {
      console.error("Erro ao criar Ad:", adData.error);
      throw new Error(`Erro API (Ad): ${adData.error.message}`);
    }
    const adId = adData.id;
    console.log(`Anúncio criado com sucesso: ${adId}`);

    // --- Sucesso --- 
    res.status(201).json({
      message: "Campanha de Tráfego recomendada criada com sucesso!",
      campaignId: campaignId,
      adSetId: adSetId,
      adId: adId
    });

  } catch (error) {
    console.error("❌ Erro geral ao criar campanha de Tráfego recomendada:", error);
    // TODO: Considerar deletar objetos criados parcialmente (campanha, adset) em caso de erro posterior?
    res.status(500).json({ 
      message: "Erro interno ao criar campanha de Tráfego", 
      error: error.message 
    });
  }
};

