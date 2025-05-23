const asyncHandler = require('express-async-handler');
const User = require('../models/user');
const fetch = require('node-fetch');

// Função auxiliar para obter métricas do Meta Ads
const getMetricsAsync = async (adAccountId, since, until, accessToken) => {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${adAccountId}/insights?fields=spend,impressions,clicks,ctr,cpc,reach&time_range={"since":"${since}","until":"${until}"}&access_token=${accessToken}`
    );
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Erro ao obter métricas: ${data.error.message}`);
    }
    
    return data.data || [];
  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    throw error;
  }
};

// @desc    Login com Facebook
// @route   GET /api/meta/login
// @access  Public
const facebookLogin = asyncHandler(async (req, res) => {
  const redirectUri = process.env.META_REDIRECT_URI;
  const clientId = process.env.META_CLIENT_ID;
  
  // Construir URL de autorização do Facebook
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=ads_management,ads_read,business_management,pages_read_engagement,pages_manage_ads,public_profile,email`;
  
  res.json({ authUrl });
});

// @desc    Callback do Facebook
// @route   GET /api/meta/callback
// @access  Public
const facebookCallback = asyncHandler(async (req, res) => {
  const { code } = req.query;
  const redirectUri = process.env.META_REDIRECT_URI;
  const clientId = process.env.META_CLIENT_ID;
  const clientSecret = process.env.META_CLIENT_SECRET;
  
  if (!code) {
    res.status(400);
    throw new Error('Código de autorização não fornecido');
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
    
    // Obter informações do usuário
    const userResponse = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${accessToken}`);
    const userData = await userResponse.json();
    
    if (userData.error) {
      throw new Error(`Erro ao obter dados do usuário: ${userData.error.message}`);
    }
    
    // Obter contas de anúncios
    const adAccountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status,amount_spent,business_name,currency,account_id&access_token=${accessToken}`
    );
    
    const adAccountsData = await adAccountsResponse.json();
    
    if (adAccountsData.error) {
      throw new Error(`Erro ao obter contas de anúncios: ${adAccountsData.error.message}`);
    }
    
    // Obter páginas
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}`
    );
    
    const pagesData = await pagesResponse.json();
    
    if (pagesData.error) {
      throw new Error(`Erro ao obter páginas: ${pagesData.error.message}`);
    }
    
    // Verificar se o usuário existe no banco de dados
    let user = await User.findById(req.user._id);
    
    if (!user) {
      res.status(404);
      throw new Error('Usuário não encontrado');
    }
    
    // Atualizar informações do usuário
    user.metaId = userData.id;
    user.metaAccessToken = accessToken;
    user.metaConnectionStatus = 'connected';
    user.metaTokenExpires = Date.now() + 60 * 24 * 60 * 60 * 1000; // 60 dias
    
    // Processar contas de anúncios
    const adAccounts = adAccountsData.data.map(account => ({
      id: account.id,
      name: account.name,
      status: account.account_status,
      businessName: account.business_name,
      currency: account.currency,
      accountId: account.account_id
    }));
    
    user.metaAdAccounts = adAccounts;
    
    // Definir conta de anúncios principal (primeira ativa ou primeira da lista)
    if (adAccounts.length > 0) {
      const primaryAccount = adAccounts.find(account => account.status === 1) || adAccounts[0];
      user.metaPrimaryAdAccountId = primaryAccount.id;
    }
    
    // Processar páginas
    if (pagesData.data && pagesData.data.length > 0) {
      const pages = pagesData.data.map(page => ({
        id: page.id,
        name: page.name,
        accessToken: page.access_token
      }));
      
      user.metaPages = pages;
      
      // Definir página principal (primeira da lista)
      if (pages.length > 0) {
        user.metaPageId = pages[0].id;
        user.metaPageToken = pages[0].accessToken;
      }
    }
    
    await user.save();
    
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?meta_connected=true`);
  } catch (error) {
    console.error('Erro no callback do Facebook:', error);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?meta_error=${encodeURIComponent(error.message)}`);
  }
});

// @desc    Verificar status da conexão com o Meta
// @route   GET /api/meta/connection-status
// @access  Private
const getConnectionStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (!user) {
    res.status(404);
    throw new Error('Usuário não encontrado');
  }
  
  res.json({
    connected: user.metaConnectionStatus === 'connected',
    metaId: user.metaId,
    adAccounts: user.metaAdAccounts || [],
    pages: user.metaPages || [],
    primaryAdAccountId: user.metaPrimaryAdAccountId,
    primaryPageId: user.metaPageId
  });
});

