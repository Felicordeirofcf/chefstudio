const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configurações da API do Meta
const META_API_VERSION = 'v18.0'; // Usar a versão mais recente da API
const META_API_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Armazenamento em memória para campanhas criadas (backup local)
const campaignsStore = {};

// Objetivos válidos para campanhas do Meta Ads
const VALID_OBJECTIVES = [
    'LINK_CLICKS',
    'OUTCOME_TRAFFIC',
    'POST_ENGAGEMENT',
    'LEAD_GENERATION',
    'CONVERSIONS',
    'OUTCOME_AWARENESS',
    'OUTCOME_ENGAGEMENT',
    'OUTCOME_LEADS',
    'OUTCOME_SALES',
    'REACH',
    'BRAND_AWARENESS',
    'VIDEO_VIEWS',
    'APP_INSTALLS',
    'MESSAGES'
];

// Valores válidos para Call to Action
const VALID_CTA_TYPES = [
    'LEARN_MORE',
    'SHOP_NOW',
    'BOOK_TRAVEL',
    'CONTACT_US',
    'DONATE_NOW',
    'SIGN_UP',
    'DOWNLOAD',
    'GET_OFFER',
    'GET_DIRECTIONS',
    'OPEN_LINK',
    'MESSAGE_PAGE',
    'LIKE_PAGE',
    'CALL_NOW',
    'APPLY_NOW',
    'BUY_NOW',
    'GET_QUOTE',
    'SUBSCRIBE'
];

// Objetivo padrão para campanhas de tráfego - FIXADO para OUTCOME_TRAFFIC
const DEFAULT_TRAFFIC_OBJECTIVE = 'OUTCOME_TRAFFIC';

// CTA padrão
const DEFAULT_CTA = 'LEARN_MORE';

/**
 * Função auxiliar para obter o token Meta do usuário
 * @param {object} user - Objeto do usuário autenticado
 * @returns {string|null} - Token de acesso Meta ou null se não encontrado
 */
const getUserMetaToken = (user) => {
    // Verificar ambos os campos para compatibilidade
    return user.metaAccessToken || user.facebookAccessToken || null;
};

/**
 * Valida se o objetivo da campanha é aceito pela API do Meta
 * @param {string} objective - Objetivo da campanha
 * @returns {boolean} - True se o objetivo é válido, false caso contrário
 */
const isValidObjective = (objective) => {
    return VALID_OBJECTIVES.includes(objective);
};

/**
 * Valida se o tipo de CTA é aceito pela API do Meta
 * @param {string} ctaType - Tipo de Call to Action
 * @returns {boolean} - True se o CTA é válido, false caso contrário
 */
const isValidCTA = (ctaType) => {
    return VALID_CTA_TYPES.includes(ctaType);
};

/**
 * Valida se uma URL é acessível
 * @param {string} url - URL a ser validada
 * @returns {Promise<boolean>} - True se a URL é acessível, false caso contrário
 */
const isUrlAccessible = async (url) => {
    try {
        const response = await axios.head(url, { timeout: 5000 });
        return response.status >= 200 && response.status < 400;
    } catch (error) {
        console.error(`URL não acessível: ${url}`, error.message);
        return false;
    }
};

/**
 * Extrai page_id e post_id de diferentes formatos de URL do Facebook
 * @param {string} url - URL da publicação do Facebook
 * @param {string} defaultPageId - ID da página padrão (opcional)
 * @returns {object} - Objeto com pageId e postId extraídos, ou null se não for possível extrair
 */
