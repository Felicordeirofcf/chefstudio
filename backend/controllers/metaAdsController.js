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
        const postsRegex = /facebook\.com\/(\d+)\/posts\/([^\/\?]+)/;
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
                // Aceitar qualquer formato de story_fbid, incluindo pfbid
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
            const pfbid = "pfbid0" + pfbidMatch[1]; // Reconstruir o pfbid completo
            return {
                pageId: defaultPageId,
                postId: pfbid
            };
        }
        
        // Formato 6: facebook.com/{username}/posts/{post_id} (username não numérico)
        const usernamePostsMatch = url.match(/facebook\.com\/([^\/]+)\/posts\/([^\/\?]+)/);
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
const createAdCreative = async (userAccessToken, adAccountId, pageId, creativeData, file = null) => {
    try {
        console.log(`Criando ad creative real no Meta Ads para conta ${adAccountId}`);
        console.log('Dados do criativo:', creativeData);
        
        // Se for anúncio de publicação existente (postId presente)
        if (creativeData.postId) {
            // Montar o object_story_id no formato correto: pageId_postId
            const objectStoryId = `${pageId}_${creativeData.postId}`;
            console.log(`Object Story ID montado: ${objectStoryId}`);
            
            // Criar payload APENAS com object_story_id, sem object_story_spec
            const creativePayload = {
                name: `${creativeData.name} - Creative`,
                object_story_id: objectStoryId,
                access_token: userAccessToken
            };
            
            console.log('Enviando payload para criação de criativo (publicação existente):', JSON.stringify(creativePayload, null, 2));
            const response = await axios.post(
                `${META_API_BASE_URL}/${adAccountId}/adcreatives`,
                creativePayload
            );
            
            console.log('Ad Creative criado com sucesso (publicação existente):', response.data);
            return response.data;
        } 
        // Caso contrário, é um anúncio com imagem
        else {
            let imageHash = null;
            let imageUrl = null;
            
            if (file) {
                // Fazer upload da imagem e obter hash e URL
                const imageData = await uploadImage(userAccessToken, adAccountId, file);
                imageHash = imageData.hash;
                imageUrl = imageData.url;
            } else if (creativeData.imageUrl) {
                // Verificar se a URL da imagem é acessível
                const isAccessible = await isUrlAccessible(creativeData.imageUrl);
                if (!isAccessible) {
                    throw new Error(`URL da imagem não acessível: ${creativeData.imageUrl}`);
                }
                imageUrl = creativeData.imageUrl;
            }
            
            // Validar message (texto do anúncio)
            if (!creativeData.adDescription && !creativeData.message) {
                creativeData.message = `Confira nossa oferta especial! ${creativeData.linkUrl || ''}`;
            }
            
            // Validar CTA
            const ctaType = creativeData.callToAction || DEFAULT_CTA;
            if (!isValidCTA(ctaType)) {
                console.warn(`CTA inválido: ${ctaType}, usando padrão: ${DEFAULT_CTA}`);
                creativeData.callToAction = DEFAULT_CTA;
            }
            
            // Criar payload com object_story_spec
            const creativePayload = {
                name: `${creativeData.name} - Creative`,
                object_story_spec: {
                    page_id: pageId,
                    link_data: {
                        message: creativeData.message || creativeData.adDescription || '',
                        link: creativeData.linkUrl || 'https://facebook.com',
                        caption: creativeData.caption || '',
                        description: creativeData.adDescription || '',
                        call_to_action: {
                            type: creativeData.callToAction || DEFAULT_CTA,
                            value: {
                                link: creativeData.linkUrl || 'https://facebook.com'
                            }
                        }
                    }
                },
                access_token: userAccessToken
            };
            
            // Adicionar imagem ao payload
            if (imageHash) {
                creativePayload.object_story_spec.link_data.image_hash = imageHash;
            } else if (imageUrl) {
                creativePayload.object_story_spec.link_data.picture = imageUrl;
            }
            
            console.log('Enviando payload para criação de criativo (imagem):', JSON.stringify(creativePayload, null, 2));
            const response = await axios.post(
                `${META_API_BASE_URL}/${adAccountId}/adcreatives`,
                creativePayload
            );
            
            console.log('Ad Creative criado com sucesso (imagem):', response.data);
            return response.data;
        }
    } catch (error) {
        console.error('Erro ao criar criativo de anúncio no Meta Ads:', error.response?.data || error.message);
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
        console.log(`Criando anúncio real no Meta Ads para adset ${adSetId} e creative ${creativeId}`);
        const response = await axios.post(
            `${META_API_BASE_URL}/${adAccountId}/ads`,
            {
                name: `${adData.name} - Ad`,
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
 * Cria um anúncio a partir de uma imagem
 * @param {object} req - Objeto de requisição
 * @param {object} res - Objeto de resposta
 * @returns {Promise<void>}
 */
const createFromImage = async (req, res) => {
    try {
        console.log('Iniciando criação de anúncio a partir de imagem');
        
        // Verificar se o usuário está autenticado e tem token Meta
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        
        const userAccessToken = getUserMetaToken(req.user);
        if (!userAccessToken) {
            return res.status(401).json({ error: 'Token de acesso Meta não encontrado. Conecte sua conta Meta primeiro.' });
        }
        
        // Extrair dados da requisição
        const {
            adAccountId,
            pageId,
            campaignName,
            weeklyBudget,
            startDate,
            endDate,
            location,
            imageUrl,
            linkUrl,
            adTitle,
            adDescription,
            callToAction,
            objective
        } = req.body;
        
        // Validar campos obrigatórios
        if (!adAccountId || !pageId || !campaignName || !weeklyBudget || !startDate) {
            return res.status(400).json({ error: 'Campos obrigatórios não fornecidos' });
        }
        
        // Validar imagem (arquivo ou URL)
        const file = req.file;
        if (!file && !imageUrl) {
            return res.status(400).json({ error: 'Imagem não fornecida (arquivo ou URL)' });
        }
        
        // Validar URL de destino
        if (!linkUrl) {
            return res.status(400).json({ error: 'URL de destino não fornecida' });
        }
        
        // Usar objetivo fixo OUTCOME_TRAFFIC, ignorando qualquer valor recebido
        const finalObjective = DEFAULT_TRAFFIC_OBJECTIVE;
        
        // Criar campanha
        const campaignData = {
            name: campaignName,
            objective: finalObjective
        };
        const campaign = await createCampaign(userAccessToken, adAccountId, campaignData);
        
        // Criar conjunto de anúncios (Ad Set)
        const adSetData = {
            name: campaignName,
            weeklyBudget: parseFloat(weeklyBudget),
            startDate,
            endDate,
            location: location || {
                latitude: -23.5505,
                longitude: -46.6333,
                radius: 10
            }
        };
        const adSet = await createAdSet(userAccessToken, adAccountId, campaign.id, adSetData);
        
        // Criar criativo de anúncio
        const creativeData = {
            name: campaignName,
            imageUrl,
            linkUrl,
            adTitle,
            adDescription,
            callToAction: callToAction || DEFAULT_CTA,
            message: adDescription
        };
        const creative = await createAdCreative(userAccessToken, adAccountId, pageId, creativeData, file);
        
        // Criar anúncio
        const adData = {
            name: campaignName
        };
        const ad = await createAd(userAccessToken, adAccountId, adSet.id, creative.id, adData);
        
        // Armazenar dados da campanha localmente
        const campaignDetails = {
            id: campaign.id,
            name: campaignName,
            adSetId: adSet.id,
            creativeId: creative.id,
            adId: ad.id,
            startDate,
            endDate,
            weeklyBudget: parseFloat(weeklyBudget),
            createdAt: new Date().toISOString()
        };
        campaignsStore[campaign.id] = campaignDetails;
        
        // Retornar detalhes do anúncio criado
        return res.status(200).json({
            success: true,
            message: 'Anúncio criado com sucesso',
            adDetails: {
                campaignId: campaign.id,
                adSetId: adSet.id,
                creativeId: creative.id,
                adId: ad.id,
                name: campaignName,
                startDate,
                endDate,
                weeklyBudget: parseFloat(weeklyBudget),
                createdAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Erro ao criar anúncio a partir de imagem:', error);
        
        // Formatar mensagem de erro
        let errorMessage = 'Erro ao criar anúncio no Meta Ads';
        let errorDetails = null;
        
        if (error.response?.data?.error) {
            errorMessage = `Erro ao criar anúncio no Meta Ads: ${JSON.stringify(error.response.data.error)}`;
            errorDetails = error.response.data.error;
            console.error('Detalhes do erro:', errorDetails);
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        return res.status(500).json({
            error: errorMessage,
            details: errorDetails
        });
    }
};

/**
 * Cria um anúncio a partir de uma publicação existente
 * @param {object} req - Objeto de requisição
 * @param {object} res - Objeto de resposta
 * @returns {Promise<void>}
 */
const createFromPost = async (req, res) => {
    try {
        console.log('Iniciando criação de anúncio a partir de publicação existente');
        
        // Verificar se o usuário está autenticado e tem token Meta
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        
        const userAccessToken = getUserMetaToken(req.user);
        if (!userAccessToken) {
            return res.status(401).json({ error: 'Token de acesso Meta não encontrado. Conecte sua conta Meta primeiro.' });
        }
        
        // Extrair dados da requisição
        const {
            adAccountId,
            pageId,
            campaignName,
            weeklyBudget,
            startDate,
            endDate,
            location,
            postUrl,
            callToAction
        } = req.body;
        
        // Validar campos obrigatórios
        if (!adAccountId || !pageId || !campaignName || !weeklyBudget || !startDate || !postUrl) {
            return res.status(400).json({ error: 'Campos obrigatórios não fornecidos' });
        }
        
        // Extrair post_id da URL da publicação
        const postIds = extractFacebookPostIds(postUrl, pageId);
        if (!postIds || !postIds.postId) {
            return res.status(400).json({ error: 'Não foi possível extrair o ID da publicação da URL fornecida' });
        }
        
        console.log('IDs extraídos da URL da publicação:', postIds);
        
        // Usar objetivo fixo OUTCOME_TRAFFIC, ignorando qualquer valor recebido
        const finalObjective = DEFAULT_TRAFFIC_OBJECTIVE;
        
        // Criar campanha
        const campaignData = {
            name: campaignName,
            objective: finalObjective
        };
        const campaign = await createCampaign(userAccessToken, adAccountId, campaignData);
        
        // Criar conjunto de anúncios (Ad Set)
        const adSetData = {
            name: campaignName,
            weeklyBudget: parseFloat(weeklyBudget),
            startDate,
            endDate,
            location: location || {
                latitude: -23.5505,
                longitude: -46.6333,
                radius: 10
            }
        };
        const adSet = await createAdSet(userAccessToken, adAccountId, campaign.id, adSetData);
        
        // Criar criativo de anúncio com a publicação existente
        const creativeData = {
            name: campaignName,
            postId: postIds.postId,
            callToAction: callToAction || DEFAULT_CTA
        };
        const creative = await createAdCreative(userAccessToken, adAccountId, pageId, creativeData);
        
        // Criar anúncio
        const adData = {
            name: campaignName
        };
        const ad = await createAd(userAccessToken, adAccountId, adSet.id, creative.id, adData);
        
        // Armazenar dados da campanha localmente
        const campaignDetails = {
            id: campaign.id,
            name: campaignName,
            adSetId: adSet.id,
            creativeId: creative.id,
            adId: ad.id,
            startDate,
            endDate,
            weeklyBudget: parseFloat(weeklyBudget),
            createdAt: new Date().toISOString()
        };
        campaignsStore[campaign.id] = campaignDetails;
        
        // Retornar detalhes do anúncio criado
        return res.status(200).json({
            success: true,
            message: 'Anúncio criado com sucesso a partir da publicação existente',
            adDetails: {
                campaignId: campaign.id,
                adSetId: adSet.id,
                creativeId: creative.id,
                adId: ad.id,
                name: campaignName,
                startDate,
                endDate,
                weeklyBudget: parseFloat(weeklyBudget),
                createdAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Erro ao criar anúncio a partir de publicação existente:', error);
        
        // Formatar mensagem de erro
        let errorMessage = 'Erro ao criar anúncio no Meta Ads';
        let errorDetails = null;
        
        if (error.response?.data?.error) {
            errorMessage = `Erro ao criar anúncio no Meta Ads: ${JSON.stringify(error.response.data.error)}`;
            errorDetails = error.response.data.error;
            console.error('Detalhes do erro:', errorDetails);
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        return res.status(500).json({
            error: errorMessage,
            details: errorDetails
        });
    }
};

/**
 * Busca campanhas da conta de anúncios
 * @param {object} req - Objeto de requisição
 * @param {object} res - Objeto de resposta
 * @returns {Promise<void>}
 */
const getCampaigns = async (req, res) => {
    try {
        console.log('Buscando campanhas da conta de anúncios');
        
        // Verificar se o usuário está autenticado e tem token Meta
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        
        const userAccessToken = getUserMetaToken(req.user);
        if (!userAccessToken) {
            return res.status(401).json({ error: 'Token de acesso Meta não encontrado. Conecte sua conta Meta primeiro.' });
        }
        
        // Extrair ID da conta de anúncios da requisição
        const { adAccountId } = req.query;
        if (!adAccountId) {
            return res.status(400).json({ error: 'ID da conta de anúncios não fornecido' });
        }
        
        // Buscar campanhas da conta de anúncios
        const response = await axios.get(
            `${META_API_BASE_URL}/${adAccountId}/campaigns`,
            {
                params: {
                    fields: 'id,name,status,objective,created_time,start_time,stop_time,daily_budget,lifetime_budget',
                    access_token: userAccessToken
                }
            }
        );
        
        // Processar campanhas
        const campaigns = response.data.data.map(campaign => {
            // Calcular orçamento semanal a partir do orçamento diário
            let weeklyBudget = null;
            let dailyBudget = null;
            
            if (campaign.daily_budget) {
                dailyBudget = parseFloat(campaign.daily_budget) / 100; // Converter de centavos para reais
                weeklyBudget = dailyBudget * 7;
            } else if (campaign.lifetime_budget) {
                // Estimar orçamento diário a partir do orçamento total
                const lifetimeBudget = parseFloat(campaign.lifetime_budget) / 100;
                const startDate = campaign.start_time ? new Date(campaign.start_time) : new Date();
                const endDate = campaign.stop_time ? new Date(campaign.stop_time) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                const days = Math.max(1, Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000)));
                
                dailyBudget = lifetimeBudget / days;
                weeklyBudget = dailyBudget * 7;
            }
            
            // Adicionar dados locais da campanha, se disponíveis
            const localCampaign = campaignsStore[campaign.id];
            
            return {
                campaignId: campaign.id,
                name: campaign.name,
                status: campaign.status,
                objective: campaign.objective,
                created_time: campaign.created_time,
                startDate: campaign.start_time,
                endDate: campaign.stop_time,
                dailyBudget,
                weeklyBudget,
                // Adicionar dados locais, se disponíveis
                ...(localCampaign || {})
            };
        });
        
        return res.status(200).json({
            success: true,
            campaigns
        });
    } catch (error) {
        console.error('Erro ao buscar campanhas:', error);
        
        // Formatar mensagem de erro
        let errorMessage = 'Erro ao buscar campanhas do Meta Ads';
        
        if (error.response?.data?.error) {
            errorMessage = `Erro ao buscar campanhas: ${error.response.data.error.message}`;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        return res.status(500).json({
            error: errorMessage
        });
    }
};

/**
 * Busca métricas de anúncios
 * @param {object} req - Objeto de requisição
 * @param {object} res - Objeto de resposta
 * @returns {Promise<void>}
 */
const getMetrics = async (req, res) => {
    try {
        console.log('Buscando métricas de anúncios');
        
        // Verificar se o usuário está autenticado e tem token Meta
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        
        const userAccessToken = getUserMetaToken(req.user);
        if (!userAccessToken) {
            return res.status(401).json({ error: 'Token de acesso Meta não encontrado. Conecte sua conta Meta primeiro.' });
        }
        
        // Extrair parâmetros da requisição
        const { adAccountId, timeRange = 'last_30_days' } = req.query;
        if (!adAccountId) {
            return res.status(400).json({ error: 'ID da conta de anúncios não fornecido' });
        }
        
        // Validar timeRange
        const validTimeRanges = ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month'];
        if (!validTimeRanges.includes(timeRange)) {
            return res.status(400).json({ error: 'Intervalo de tempo inválido' });
        }
        
        // Buscar métricas da conta de anúncios
        const response = await axios.get(
            `${META_API_BASE_URL}/${adAccountId}/insights`,
            {
                params: {
                    fields: 'impressions,clicks,spend,ctr,cpc,reach,frequency',
                    time_range: `{"since":"${timeRange}"}`,
                    access_token: userAccessToken
                }
            }
        );
        
        // Processar métricas
        const metrics = response.data.data[0] || {
            impressions: '0',
            clicks: '0',
            spend: '0',
            ctr: '0',
            cpc: '0',
            reach: '0',
            frequency: '0'
        };
        
        // Converter valores para números
        const processedMetrics = {
            impressions: parseInt(metrics.impressions || 0),
            clicks: parseInt(metrics.clicks || 0),
            spend: parseFloat(metrics.spend || 0),
            ctr: parseFloat(metrics.ctr || 0) * 100, // Converter para porcentagem
            cpc: parseFloat(metrics.cpc || 0),
            reach: parseInt(metrics.reach || 0),
            frequency: parseFloat(metrics.frequency || 0)
        };
        
        return res.status(200).json({
            success: true,
            metrics: processedMetrics,
            timeRange
        });
    } catch (error) {
        console.error('Erro ao buscar métricas:', error);
        
        // Formatar mensagem de erro
        let errorMessage = 'Erro ao buscar métricas do Meta Ads';
        
        if (error.response?.data?.error) {
            errorMessage = `Erro ao buscar métricas: ${error.response.data.error.message}`;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        return res.status(500).json({
            error: errorMessage
        });
    }
};

module.exports = {
    createFromImage,
    createFromPost,
    getCampaigns,
    getMetrics
};