// @desc    Verificar conexão com o Meta
// @route   GET /api/meta/verify-connection
// @access  Private
const verifyConnection = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (!user) {
    res.status(404);
    throw new Error('Usuário não encontrado');
  }
  
  // Verificar se o usuário está conectado ao Meta
  if (user.metaConnectionStatus !== 'connected' || !user.metaAccessToken) {
    return res.json({
      connected: false,
      message: 'Usuário não está conectado ao Meta'
    });
  }
  
  // Verificar se o token expirou
  if (user.metaTokenExpires && user.metaTokenExpires < Date.now()) {
    return res.json({
      connected: false,
      message: 'Token do Meta expirou'
    });
  }
  
  try {
    // Verificar se o token ainda é válido
    const response = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${user.metaAccessToken}`);
    const data = await response.json();
    
    if (data.error) {
      // Atualizar status de conexão
      user.metaConnectionStatus = 'disconnected';
      await user.save();
      
      return res.json({
        connected: false,
        message: `Erro na verificação: ${data.error.message}`
      });
    }
    
    // Token válido
    return res.json({
      connected: true,
      metaId: user.metaId,
      adAccounts: user.metaAdAccounts || [],
      pages: user.metaPages || []
    });
  } catch (error) {
    console.error('Erro ao verificar conexão:', error);
    return res.json({
      connected: false,
      message: `Erro ao verificar conexão: ${error.message}`
    });
  }
});

// @desc    Criar anúncio a partir de post do Facebook
// @route   POST /api/meta/create-ad-from-post
// @access  Private
const createAdFromPost = asyncHandler(async (req, res) => {
  try {
    console.log("Dados recebidos do frontend:", req.body);
    
    // Mapear campos do frontend (em português) para os campos esperados pelo backend (em inglês)
    const postUrl = req.body.postUrl || req.body.linkPublicacao || req.body.linkPost;
    const campaignName = req.body.campaignName || req.body.nome;
    const dailyBudget = req.body.dailyBudget || req.body.orcamento;
    const startDate = req.body.startDate || req.body.dataInicio;
    const endDate = req.body.endDate || req.body.dataTermino || req.body.dataFim;
    const targetCountry = req.body.targetCountry || req.body.pais || "BR";
    const adTitle = req.body.adTitle || req.body.titulo;
    const adDescription = req.body.adDescription || req.body.descricao;
    const callToAction = req.body.callToAction || req.body.cta || req.body.botaoAcao;
    const radius = req.body.radius || req.body.raio;
    
    console.log("Campos mapeados:", { postUrl, campaignName, dailyBudget, startDate, endDate, targetCountry, radius });
    
    // Validar campos obrigatórios
    if (!postUrl) {
      return res.status(400).json({
        success: false,
        message: "URL da publicação é obrigatória para anúncios do tipo 'post'"
      });
    }
    
    if (!campaignName) {
      return res.status(400).json({
        success: false,
        message: "Nome da campanha é obrigatório"
      });
    }
    
    if (!dailyBudget) {
      return res.status(400).json({
        success: false,
        message: "Orçamento diário é obrigatório"
      });
    }
    
    if (!startDate) {
      return res.status(400).json({
        success: false,
        message: "Data de início é obrigatória"
      });
    }
    
    // Função auxiliar para extrair ID do post da URL
    const extractPostIdFromUrl = (url) => {
      // Padrão para URLs de posts do Facebook
      // https://www.facebook.com/username/posts/123456789
      // https://www.facebook.com/groups/groupname/posts/123456789
      // https://www.facebook.com/permalink.php?story_fbid=123456789&id=987654321
      
      let postId = null;
      
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const searchParams = urlObj.searchParams;
        
        if (pathname.includes('/posts/')) {
          // Formato: /username/posts/123456789 ou /groups/groupname/posts/123456789
          const parts = pathname.split('/posts/');
          if (parts.length > 1) {
            postId = parts[1].split('/')[0];
          }
        } else if (pathname.includes('/permalink.php')) {
          // Formato: /permalink.php?story_fbid=123456789&id=987654321
          const storyFbId = searchParams.get('story_fbid');
          const pageId = searchParams.get('id');
          
          if (storyFbId && pageId) {
            postId = `${pageId}_${storyFbId}`;
          }
        }
      } catch (error) {
        console.error('Erro ao extrair ID do post:', error);
      }
      
      return postId;
    };
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuário não encontrado"
      });
    }
    
    // Verificar se o usuário está conectado ao Meta
    if (user.metaConnectionStatus !== "connected" || !user.metaAccessToken) {
      return res.status(400).json({
        success: false,
        message: "Você precisa conectar sua conta ao Meta Ads primeiro"
      });
    }
    
    // Verificar se o token expirou
    if (user.metaTokenExpires && user.metaTokenExpires < Date.now()) {
      return res.status(401).json({
        success: false,
        message: "Seu token do Meta expirou. Por favor, reconecte sua conta."
      });
    }
    
    // Verificar se há conta de anúncios disponível
    if (!user.metaAdAccounts || user.metaAdAccounts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nenhuma conta de anúncios encontrada. Por favor, reconecte sua conta Meta."
      });
    }
    
    // Extrair ID da publicação da URL
    const postId = extractPostIdFromUrl(postUrl);
    
    console.log(`Post ID extraído: ${postId}`);
    
    // Usar a conta de anúncios principal se disponível, ou selecionar a primeira ativa, ou a primeira da lista
    let adAccountId;
    if (user.metaPrimaryAdAccountId) {
      adAccountId = user.metaPrimaryAdAccountId;
      console.log(`Usando conta de anúncios principal: ${adAccountId}`);
    } else {
      const adAccount = user.metaAdAccounts.find(account => account.status === 1) || user.metaAdAccounts[0];
      adAccountId = adAccount.id;
      console.log(`Usando conta de anúncios alternativa: ${adAccountId}`);
    }
    
    // Verificar se temos um token de acesso válido
    if (!user.metaAccessToken) {
      return res.status(400).json({
        success: false,
        message: "Token de acesso Meta não encontrado"
      });
    }
    
    // Verificar se temos um ID de usuário Meta válido
    if (!user.metaId) {
      return res.status(400).json({
        success: false,
        message: "ID de usuário Meta não encontrado"
      });
    }
    
    // Registrar no log para debug
    console.log(`Creating ad using account ID: ${adAccountId} for user ${user._id} (Meta ID: ${user.metaId})`);
    
    // Criar campanha
    const campaignResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/campaigns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `${campaignName} - Campanha`,
        objective: "TRAFFIC",
        status: "ACTIVE",
        special_ad_categories: [],
        access_token: user.metaAccessToken,
      }),
    });
    
    const campaignData = await campaignResponse.json();
    
    if (campaignData.error) {
      return res.status(400).json({
        success: false,
        message: `Erro ao criar campanha: ${campaignData.error.message}`
      });
    }
    
    // Criar conjunto de anúncios
    const adSetResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/adsets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `${campaignName} - Conjunto`,
        campaign_id: campaignData.id,
        daily_budget: parseFloat(dailyBudget) * 100, // Em centavos
        bid_strategy: "LOWEST_COST",
        billing_event: "IMPRESSIONS",
        optimization_goal: "LINK_CLICKS",
        targeting: {
          geo_locations: {
            countries: [targetCountry || "BR"],
          },
          // Público amplo sem segmentação detalhada
          age_min: 18,
          age_max: 65,
        },
        status: "ACTIVE",
        start_time: new Date(startDate).toISOString(),
        end_time: endDate ? new Date(endDate).toISOString() : null,
        // Posicionamento automático em todas as plataformas
        publisher_platforms: ["facebook", "instagram", "messenger", "audience_network"],
        access_token: user.metaAccessToken,
      }),
    });
    
    const adSetData = await adSetResponse.json();
    
    if (adSetData.error) {
      return res.status(400).json({
        success: false,
        message: `Erro ao criar conjunto de anúncios: ${adSetData.error.message}`
      });
    }
    
    // Criar anúncio
    const adResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/ads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: campaignName,
        adset_id: adSetData.id,
        creative: {
          object_story_id: postId,
        },
        status: "ACTIVE",
        access_token: user.metaAccessToken,
      }),
    });
    
    const adData = await adResponse.json();
    
    if (adData.error) {
      return res.status(400).json({
        success: false,
        message: `Erro ao criar anúncio: ${adData.error.message}`
      });
    }
    
    // Obter link de preview do anúncio
    const previewResponse = await fetch(`https://graph.facebook.com/v18.0/${adData.id}/previews?ad_format=DESKTOP_FEED_STANDARD&access_token=${user.metaAccessToken}`);
    const previewData = await previewResponse.json();
    
    let previewUrl = null;
    if (previewData && previewData.data && previewData.data.length > 0) {
      previewUrl = previewData.data[0].body;
    }
    
    // Retornar detalhes do anúncio criado
    res.status(201).json({
      success: true,
      message: "Anúncio criado com sucesso",
      adDetails: {
        name: campaignName,
        campaignId: campaignData.id,
        adSetId: adSetData.id,
        adId: adData.id,
        status: "ACTIVE",
        dailyBudget: parseFloat(dailyBudget),
        startDate,
        endDate,
        targetCountry: targetCountry || "BR",
        postId,
        adAccountId: adAccountId,
        previewUrl: previewUrl
      },
    });
  } catch (error) {
    console.error("Erro ao criar anúncio:", error);
    res.status(500).json({
      success: false,
      message: `Erro ao criar anúncio: ${error.message}`
    });
  }
});