const extractFacebookPostIds = (url, defaultPageId = null) => {
    if (!url) return null;
    
    try {
        // Formato 1: facebook.com/{page_id}/posts/{post_id}
        const postsRegex = /facebook\.com\/(\d+)\/posts\/(\d+)/;
        const postsMatch = url.match(postsRegex);
        
        if (postsMatch) {
            return {
                pageId: postsMatch[1],
                postId: postsMatch[2]
            };
        }
        
        // Formato 2: permalink.php?story_fbid={post_id}&id={page_id}
        if (url.includes('/permalink.php')) {
            const urlObj = new URL(url);
            const storyFbid = urlObj.searchParams.get('story_fbid');
            const pageId = urlObj.searchParams.get('id');
            
            if (storyFbid && pageId) {
                return {
                    pageId: pageId,
                    postId: storyFbid
                };
            }
        }
        
        // Formato 3: photo.php?fbid={post_id}&set=a.{album_id}&id={page_id}
        if (url.includes('/photo.php') || url.includes('/photo')) {
            const urlObj = new URL(url);
            const fbid = urlObj.searchParams.get('fbid');
            let pageId = urlObj.searchParams.get('id');
            
            // Se não tiver id explícito, tentar extrair de outros parâmetros ou usar o padrão
            if (!pageId) {
                // Tentar extrair do set
                const set = urlObj.searchParams.get('set');
                if (set) {
                    const setMatch = set.match(/a\.(\d+)/);
                    if (setMatch) {
                        pageId = setMatch[1];
                    }
                }
                
                // Se ainda não tiver pageId, usar o padrão
                if (!pageId && defaultPageId) {
                    pageId = defaultPageId;
                }
            }
            
            if (fbid && pageId) {
                return {
                    pageId: pageId,
                    postId: fbid
                };
            }
        }
        
        // Formato 4: share/p/{hash}
        if (url.includes('/share/p/')) {
            const pathParts = url.split('/');
            const hash = pathParts[pathParts.length - 1];
            
            if (hash && defaultPageId) {
                return {
                    pageId: defaultPageId,
                    postId: hash
                };
            }
        }
        
        // Formato 5: pfbid0{hash} em qualquer parte do URL
        const pfbidMatch = url.match(/pfbid0([a-zA-Z0-9]+)/);
        if (pfbidMatch && defaultPageId) {
            return {
                pageId: defaultPageId,
                postId: `pfbid0${pfbidMatch[1]}` // Incluir o prefixo pfbid0 no postId
            };
        }
        
        // Formato 6: facebook.com/{username}/posts/{post_id} (username não numérico)
        const usernamePostsMatch = url.match(/facebook\.com\/([^\/]+)\/posts\/(\d+)/);
        if (usernamePostsMatch && !/^\d+$/.test(usernamePostsMatch[1]) && defaultPageId) {
            return {
                pageId: defaultPageId,
                postId: usernamePostsMatch[2]
            };
        }
        
        // Não foi possível extrair os IDs
        return null;
    } catch (error) {
        console.error('Erro ao extrair IDs da URL do Facebook:', error);
        return null;
    }
};

/**
 * Converte um pfbid para um object_story_id completo usando a Graph API
 * @param {string} pfbid - ID da publicação no formato pfbid
 * @param {string} pageId - ID da página
 * @param {string} accessToken - Token de acesso do usuário
 * @returns {Promise<string>} - object_story_id no formato correto ou null se não for possível converter
 */
const convertPfbidToObjectStoryId = async (pfbid, pageId, accessToken) => {
    try {
        console.log(`Convertendo pfbid para object_story_id: ${pfbid}`);
        
        // Verificar se o pfbid já está no formato correto
        if (!pfbid.startsWith('pfbid')) {
            // Se não for um pfbid, retornar o object_story_id montado diretamente
            return `${pageId}_${pfbid}`;
        }
        
        // Fazer requisição à Graph API para obter o ID real da publicação
        const response = await axios.get(`${META_API_BASE_URL}/${pfbid}`, {
            params: {
                fields: 'id',
                access_token: accessToken
            }
        });
        
        if (response.data && response.data.id) {
            console.log(`✅ Conversão de pfbid bem-sucedida: ${pfbid} -> ${response.data.id}`);
            return response.data.id; // Retorna o ID completo no formato {page_id}_{post_id}
        } else {
            console.error(`❌ Erro: Resposta da API não contém ID para o pfbid ${pfbid}`);
            throw new Error(`Não foi possível obter o ID da publicação para o pfbid ${pfbid}`);
        }
    } catch (error) {
        console.error(`❌ Erro ao converter pfbid para object_story_id:`, error.response?.data || error.message);
        
        if (error.response?.data?.error?.code === 100) {
            // Erro específico de publicação não encontrada ou sem permissão
            throw new Error(`A publicação com ID ${pfbid} não foi encontrada ou não está acessível. Verifique se a publicação existe e está definida como pública.`);
        }
        
        // Tentar montar o object_story_id diretamente como fallback
        console.log(`⚠️ Tentando fallback: montar object_story_id diretamente com pageId e pfbid`);
        return `${pageId}_${pfbid}`;
    }
};

/**
 * Cria uma campanha no Meta Ads
 * @param {string} userAccessToken - Token de acesso do usuário Meta
 * @param {string} adAccountId - ID da conta de anúncios
 * @param {object} campaignData - Dados da campanha
 * @returns {Promise<object>} - Objeto com os dados da campanha criada
 */
const createCampaign = async (userAccessToken, adAccountId, campaignData) => {
    try {
        console.log(`Criando campanha real no Meta Ads para conta ${adAccountId}`);
        
        // Sempre usar o objetivo fixo OUTCOME_TRAFFIC, ignorando qualquer valor recebido
        const objective = DEFAULT_TRAFFIC_OBJECTIVE;
        console.log(`Usando objetivo fixo: ${objective}`);
        
        const response = await axios.post(
            `${META_API_BASE_URL}/${adAccountId}/campaigns`,
            {
                name: campaignData.name,
                objective: objective,
                status: 'ACTIVE',
                special_ad_categories: '[]',
                access_token: userAccessToken // Usar token do usuário
            }
        );
        console.log('Campanha criada com sucesso:', response.data);
        return response.data;
    } catch (error) {
        console.error('Erro ao criar campanha no Meta Ads:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Detalhes do erro:', JSON.stringify(error.response.data));
        }
        throw error;
    }
};