// @desc    Criar anúncio a partir de upload de imagem
// @route   POST /api/meta/create-from-image
// @access  Private
const createAdFromImage = asyncHandler(async (req, res) => {
  try {
    console.log("Dados recebidos do frontend:", req.body);
    
    // Mapear campos do frontend (em português) para os campos esperados pelo backend (em inglês)
    const campaignName = req.body.campaignName || req.body.nome;
    const dailyBudget = req.body.dailyBudget || req.body.orcamento;
    const startDate = req.body.startDate || req.body.dataInicio;
    const endDate = req.body.endDate || req.body.dataTermino || req.body.dataFim;
    const targetCountry = req.body.targetCountry || req.body.pais || "BR";
    const adTitle = req.body.adTitle || req.body.titulo;
    const adDescription = req.body.adDescription || req.body.descricao;
    const callToAction = req.body.callToAction || req.body.cta || req.body.botaoAcao;
    const menuUrl = req.body.menuUrl || req.body.linkCardapio || req.body.linkSite;
    
    console.log("Campos mapeados:", { campaignName, dailyBudget, startDate, endDate, targetCountry, menuUrl });
    
    // Validar campos obrigatórios
    if (!campaignName) {
      return res.status(400).json({
        success: false,
        message: "Nome da campanha é obrigatório"
      });
    }
    
    if (!dailyBudget) {
      return res.status(400).json({
        success: false,
        message: "Orçamento diário é obrigatório"
      });
    }
    
    if (!startDate) {
      return res.status(400).json({
        success: false,
        message: "Data de início é obrigatória"
      });
    }
    
    if (!menuUrl) {
      return res.status(400).json({
        success: false,
        message: "Link do cardápio/site é obrigatório"
      });
    }
    
    if (!callToAction) {
      return res.status(400).json({
        success: false,
        message: "Botão de ação (CTA) é obrigatório"
      });
    }
    
    // Verificar se há imagem ou texto
    if (!req.file && !adDescription) {
      return res.status(400).json({
        success: false,
        message: "É necessário fornecer uma imagem ou texto para o anúncio"
      });
    }
    
    // Buscar usuário
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuário não encontrado"
      });
    }
    
    // Verificar se o usuário está conectado ao Meta
    if (user.metaConnectionStatus !== "connected" || !user.metaAccessToken) {
      return res.status(400).json({
        success: false,
        message: "Você precisa conectar sua conta ao Meta Ads primeiro"
      });
    }
    
    // Verificar se o token expirou
    if (user.metaTokenExpires && user.metaTokenExpires < Date.now()) {
      return res.status(401).json({
        success: false,
        message: "Seu token do Meta expirou. Por favor, reconecte sua conta."
      });
    }
    
    // Verificar se há conta de anúncios disponível
    if (!user.metaAdAccounts || user.metaAdAccounts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nenhuma conta de anúncios encontrada. Por favor, reconecte sua conta Meta."
      });
    }
    
    // Usar a conta de anúncios principal se disponível, ou selecionar a primeira ativa, ou a primeira da lista
    let adAccountId;
    if (user.metaPrimaryAdAccountId) {
      adAccountId = user.metaPrimaryAdAccountId;
      console.log(`Usando conta de anúncios principal: ${adAccountId}`);
    } else {
      const adAccount = user.metaAdAccounts.find(account => account.status === 1) || user.metaAdAccounts[0];
      adAccountId = adAccount.id;
      console.log(`Usando conta de anúncios alternativa: ${adAccountId}`);
    }
    
    // Verificar se temos um token de acesso válido
    if (!user.metaAccessToken) {
      return res.status(400).json({
        success: false,
        message: "Token de acesso Meta não encontrado"
      });
    }
    
    // Verificar se temos um ID de usuário Meta válido
    if (!user.metaId) {
      return res.status(400).json({
        success: false,
        message: "ID de usuário Meta não encontrado"
      });
    }
    
    // Registrar no log para debug
    console.log(`Creating ad using account ID: ${adAccountId} for user ${user._id} (Meta ID: ${user.metaId})`);
    
    // Criar campanha
    const campaignResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/campaigns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `${campaignName} - Campanha`,
        objective: "TRAFFIC",
        status: "ACTIVE",
        special_ad_categories: [],
        access_token: user.metaAccessToken,
      }),
    });
    
    const campaignData = await campaignResponse.json();
    
    if (campaignData.error) {
      return res.status(400).json({
        success: false,
        message: `Erro ao criar campanha: ${campaignData.error.message}`
      });
    }
    
    // Criar conjunto de anúncios
    const adSetResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/adsets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `${campaignName} - Conjunto`,
        campaign_id: campaignData.id,
        daily_budget: parseFloat(dailyBudget) * 100, // Em centavos
        bid_strategy: "LOWEST_COST",
        billing_event: "IMPRESSIONS",
        optimization_goal: "LINK_CLICKS",
        targeting: {
          geo_locations: {
            countries: [targetCountry || "BR"],
          },
          // Público amplo sem segmentação detalhada
          age_min: 18,
          age_max: 65,
        },
        status: "ACTIVE",
        start_time: new Date(startDate).toISOString(),
        end_time: endDate ? new Date(endDate).toISOString() : null,
        // Posicionamento automático em todas as plataformas
        publisher_platforms: ["facebook", "instagram", "messenger", "audience_network"],
        access_token: user.metaAccessToken,
      }),
    });
    
    const adSetData = await adSetResponse.json();
    
    if (adSetData.error) {
      return res.status(400).json({
        success: false,
        message: `Erro ao criar conjunto de anúncios: ${adSetData.error.message}`
      });
    }
    
    let imageHash;
    let imageUrl;
    
    // Processar imagem se existir
    if (req.file) {
      const imageBuffer = req.file.buffer;
      const imageBase64 = imageBuffer.toString('base64');
      
      // Fazer upload da imagem para o Meta
      const imageUploadResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/adimages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bytes: imageBase64,
          access_token: user.metaAccessToken,
        }),
      });
      
      const imageUploadData = await imageUploadResponse.json();
      
      if (imageUploadData.error) {
        return res.status(400).json({
          success: false,
          message: `Erro ao fazer upload da imagem: ${imageUploadData.error.message}`
        });
      }
      
      // Extrair hash da imagem
      const images = imageUploadData.images || {};
      const firstImage = Object.values(images)[0];
      
      if (!firstImage || !firstImage.hash) {
        return res.status(400).json({
          success: false,
          message: "Não foi possível obter o hash da imagem"
        });
      }
      
      imageHash = firstImage.hash;
      imageUrl = firstImage.url;
      console.log(`Image hash: ${imageHash}`);
    }
    
    // Criar anúncio
    const adCreativeResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/adcreatives`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: campaignName,
        object_story_spec: {
          page_id: user.metaPageId,
          link_data: {
            message: adDescription || `Confira nosso cardápio e faça seu pedido!`,
            link: menuUrl,
            name: adTitle || campaignName,
            call_to_action: {
              type: callToAction,
            },
            image_hash: imageHash,
          },
        },
        access_token: user.metaAccessToken,
      }),
    });
    
    const adCreativeData = await adCreativeResponse.json();
    
    if (adCreativeData.error) {
      return res.status(400).json({
        success: false,
        message: `Erro ao criar criativo do anúncio: ${adCreativeData.error.message}`
      });
    }
    
    // Criar anúncio final
    const adResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/ads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: campaignName,
        adset_id: adSetData.id,
        creative: {
          creative_id: adCreativeData.id,
        },
        status: "ACTIVE",
        access_token: user.metaAccessToken,
      }),
    });
    
    const adData = await adResponse.json();
    
    if (adData.error) {
      return res.status(400).json({
        success: false,
        message: `Erro ao criar anúncio: ${adData.error.message}`
      });
    }
    
    // Obter link de preview do anúncio
    const previewResponse = await fetch(`https://graph.facebook.com/v18.0/${adData.id}/previews?ad_format=DESKTOP_FEED_STANDARD&access_token=${user.metaAccessToken}`);
    const previewData = await previewResponse.json();
    
    let previewUrl = null;
    if (previewData && previewData.data && previewData.data.length > 0) {
      previewUrl = previewData.data[0].body;
    }
    
    // Retornar detalhes do anúncio criado
    res.status(201).json({
      success: true,
      message: "Anúncio com imagem criado com sucesso",
      adDetails: {
        name: campaignName,
        campaignId: campaignData.id,
        adSetId: adSetData.id,
        adId: adData.id,
        adCreativeId: adCreativeData.id,
        status: "ACTIVE",
        dailyBudget: parseFloat(dailyBudget),
        startDate,
        endDate,
        targetCountry: targetCountry || "BR",
        imageUrl: imageUrl,
        previewUrl: previewUrl,
        menuUrl: menuUrl
      },
    });
  } catch (error) {
    console.error("Erro ao criar anúncio com imagem:", error);
    res.status(500).json({
      success: false,
      message: `Erro ao criar anúncio: ${error.message}`
    });
  }
});