/**
 * Cria um conjunto de anúncios (Ad Set) no Meta Ads
 * @param {string} userAccessToken - Token de acesso do usuário Meta
 * @param {string} adAccountId - ID da conta de anúncios
 * @param {string} campaignId - ID da campanha
 * @param {object} adSetData - Dados do conjunto de anúncios
 * @returns {Promise<object>} - Objeto com os dados do conjunto de anúncios criado
 */
const createAdSet = async (userAccessToken, adAccountId, campaignId, adSetData) => {
    try {
        console.log(`Criando ad set real no Meta Ads para campanha ${campaignId}`);
        const dailyBudget = Math.round(adSetData.weeklyBudget / 7 * 100); // Converter para centavos
        const response = await axios.post(
            `${META_API_BASE_URL}/${adAccountId}/adsets`,
            {
                name: `${adSetData.name} - AdSet`,
                campaign_id: campaignId,
                daily_budget: dailyBudget,
                bid_amount: 1000, // 10 USD em centavos
                billing_event: 'IMPRESSIONS',
                optimization_goal: 'LINK_CLICKS',
                targeting: {
                    geo_locations: {
                        custom_locations: [
                            {
                                latitude: adSetData.location.latitude,
                                longitude: adSetData.location.longitude,
                                radius: adSetData.location.radius,
                                distance_unit: 'kilometer'
                            }
                        ]
                    }
                },
                status: 'ACTIVE',
                start_time: new Date(adSetData.startDate).toISOString(),
                end_time: adSetData.endDate ? new Date(adSetData.endDate).toISOString() : null,
                access_token: userAccessToken // Usar token do usuário
            }
        );
        console.log('Ad Set criado com sucesso:', response.data);
        return response.data;
    } catch (error) {
        console.error('Erro ao criar conjunto de anúncios no Meta Ads:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Detalhes do erro:', JSON.stringify(error.response.data));
        }
        throw error;
    }
};

/**
 * Faz upload de uma imagem para o Meta Ads
 * @param {string} userAccessToken - Token de acesso do usuário Meta
 * @param {string} adAccountId - ID da conta de anúncios
 * @param {object} file - Arquivo de imagem
 * @returns {Promise<object>} - Objeto com hash da imagem e URL pública
 */
const uploadImage = async (userAccessToken, adAccountId, file) => {
    try {
        console.log(`Fazendo upload de imagem para conta ${adAccountId}`);
        console.log('Detalhes do arquivo:', {
            filename: file.originalname,
            path: file.path,
            mimetype: file.mimetype,
            size: file.size
        });
        
        const formData = new FormData();
        formData.append('access_token', userAccessToken); // Usar token do usuário
        formData.append('image', fs.createReadStream(file.path));
        
        console.log('Enviando requisição para upload de imagem...');
        const uploadResponse = await axios.post(
            `${META_API_BASE_URL}/${adAccountId}/adimages`,
            formData,
            {
                headers: {
                    ...formData.getHeaders()
                }
            }
        );
        
        console.log('Resposta do upload de imagem:', uploadResponse.data);
        const images = uploadResponse.data.images;
        const imageHash = Object.keys(images)[0];
        const imageData = images[imageHash];
        
        // Obter URL pública da imagem, se disponível
        let imageUrl = null;
        if (imageData && imageData.url) {
            imageUrl = imageData.url;
            console.log('URL pública da imagem:', imageUrl);
        } else if (imageData && imageData.permalink_url) {
            imageUrl = imageData.permalink_url;
            console.log('URL permalink da imagem:', imageUrl);
        } else {
            // Tentar construir URL da imagem a partir do hash (formato aproximado)
            imageUrl = `https://www.facebook.com/ads/image/?d=AQLRkX5_${imageHash}`;
            console.log('URL construída da imagem (aproximada):', imageUrl);
        }
        
        console.log('Upload de imagem concluído, hash:', imageHash);
        
        // Limpar arquivo temporário após upload
        fs.unlink(file.path, (err) => {
            if (err) console.error('Erro ao limpar arquivo temporário:', err);
        });
        
        return {
            hash: imageHash,
            url: imageUrl
        };
    } catch (error) {
        console.error('Erro ao fazer upload de imagem:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Detalhes do erro:', JSON.stringify(error.response.data));
        }
        
        if (error.response) {
            console.error('Detalhes do erro de upload:', {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            });
        }
        
        // Tentar limpar arquivo temporário mesmo em caso de erro
        if (file && file.path) {
             fs.unlink(file.path, (err) => {
                if (err) console.error('Erro ao limpar arquivo temporário (após erro):', err);
            });
        }
        throw error;
    }
};

/**
 * Cria um criativo de anúncio no Meta Ads
 * @param {string} userAccessToken - Token de acesso do usuário Meta
 * @param {string} adAccountId - ID da conta de anúncios
 * @param {string} pageId - ID da página do Facebook
 * @param {object} creativeData - Dados do criativo
 * @param {object} file - Arquivo de imagem (opcional)
 * @returns {Promise<object>} - Objeto com os dados do criativo criado
 */
const createAdCreative = async (userAccessToken, adAccountId, pageId, creativeData) => {
    try {
        console.log(`Criando criativo real no Meta Ads para conta ${adAccountId}`);
        
        // Preparar payload do criativo
        const creativePayload = {
            name: creativeData.name,
            object_story_spec: {
                page_id: pageId,
                link_data: {
                    image_hash: creativeData.imageHash,
                    link: creativeData.linkUrl,
                    message: creativeData.description || '',
                    name: creativeData.title || '',
                    call_to_action: {
                        type: creativeData.callToAction || DEFAULT_CTA
                    }
                }
            },
            access_token: userAccessToken // Usar token do usuário
        };
        
        console.log('Payload do criativo:', JSON.stringify(creativePayload, null, 2));
        
        const response = await axios.post(
            `${META_API_BASE_URL}/${adAccountId}/adcreatives`,
            creativePayload
        );
        
        console.log('Criativo criado com sucesso:', response.data);
        return response.data;
    } catch (error) {
        console.error('Erro ao criar criativo no Meta Ads:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Detalhes do erro:', JSON.stringify(error.response.data));
        }
        throw error;
    }
};

/**
 * Cria um anúncio no Meta Ads
 * @param {string} userAccessToken - Token de acesso do usuário Meta
 * @param {string} adAccountId - ID da conta de anúncios
 * @param {string} adSetId - ID do conjunto de anúncios
 * @param {string} creativeId - ID do criativo
 * @param {object} adData - Dados do anúncio
 * @returns {Promise<object>} - Objeto com os dados do anúncio criado
 */
const createAd = async (userAccessToken, adAccountId, adSetId, creativeId, adData) => {
    try {
        console.log(`Criando anúncio real no Meta Ads para ad set ${adSetId}`);
        
        const response = await axios.post(
            `${META_API_BASE_URL}/${adAccountId}/ads`,
            {
                name: adData.name,
                adset_id: adSetId,
                creative: { creative_id: creativeId },
                status: 'ACTIVE',
                access_token: userAccessToken // Usar token do usuário
            }
        );
        
        console.log('Anúncio criado com sucesso:', response.data);
        return response.data;
    } catch (error) {
        console.error('Erro ao criar anúncio no Meta Ads:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Detalhes do erro:', JSON.stringify(error.response.data));
        }
        throw error;
    }
};