// @desc    Obter campanhas do usuário
// @route   GET /api/meta/campaigns
// @access  Private
const getCampaigns = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (!user) {
    res.status(404);
    throw new Error("Usuário não encontrado");
  }
  
  // Verificar se o usuário está conectado ao Meta
  if (user.metaConnectionStatus !== "connected" || !user.metaAccessToken) {
    res.status(400);
    throw new Error("Você precisa conectar sua conta ao Meta Ads primeiro");
  }
  
  // Verificar se o token expirou
  if (user.metaTokenExpires && user.metaTokenExpires < Date.now()) {
    res.status(401);
    throw new Error("Seu token do Meta expirou. Por favor, reconecte sua conta.");
  }
  
  // Verificar se há conta de anúncios disponível
  if (!user.metaAdAccounts || user.metaAdAccounts.length === 0) {
    res.status(400);
    throw new Error("Nenhuma conta de anúncios encontrada. Por favor, reconecte sua conta Meta.");
  }
  
  try {
    // Usar a conta de anúncios principal se disponível, ou selecionar a primeira ativa, ou a primeira da lista
    let adAccountId;
    if (user.metaPrimaryAdAccountId) {
      adAccountId = user.metaPrimaryAdAccountId;
    } else {
      const adAccount = user.metaAdAccounts.find(account => account.status === 1) || user.metaAdAccounts[0];
      adAccountId = adAccount.id;
    }
    
    // Obter campanhas
    const campaignsResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/campaigns?fields=id,name,status,objective,created_time,updated_time&access_token=${user.metaAccessToken}`, {
      method: "GET",
    });
    
    const campaignsData = await campaignsResponse.json();
    
    if (campaignsData.error) {
      throw new Error(`Erro ao obter campanhas: ${campaignsData.error.message}`);
    }
    
    // Obter conjuntos de anúncios
    const adSetsResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/adsets?fields=id,name,campaign_id,status,daily_budget,targeting,start_time,end_time&access_token=${user.metaAccessToken}`, {
      method: "GET",
    });
    
    const adSetsData = await adSetsResponse.json();
    
    if (adSetsData.error) {
      throw new Error(`Erro ao obter conjuntos de anúncios: ${adSetsData.error.message}`);
    }
    
    // Obter anúncios
    const adsResponse = await fetch(`https://graph.facebook.com/v18.0/${adAccountId}/ads?fields=id,name,adset_id,status,creative{id,image_url,thumbnail_url,object_story_spec}&preview_shareable_link&access_token=${user.metaAccessToken}`, {
      method: "GET",
    });
    
    const adsData = await adsResponse.json();
    
    if (adsData.error) {
      throw new Error(`Erro ao obter anúncios: ${adsData.error.message}`);
    }
    
    // Mapear dados para formato mais amigável
    const campaigns = campaignsData.data.map(campaign => {
      // Encontrar conjuntos de anúncios desta campanha
      const adSets = adSetsData.data.filter(adSet => adSet.campaign_id === campaign.id);
      
      // Para cada conjunto, encontrar os anúncios
      const adSetsWithAds = adSets.map(adSet => {
        const ads = adsData.data.filter(ad => ad.adset_id === adSet.id);
        
        return {
          ...adSet,
          ads: ads.map(ad => {
            // Extrair URL da imagem do anúncio, se disponível
            let imageUrl = null;
            let previewUrl = null;
            
            if (ad.creative && ad.creative.image_url) {
              imageUrl = ad.creative.image_url;
            } else if (ad.creative && ad.creative.thumbnail_url) {
              imageUrl = ad.creative.thumbnail_url;
            }
            
            if (ad.preview_shareable_link) {
              previewUrl = ad.preview_shareable_link;
            }
            
            return {
              ...ad,
              imageUrl,
              previewUrl
            };
          })
        };
      });
      
      // Calcular orçamento diário total da campanha
      const totalDailyBudget = adSets.reduce((total, adSet) => {
        return total + (adSet.daily_budget ? parseFloat(adSet.daily_budget) / 100 : 0); // Converter de centavos para reais
      }, 0);
      
      // Encontrar datas de início e fim
      let startDate = null;
      let endDate = null;
      
      if (adSets.length > 0) {
        // Usar a data mais antiga como início
        startDate = adSets.reduce((earliest, adSet) => {
          if (!adSet.start_time) return earliest;
          const date = new Date(adSet.start_time);
          return !earliest || date < earliest ? date : earliest;
        }, null);
        
        // Usar a data mais recente como fim (se houver)
        endDate = adSets.reduce((latest, adSet) => {
          if (!adSet.end_time) return latest;
          const date = new Date(adSet.end_time);
          return !latest || date > latest ? date : latest;
        }, null);
      }
      
      // Encontrar imagem do primeiro anúncio (se houver)
      let firstAdImageUrl = null;
      let firstAdPreviewUrl = null;
      
      for (const adSet of adSetsWithAds) {
        if (adSet.ads && adSet.ads.length > 0) {
          const firstAd = adSet.ads[0];
          if (firstAd.imageUrl) {
            firstAdImageUrl = firstAd.imageUrl;
          }
          if (firstAd.previewUrl) {
            firstAdPreviewUrl = firstAd.previewUrl;
          }
          if (firstAdImageUrl && firstAdPreviewUrl) break;
        }
      }
      
      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        objective: campaign.objective,
        createdTime: campaign.created_time,
        updatedTime: campaign.updated_time,
        dailyBudget: totalDailyBudget,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
        adSets: adSetsWithAds,
        imageUrl: firstAdImageUrl,
        previewUrl: firstAdPreviewUrl
      };
    });
    
    res.json(campaigns);
  } catch (error) {
    console.error("Erro ao obter campanhas:", error);
    res.status(500);
    throw new Error("Erro ao obter campanhas: " + error.message);
  }
});

// @desc    Obter métricas do Meta Ads
// @route   GET /api/meta/metrics
// @access  Private
const getMetrics = asyncHandler(async (req, res) => {
  const { timeRange = 'last_30_days' } = req.query;
  
  const user = await User.findById(req.user._id);
  
  if (!user) {
    res.status(404);
    throw new Error("Usuário não encontrado");
  }
  
  // Verificar se o usuário está conectado ao Meta
  if (user.metaConnectionStatus !== "connected" || !user.metaAccessToken) {
    res.status(400);
    throw new Error("Você precisa conectar sua conta ao Meta Ads primeiro");
  }
  
  // Verificar se o token expirou
  if (user.metaTokenExpires && user.metaTokenExpires < Date.now()) {
    res.status(401);
    throw new Error("Seu token do Meta expirou. Por favor, reconecte sua conta.");
  }
  
  // Verificar se há conta de anúncios disponível
  if (!user.metaAdAccounts || user.metaAdAccounts.length === 0) {
    res.status(400);
    throw new Error("Nenhuma conta de anúncios encontrada. Por favor, reconecte sua conta Meta.");
  }
  
  try {
    // Usar a conta de anúncios principal se disponível, ou selecionar a primeira ativa, ou a primeira da lista
    let adAccountId;
    if (user.metaPrimaryAdAccountId) {
      adAccountId = user.metaPrimaryAdAccountId;
    } else {
      const adAccount = user.metaAdAccounts.find(account => account.status === 1) || user.metaAdAccounts[0];
      adAccountId = adAccount.id;
    }
    
    // Calcular datas com base no timeRange
    let since, until;
    const now = new Date();
    until = now.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    
    switch (timeRange) {
      case 'today':
        since = until;
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        since = yesterday.toISOString().split('T')[0];
        until = since;
        break;
      case 'last_7_days':
        const last7Days = new Date(now);
        last7Days.setDate(last7Days.getDate() - 7);
        since = last7Days.toISOString().split('T')[0];
        break;
      case 'this_month':
        since = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;
        break;
      case 'last_month':
        const lastMonth = new Date(now);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        since = `${lastMonth.getFullYear()}-${(lastMonth.getMonth() + 1).toString().padStart(2, '0')}-01`;
        const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        until = lastDayOfLastMonth.toISOString().split('T')[0];
        break;
      case 'last_30_days':
      default:
        const last30Days = new Date(now);
        last30Days.setDate(last30Days.getDate() - 30);
        since = last30Days.toISOString().split('T')[0];
        break;
    }
    
    // Obter métricas
    const metrics = await getMetricsAsync(adAccountId, since, until, user.metaAccessToken);
    
    // Calcular totais
    const totals = metrics.reduce(
      (acc, curr) => {
        acc.spend += parseFloat(curr.spend || 0);
        acc.impressions += parseInt(curr.impressions || 0);
        acc.clicks += parseInt(curr.clicks || 0);
        acc.reach += parseInt(curr.reach || 0);
        return acc;
      },
      { spend: 0, impressions: 0, clicks: 0, reach: 0 }
    );
    
    // Calcular métricas derivadas
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    
    res.json({
      timeRange,
      period: {
        since,
        until
      },
      metrics: {
        spend: totals.spend.toFixed(2),
        impressions: totals.impressions,
        clicks: totals.clicks,
        reach: totals.reach,
        ctr: ctr.toFixed(2),
        cpc: cpc.toFixed(2)
      },
      rawData: metrics
    });
  } catch (error) {
    console.error("Erro ao obter métricas:", error);
    res.status(500).json({
      success: false,
      message: `Erro ao obter métricas: ${error.message}`
    });
  }
});