/**
 * Cria um anúncio a partir de uma imagem enviada pelo usuário
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
const createFromImage = async (req, res) => {
  try {
    console.log('Iniciando criação de anúncio a partir de imagem');
    console.log('Corpo da requisição (req.body):', req.body);
    console.log('Arquivo recebido:', req.file);

    // Verificar se o usuário está autenticado
    if (!req.user) {
      console.error('❌ Erro: Usuário não autenticado.');
      return res.status(401).json({ message: 'Usuário não autenticado. Por favor, faça login novamente.' });
    }

    // Obter token de acesso do usuário
    const userAccessToken = getUserMetaToken(req.user);
    if (!userAccessToken) {
      console.error('❌ Erro: Token de acesso Meta não encontrado para o usuário.');
      return res.status(401).json({ message: 'Token de acesso Meta não encontrado. Por favor, conecte sua conta Meta Ads.' });
    }

    // Extrair dados da requisição
    const { 
      adAccountId, 
      pageId, 
      campaignName, 
      weeklyBudget, 
      startDate, 
      endDate, 
      title, 
      description, 
      callToAction, 
      objective, 
      location 
    } = req.body;

    // Verificar campos obrigatórios
    if (!adAccountId || !pageId || !campaignName || !weeklyBudget || !startDate || !req.file) {
      console.error('❌ Erro: Campos obrigatórios não preenchidos.');
      return res.status(400).json({ message: 'Campos obrigatórios não preenchidos.' });
    }

    // Validar objetivo (usar padrão se não for válido)
    const validObjective = isValidObjective(objective) ? objective : DEFAULT_TRAFFIC_OBJECTIVE;
    console.log(`Objetivo da campanha: ${validObjective}`);

    // Validar CTA (usar padrão se não for válido)
    const validCTA = isValidCTA(callToAction) ? callToAction : DEFAULT_CTA;
    console.log(`Call to Action: ${validCTA}`);

    // Processar localização
    let locationData = { latitude: -23.5505, longitude: -46.6333, radius: 10 }; // Padrão: São Paulo com raio de 10km
    if (location) {
      try {
        if (typeof location === 'string') {
          locationData = JSON.parse(location);
        } else if (location.latitude && location.longitude && location.radius) {
          locationData = {
            latitude: parseFloat(location.latitude),
            longitude: parseFloat(location.longitude),
            radius: parseInt(location.radius)
          };
        }
        console.log('Localização processada:', locationData);
      } catch (error) {
        console.error('Erro ao processar localização:', error);
        console.log('Usando localização padrão:', locationData);
      }
    }

    // Fazer upload da imagem
    console.log('Fazendo upload da imagem...');
    const imageData = await uploadImage(userAccessToken, adAccountId, req.file);
    console.log('Upload de imagem concluído:', imageData);

    // Criar campanha
    console.log('Criando campanha...');
    const campaignResult = await createCampaign(userAccessToken, adAccountId, {
      name: campaignName,
      objective: validObjective
    });

    // Criar ad set
    console.log('Criando ad set...');
    const adSetResult = await createAdSet(userAccessToken, adAccountId, campaignResult.id, {
      name: campaignName,
      weeklyBudget: parseFloat(weeklyBudget),
      startDate: startDate,
      endDate: endDate || null,
      location: locationData
    });

    // Criar criativo
    console.log('Criando criativo...');
    const creativeResult = await createAdCreative(userAccessToken, adAccountId, pageId, {
      name: `${campaignName} - Creative`,
      title: title || campaignName,
      description: description || '',
      imageHash: imageData.hash,
      callToAction: validCTA,
      linkUrl: imageData.url || 'https://facebook.com'
    });

    // Criar anúncio
    console.log('Criando anúncio...');
    const adResult = await createAd(userAccessToken, adAccountId, adSetResult.id, creativeResult.id, {
      name: campaignName
    });

    // Armazenar detalhes da campanha em memória
    if (!campaignsStore[adAccountId]) {
      campaignsStore[adAccountId] = [];
    }

    // Criar objeto com detalhes completos do anúncio
    const adDetails = {
      id: campaignResult.id,
      campaignId: campaignResult.id,
      name: campaignName,
      adAccountId: adAccountId,
      pageId: pageId,
      weeklyBudget: parseFloat(weeklyBudget),
      dailyBudget: parseFloat(weeklyBudget) / 7,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      title: title || campaignName,
      description: description || '',
      imageHash: imageData.hash,
      imageUrl: imageData.url,
      callToAction: validCTA,
      objective: validObjective,
      location: locationData,
      status: 'ACTIVE',
      adSetId: adSetResult.id,
      adId: adResult.id,
      creativeId: creativeResult.id,
      createdAt: new Date(),
      type: 'image'
    };

    // Adicionar ao início da lista (para aparecer primeiro)
    campaignsStore[adAccountId].unshift(adDetails);

    console.log('✅ Anúncio criado com sucesso!');
    res.status(201).json({
      success: true,
      message: 'Anúncio criado com sucesso e publicado como ACTIVE',
      campaignId: adDetails.campaignId,
      adSetId: adDetails.adSetId,
      adId: adDetails.adId,
      status: 'ACTIVE',
      adDetails
    });
  } catch (error) {
    console.error('❌ Erro ao criar anúncio a partir de imagem:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Detalhes do erro:', JSON.stringify(error.response.data));
    }
    
    if (error.response) {
      console.error('Detalhes do erro:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else {
      console.error('Stack trace do erro:', error.stack);
    }
    
    // Limpar arquivo temporário em caso de erro
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Erro ao limpar arquivo temporário (após erro):', err);
      });
    }
    
    res.status(500).json({
      message: 'Erro ao criar anúncio a partir de imagem',
      error: error.response?.data || error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Cria um anúncio a partir de uma publicação existente do Facebook
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
const createFromPost = async (req, res) => {
  try {
    console.log('Iniciando criação de anúncio a partir de publicação existente');
    console.log('Corpo da requisição (req.body):', req.body);

    // Verificar se o usuário está autenticado
    if (!req.user) {
      console.error('❌ Erro: Usuário não autenticado.');
      return res.status(401).json({ message: 'Usuário não autenticado. Por favor, faça login novamente.' });
    }

    // Obter token de acesso do usuário
    const userAccessToken = getUserMetaToken(req.user);
    if (!userAccessToken) {
      console.error('❌ Erro: Token de acesso Meta não encontrado para o usuário.');
      return res.status(401).json({ message: 'Token de acesso Meta não encontrado. Por favor, conecte sua conta Meta Ads.' });
    }

    // Extrair dados da requisição
    const { 
      adAccountId, 
      pageId, 
      campaignName, 
      weeklyBudget, 
      startDate, 
      endDate, 
      postUrl, 
      callToAction, 
      objective, 
      location 
    } = req.body;

    // Verificar campos obrigatórios
    if (!adAccountId || !pageId || !campaignName || !weeklyBudget || !startDate || !postUrl) {
      console.error('❌ Erro: Campos obrigatórios não preenchidos.');
      return res.status(400).json({ message: 'Campos obrigatórios não preenchidos.' });
    }

    // Extrair IDs da URL da publicação
    const extractedIds = extractFacebookPostIds(postUrl, pageId);
    if (!extractedIds) {
      console.error('❌ Erro: Não foi possível extrair os IDs da URL da publicação.');
      return res.status(400).json({ message: 'URL da publicação inválida. Por favor, verifique o formato e tente novamente.' });
    }

    console.log('IDs extraídos da URL:', extractedIds);
    
    // Verificar se o postId é um pfbid e convertê-lo se necessário
    let objectStoryId;
    try {
      objectStoryId = await convertPfbidToObjectStoryId(extractedIds.postId, extractedIds.pageId, userAccessToken);
      console.log('Object Story ID final:', objectStoryId);
    } catch (error) {
      console.error('❌ Erro ao converter pfbid:', error.message);
      return res.status(400).json({ message: error.message });
    }

    // Validar objetivo (usar padrão se não for válido)
    const validObjective = isValidObjective(objective) ? objective : DEFAULT_TRAFFIC_OBJECTIVE;
    console.log(`Objetivo da campanha: ${validObjective}`);

    // Validar CTA (usar padrão se não for válido)
    const validCTA = isValidCTA(callToAction) ? callToAction : DEFAULT_CTA;
    console.log(`Call to Action: ${validCTA}`);

    // Processar localização
    let locationData = { latitude: -23.5505, longitude: -46.6333, radius: 10 }; // Padrão: São Paulo com raio de 10km
    if (location) {
      try {
        if (typeof location === 'string') {
          locationData = JSON.parse(location);
        } else if (location.latitude && location.longitude && location.radius) {
          locationData = {
            latitude: parseFloat(location.latitude),
            longitude: parseFloat(location.longitude),
            radius: parseInt(location.radius)
          };
        }
        console.log('Localização processada:', locationData);
      } catch (error) {
        console.error('Erro ao processar localização:', error);
        console.log('Usando localização padrão:', locationData);
      }
    }

    // Criar campanha
    console.log('Criando campanha...');
    const campaignResult = await createCampaign(userAccessToken, adAccountId, {
      name: campaignName,
      objective: validObjective
    });

    // Criar ad set
    console.log('Criando ad set...');
    const adSetResult = await createAdSet(userAccessToken, adAccountId, campaignResult.id, {
      name: campaignName,
      weeklyBudget: parseFloat(weeklyBudget),
      startDate: startDate,
      endDate: endDate || null,
      location: locationData
    });

    // Criar criativo usando object_story_id
    console.log('Criando criativo com object_story_id...');
    const creativePayload = {
      name: `${campaignName} - Creative`,
      object_story_id: objectStoryId,
      access_token: userAccessToken
    };
    
    const creativeResponse = await axios.post(
      `${META_API_BASE_URL}/${adAccountId}/adcreatives`,
      creativePayload
    );
    
    console.log('Criativo criado com sucesso:', creativeResponse.data);
    const creativeId = creativeResponse.data.id;

    // Criar anúncio
    console.log('Criando anúncio...');
    const adResult = await createAd(userAccessToken, adAccountId, adSetResult.id, creativeId, {
      name: campaignName
    });

    // Armazenar detalhes da campanha em memória
    if (!campaignsStore[adAccountId]) {
      campaignsStore[adAccountId] = [];
    }

    // Criar objeto com detalhes completos do anúncio
    const adDetails = {
      id: campaignResult.id,
      campaignId: campaignResult.id,
      name: campaignName,
      adAccountId: adAccountId,
      pageId: extractedIds.pageId,
      weeklyBudget: parseFloat(weeklyBudget),
      dailyBudget: parseFloat(weeklyBudget) / 7,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      location: locationData,
      postUrl: postUrl,
      objectStoryId: objectStoryId,
      callToAction: validCTA,
      objective: validObjective,
      status: 'ACTIVE',
      adSetId: adSetResult.id,
      adId: adResult.id,
      creativeId: creativeId,
      createdAt: new Date(),
      type: 'post'
    };

    // Adicionar ao início da lista (para aparecer primeiro)
    campaignsStore[adAccountId].unshift(adDetails);

    console.log('✅ Anúncio criado com sucesso!');
    res.status(201).json({
      success: true,
      message: 'Anúncio criado com sucesso e publicado como ACTIVE',
      campaignId: adDetails.campaignId,
      adSetId: adDetails.adSetId,
      adId: adDetails.adId,
      status: 'ACTIVE',
      adDetails
    });
  } catch (error) {
    console.error('❌ Erro ao criar anúncio a partir de publicação:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Detalhes do erro:', JSON.stringify(error.response.data));
    }
    
    if (error.response) {
      console.error('Detalhes do erro:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else {
      console.error('Stack trace do erro:', error.stack);
    }
    
    res.status(500).json({
      message: 'Erro ao criar anúncio a partir de publicação',
      error: error.response?.data || error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Cria uma campanha no Meta Ads (função para rota /campanhas)
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
const criarCampanha = async (req, res) => {
  try {
    console.log('Função criarCampanha chamada');
    console.log('Corpo da requisição (req.body):', req.body);

    // Verificar se o usuário está autenticado
    if (!req.user) {
      console.error('❌ Erro: Usuário não autenticado.');
      return res.status(401).json({ message: 'Usuário não autenticado. Por favor, faça login novamente.' });
    }

    // Obter token de acesso do usuário
    const userAccessToken = getUserMetaToken(req.user);
    if (!userAccessToken) {
      console.error('❌ Erro: Token de acesso Meta não encontrado para o usuário.');
      return res.status(401).json({ message: 'Token de acesso Meta não encontrado. Por favor, conecte sua conta Meta Ads.' });
    }

    // Extrair dados da requisição
    const { 
      adAccountId, 
      campaignName, 
      objective 
    } = req.body;

    // Verificar campos obrigatórios
    if (!adAccountId || !campaignName) {
      console.error('❌ Erro: Campos obrigatórios não preenchidos.');
      return res.status(400).json({ message: 'ID da conta de anúncios e nome da campanha são obrigatórios.' });
    }

    // Validar objetivo (usar padrão se não for válido)
    const validObjective = isValidObjective(objective) ? objective : DEFAULT_TRAFFIC_OBJECTIVE;
    console.log(`Objetivo da campanha: ${validObjective}`);

    // Criar campanha
    console.log('Criando campanha...');
    const campaignResult = await createCampaign(userAccessToken, adAccountId, {
      name: campaignName,
      objective: validObjective
    });

    // Armazenar detalhes da campanha em memória
    if (!campaignsStore[adAccountId]) {
      campaignsStore[adAccountId] = [];
    }

    // Criar objeto com detalhes da campanha
    const campaignDetails = {
      id: campaignResult.id,
      name: campaignName,
      adAccountId: adAccountId,
      objective: validObjective,
      status: 'ACTIVE',
      createdAt: new Date()
    };

    // Adicionar ao início da lista (para aparecer primeiro)
    campaignsStore[adAccountId].unshift(campaignDetails);

    console.log('✅ Campanha criada com sucesso!');
    res.status(201).json({
      success: true,
      message: 'Campanha criada com sucesso',
      campaignId: campaignDetails.id,
      status: 'ACTIVE',
      campaignDetails
    });
  } catch (error) {
    console.error('❌ Erro ao criar campanha:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Detalhes do erro:', JSON.stringify(error.response.data));
    }
    
    if (error.response) {
      console.error('Detalhes do erro:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else {
      console.error('Stack trace do erro:', error.stack);
    }
    
    res.status(500).json({
      message: 'Erro ao criar campanha',
      error: error.response?.data || error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Busca campanhas do Meta Ads
 */