// @desc    Pausar uma campanha
// @route   POST /api/meta/pause-campaign
// @access  Private
const pauseCampaign = asyncHandler(async (req, res) => {
  const { campaignId } = req.body;
  
  if (!campaignId) {
    return res.status(400).json({
      success: false,
      message: "ID da campanha é obrigatório"
    });
  }
  
  const user = await User.findById(req.user._id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Usuário não encontrado"
    });
  }
  
  // Verificar se o usuário está conectado ao Meta
  if (user.metaConnectionStatus !== "connected" || !user.metaAccessToken) {
    return res.status(400).json({
      success: false,
      message: "Você precisa conectar sua conta ao Meta Ads primeiro"
    });
  }
  
  // Verificar se o token expirou
  if (user.metaTokenExpires && user.metaTokenExpires < Date.now()) {
    return res.status(401).json({
      success: false,
      message: "Seu token do Meta expirou. Por favor, reconecte sua conta."
    });
  }
  
  try {
    // Pausar a campanha
    const response = await fetch(`https://graph.facebook.com/v18.0/${campaignId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "PAUSED",
        access_token: user.metaAccessToken,
      }),
    });
    
    const data = await response.json();
    
    if (data.error) {
      return res.status(400).json({
        success: false,
        message: `Erro ao pausar campanha: ${data.error.message}`
      });
    }
    
    res.json({
      success: true,
      message: "Campanha pausada com sucesso",
      campaignId
    });
  } catch (error) {
    console.error("Erro ao pausar campanha:", error);
    res.status(500).json({
      success: false,
      message: `Erro ao pausar campanha: ${error.message}`
    });
  }
});

// Exportar todas as funções do controlador
module.exports = {
  facebookLogin,
  facebookCallback,
  getConnectionStatus,
  verifyConnection,
  createAdFromPost,
  createAdFromImage,
  getCampaigns,
  getMetrics,
  pauseCampaign
};