const getCampaigns = async (req, res) => {
    try {
        console.log('Buscando campanhas do Meta Ads (integração real)');
        
        // Verificar se o usuário está autenticado
        if (!req.user) {
            console.error('❌ Erro: Usuário não autenticado.');
            return res.status(401).json({ message: 'Usuário não autenticado. Por favor, faça login novamente.' });
        }

        // Obter token de acesso do usuário
        const userAccessToken = getUserMetaToken(req.user);
        if (!userAccessToken) {
            console.error('❌ Erro: Token de acesso Meta não encontrado para o usuário.');
            return res.status(401).json({ message: 'Token de acesso Meta não encontrado. Por favor, conecte sua conta Meta Ads.' });
        }

        // Obter ID da conta de anúncios da query ou do corpo da requisição
        const adAccountId = req.query.adAccountId || req.body.adAccountId;
        if (!adAccountId) {
            console.error('❌ Erro: ID da conta de anúncios não fornecido.');
            return res.status(400).json({ message: 'ID da conta de anúncios é obrigatório.' });
        }

        // Buscar campanhas da API do Meta
        console.log(`Buscando campanhas para a conta ${adAccountId}...`);
        const response = await axios.get(
            `${META_API_BASE_URL}/${adAccountId}/campaigns`,
            {
                params: {
                    fields: 'id,name,objective,status,created_time,start_time,stop_time,daily_budget,lifetime_budget,insights{impressions,clicks,ctr,cpc,reach,spend}',
                    access_token: userAccessToken,
                    limit: 100
                }
            }
        );

        // Processar campanhas recebidas
        const campaigns = response.data.data || [];
        console.log(`Recebidas ${campaigns.length} campanhas da API do Meta.`);

        // Adicionar campanhas armazenadas localmente (se houver)
        const localCampaigns = campaignsStore[adAccountId] || [];
        console.log(`Adicionando ${localCampaigns.length} campanhas locais.`);

        // Combinar campanhas da API e locais, evitando duplicatas
        const allCampaigns = [...campaigns];
        localCampaigns.forEach(localCampaign => {
            if (!allCampaigns.some(c => c.id === localCampaign.id)) {
                allCampaigns.push(localCampaign);
            }
        });

        console.log(`Total de ${allCampaigns.length} campanhas após combinação.`);
        res.status(200).json({
            success: true,
            campaigns: allCampaigns
        });
    } catch (error) {
        console.error('❌ Erro ao buscar campanhas do Meta Ads:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Detalhes do erro:', JSON.stringify(error.response.data));
        }
        
        res.status(500).json({
            message: 'Erro ao buscar campanhas',
            error: error.response?.data || error.message
        });
    }
};

/**
 * Busca métricas de anúncios do Meta Ads
 */
const getMetrics = async (req, res) => {
    try {
        console.log('Buscando métricas de anúncios do Meta Ads (integração real)');
        
        // Verificar se o usuário está autenticado
        if (!req.user) {
            console.error('❌ Erro: Usuário não autenticado.');
            return res.status(401).json({ message: 'Usuário não autenticado. Por favor, faça login novamente.' });
        }

        // Obter token de acesso do usuário
        const userAccessToken = getUserMetaToken(req.user);
        if (!userAccessToken) {
            console.error('❌ Erro: Token de acesso Meta não encontrado para o usuário.');
            return res.status(401).json({ message: 'Token de acesso Meta não encontrado. Por favor, conecte sua conta Meta Ads.' });
        }

        // Obter ID da conta de anúncios da query ou do corpo da requisição
        const adAccountId = req.query.adAccountId || req.body.adAccountId;
        if (!adAccountId) {
            console.error('❌ Erro: ID da conta de anúncios não fornecido.');
            return res.status(400).json({ message: 'ID da conta de anúncios é obrigatório.' });
        }

        // Calcular datas para o período (últimos 30 dias por padrão)
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        const since = req.query.since || thirtyDaysAgo.toISOString().split('T')[0];
        const until = req.query.until || today.toISOString().split('T')[0];
        
        console.log(`Período de métricas: ${since} até ${until}`);

        // Buscar insights da conta de anúncios
        console.log(`Buscando insights para a conta ${adAccountId}...`);
        const response = await axios.get(
            `${META_API_BASE_URL}/${adAccountId}/insights`,
            {
                params: {
                    fields: 'impressions,clicks,ctr,cpc,reach,spend',
                    time_range: JSON.stringify({ since, until }),
                    access_token: userAccessToken
                }
            }
        );

        // Processar métricas recebidas
        const insights = response.data.data || [];
        console.log(`Recebidos insights da API do Meta:`, insights);

        // Calcular métricas agregadas
        let aggregatedMetrics = {
            impressions: 0,
            clicks: 0,
            ctr: 0,
            cpc: 0,
            reach: 0,
            spend: 0
        };

        if (insights.length > 0) {
            // Somar métricas de todos os dias
            insights.forEach(day => {
                aggregatedMetrics.impressions += parseInt(day.impressions || 0);
                aggregatedMetrics.clicks += parseInt(day.clicks || 0);
                aggregatedMetrics.reach += parseInt(day.reach || 0);
                aggregatedMetrics.spend += parseFloat(day.spend || 0);
            });

            // Calcular CTR e CPC agregados
            if (aggregatedMetrics.impressions > 0) {
                aggregatedMetrics.ctr = (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100;
            }
            if (aggregatedMetrics.clicks > 0) {
                aggregatedMetrics.cpc = aggregatedMetrics.spend / aggregatedMetrics.clicks;
            }
        }

        console.log(`Métricas agregadas:`, aggregatedMetrics);
        res.status(200).json({
            success: true,
            metrics: aggregatedMetrics,
            period: { since, until }
        });
    } catch (error) {
        console.error('❌ Erro ao buscar métricas do Meta Ads:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Detalhes do erro:', JSON.stringify(error.response.data));
        }
        
        res.status(500).json({
            message: 'Erro ao buscar métricas',
            error: error.response?.data || error.message
        });
    }
};

module.exports = {
    createFromImage,
    createFromPost,
    getCampaigns,
    getMetrics,
    criarCampanha
};
