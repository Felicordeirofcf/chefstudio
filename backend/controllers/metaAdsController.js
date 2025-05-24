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
                postId: pfbidMatch[1]
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
                // Não exigir texto do anúncio, usar o texto da publicação existente
                console.log('Nenhum texto de anúncio fornecido, usando texto da publicação existente.');
            }
            
            // Usar message ou adDescription, priorizando message se ambos estiverem presentes
            const adMessage = creativeData.message || creativeData.adDescription;
            
            // Validar CTA
            let ctaType = creativeData.callToAction || DEFAULT_CTA;
            if (!isValidCTA(ctaType)) {
                console.warn(`CTA inválido: ${ctaType}. Usando CTA padrão: ${DEFAULT_CTA}`);
                ctaType = DEFAULT_CTA;
            }
            
            const creativePayload = {
                name: `${creativeData.name} - Creative`,
                object_story_spec: {
                    page_id: pageId,
                    link_data: {
                        message: adMessage,
                        link: creativeData.menuUrl || 'https://chefstudio.com',
                        call_to_action: {
                            type: ctaType
                        }
                    }
                },
                access_token: userAccessToken // Usar token do usuário
            };
            
            if (imageHash) {
                creativePayload.object_story_spec.link_data.image_hash = imageHash;
            }
            
            if (creativeData.adTitle) {
                creativePayload.object_story_spec.link_data.name = creativeData.adTitle;
            }
            
            console.log('Enviando payload para criação de criativo (imagem):', JSON.stringify(creativePayload, null, 2));
            const response = await axios.post(
                `${META_API_BASE_URL}/${adAccountId}/adcreatives`,
                creativePayload
            );
            
            console.log('Ad Creative criado com sucesso (imagem):', response.data);
            
            // Adicionar URL da imagem ao resultado
            return {
                ...response.data,
                imageUrl: imageUrl
            };
        }
    } catch (error) {
        console.error('Erro ao criar criativo de anúncio no Meta Ads:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Detalhes do erro:', JSON.stringify(error.response.data));
        }
        
        if (error.response) {
            console.error('Detalhes do erro de criação de criativo:', {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            });
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
 * Cria um anúncio completo a partir de uma imagem
 */
const createFromImage = async (req, res) => {
    try {
        console.log('Iniciando criação de anúncio a partir de imagem (integração real)');
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
            objective, 
            adTitle, 
            adDescription, 
            message, 
            callToAction, 
            menuUrl, 
            image_url 
        } = req.body;

        // Verificar campos obrigatórios
        const camposObrigatorios = {
            adAccountId: !!adAccountId,
            pageId: !!pageId,
            campaignName: !!campaignName,
            weeklyBudget: !!weeklyBudget,
            startDate: !!startDate
        };
        
        console.log('Validação de campos obrigatórios:', camposObrigatorios);
        
        if (!req.file && !image_url) {
            console.error('❌ Erro: Imagem não fornecida (nem arquivo nem URL)');
            return res.status(400).json({ 
                message: 'Imagem é obrigatória (forneça um arquivo ou image_url)', 
                camposFaltantes: { imagem: true } 
            });
        }
        
        const camposFaltantes = Object.entries(camposObrigatorios)
            .filter(([_, valor]) => !valor)
            .reduce((acc, [campo]) => ({ ...acc, [campo]: true }), {});
            
        if (Object.keys(camposFaltantes).length > 0) {
            console.error('❌ Erro: Campos obrigatórios não preenchidos:', camposFaltantes);
            return res.status(400).json({ 
                message: 'Campos obrigatórios não preenchidos', 
                camposFaltantes 
            });
        }
        
        // Validar CTA se fornecido
        if (callToAction && !isValidCTA(callToAction)) {
            console.error('❌ Erro: CTA inválido:', callToAction);
            return res.status(400).json({ 
                message: `CTA inválido: ${callToAction}. Valores válidos: ${VALID_CTA_TYPES.join(', ')}`,
                ctaValidos: VALID_CTA_TYPES
            });
        }
        
        // Validar image_url se fornecido
        if (image_url && !req.file) {
            try {
                const isAccessible = await isUrlAccessible(image_url);
                if (!isAccessible) {
                    console.error('❌ Erro: URL da imagem não acessível:', image_url);
                    return res.status(400).json({ 
                        message: `URL da imagem não acessível: ${image_url}`,
                        camposFaltantes: { image_url: true }
                    });
                }
                console.log('✅ URL da imagem validada com sucesso:', image_url);
            } catch (error) {
                console.error('❌ Erro ao validar URL da imagem:', error);
                return res.status(400).json({ 
                    message: `Erro ao validar URL da imagem: ${error.message}`,
                    camposFaltantes: { image_url: true }
                });
            }
        }

        // Obter informações de localização
        let location = { latitude: -23.5505, longitude: -46.6333, radius: 10 }; // Padrão: São Paulo com raio de 10km
        if (req.body.location) {
            try {
                if (typeof req.body.location === 'string') {
                    location = JSON.parse(req.body.location);
                } else if (req.body['location[latitude]'] && req.body['location[longitude]'] && req.body['location[radius]']) {
                    location = {
                        latitude: parseFloat(req.body['location[latitude]']),
                        longitude: parseFloat(req.body['location[longitude]']),
                        radius: parseInt(req.body['location[radius]'])
                    };
                }
                console.log('Localização processada:', location);
            } catch (error) {
                console.error('Erro ao processar localização:', error);
                console.log('Usando localização padrão:', location);
                 // Continuar com a localização padrão se houver erro
            }
        }

        // Criar campanha, ad set, criativo e anúncio em sequência usando o token do usuário
        console.log('Iniciando criação de campanha...');
        const campaignResult = await createCampaign(userAccessToken, adAccountId, {
            name: campaignName
            // Não passamos objective, será usado o valor fixo DEFAULT_TRAFFIC_OBJECTIVE
        });

        console.log('Iniciando criação de ad set...');
        const adSetResult = await createAdSet(userAccessToken, adAccountId, campaignResult.id, {
            name: campaignName,
            weeklyBudget: parseFloat(weeklyBudget),
            startDate: startDate,
            endDate: endDate || null,
            location: location
        });

        console.log('Iniciando criação de criativo...');
        const creativeResult = await createAdCreative(userAccessToken, adAccountId, pageId, {
            name: campaignName,
            adDescription: adDescription,
            message: message, // Adicionar message como campo separado
            adTitle: adTitle || null,
            callToAction: callToAction || DEFAULT_CTA,
            menuUrl: menuUrl || null,
            imageUrl: image_url // Passar URL da imagem se fornecida
        }, req.file); // Passar o arquivo de imagem se fornecido

        console.log('Iniciando criação de anúncio...');
        const adResult = await createAd(userAccessToken, adAccountId, adSetResult.id, creativeResult.id, {
            name: campaignName
        });

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
            location: location,
            message: message || adDescription, // Usar message ou adDescription
            adTitle: adTitle || null,
            callToAction: callToAction || DEFAULT_CTA,
            menuUrl: menuUrl || null,
            status: 'ACTIVE',
            imageUrl: creativeResult.imageUrl || image_url, // Usar URL da imagem do criativo ou a fornecida
            adSetId: adSetResult.id,
            adId: adResult.id,
            creativeId: creativeResult.id,
            createdAt: new Date(),
            type: 'image',
            objective: DEFAULT_TRAFFIC_OBJECTIVE // Usar o objetivo fixo
        };

        // Armazenar a campanha em memória (backup local)
        if (!campaignsStore[adAccountId]) {
            campaignsStore[adAccountId] = [];
        }
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
        
        // Limpar arquivo temporário se existir em caso de erro
        if (req.file && req.file.path) {
             fs.unlink(req.file.path, (err) => {
                if (err) console.error('Erro ao limpar arquivo temporário (após erro no controller):', err);
            });
        }
        
        res.status(500).json({
            message: 'Erro ao criar anúncio',
            error: error.response?.data || error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Cria um anúncio completo a partir de uma publicação existente
 */
const createFromPost = async (req, res) => {
    try {
        console.log('Iniciando criação de anúncio a partir de publicação existente (integração real)');
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
            callToAction, 
            postUrl 
        } = req.body;

        // Verificar campos obrigatórios
        const camposObrigatorios = {
            adAccountId: !!adAccountId,
            pageId: !!pageId,
            campaignName: !!campaignName,
            weeklyBudget: !!weeklyBudget,
            startDate: !!startDate,
            postUrl: !!postUrl
        };
        
        console.log('Validação de campos obrigatórios:', camposObrigatorios);
        
        const camposFaltantes = Object.entries(camposObrigatorios)
            .filter(([_, valor]) => !valor)
            .reduce((acc, [campo]) => ({ ...acc, [campo]: true }), {});
            
        if (Object.keys(camposFaltantes).length > 0) {
            console.error('❌ Erro: Campos obrigatórios não preenchidos:', camposFaltantes);
            return res.status(400).json({ 
                message: 'Campos obrigatórios não preenchidos', 
                camposFaltantes 
            });
        }
        
        // Validar CTA se fornecido
        if (callToAction && !isValidCTA(callToAction)) {
            console.error('❌ Erro: CTA inválido:', callToAction);
            return res.status(400).json({ 
                message: `CTA inválido: ${callToAction}. Valores válidos: ${VALID_CTA_TYPES.join(', ')}`,
                ctaValidos: VALID_CTA_TYPES
            });
        }

        // Extrair post_id da URL da publicação
        let postId = null;
        
        // Tentar extrair IDs da URL usando a função robusta
        const extractedIds = extractFacebookPostIds(postUrl, pageId);
        
        if (extractedIds && extractedIds.postId) {
            postId = extractedIds.postId;
            console.log(`✅ Post ID extraído com sucesso: ${postId}`);
        } else {
            // Tentar extrair usando regex simples como fallback
            const regexPostId = /\/posts\/(\d+)/;
            const match = postUrl.match(regexPostId);
            
            if (match && match[1]) {
                postId = match[1];
                console.log(`✅ Post ID extraído com regex simples: ${postId}`);
            } else {
                console.error('❌ Erro: Não foi possível extrair o ID da publicação da URL:', postUrl);
                return res.status(400).json({ 
                    message: 'URL da publicação inválida. Certifique-se de que o link está no formato correto (ex: https://www.facebook.com/{page_id}/posts/{post_id}).',
                    camposFaltantes: { postUrl: true }
                });
            }
        }

        // Obter informações de localização
        let location = { latitude: -23.5505, longitude: -46.6333, radius: 10 }; // Padrão: São Paulo com raio de 10km
        if (req.body.location) {
            try {
                if (typeof req.body.location === 'string') {
                    location = JSON.parse(req.body.location);
                } else if (req.body['location[latitude]'] && req.body['location[longitude]'] && req.body['location[radius]']) {
                    location = {
                        latitude: parseFloat(req.body['location[latitude]']),
                        longitude: parseFloat(req.body['location[longitude]']),
                        radius: parseInt(req.body['location[radius]'])
                    };
                }
                console.log('Localização processada:', location);
            } catch (error) {
                console.error('Erro ao processar localização:', error);
                console.log('Usando localização padrão:', location);
                // Continuar com a localização padrão se houver erro
            }
        }

        // Criar campanha, ad set, criativo e anúncio em sequência usando o token do usuário
        console.log('Iniciando criação de campanha...');
        const campaignResult = await createCampaign(userAccessToken, adAccountId, {
            name: campaignName
            // Não passamos objective, será usado o valor fixo DEFAULT_TRAFFIC_OBJECTIVE
        });

        console.log('Iniciando criação de ad set...');
        const adSetResult = await createAdSet(userAccessToken, adAccountId, campaignResult.id, {
            name: campaignName,
            weeklyBudget: parseFloat(weeklyBudget),
            startDate: startDate,
            endDate: endDate || null,
            location: location
        });

        console.log('Iniciando criação de criativo...');
        const creativeResult = await createAdCreative(userAccessToken, adAccountId, pageId, {
            name: campaignName,
            postId: postId, // Passar o ID da publicação extraído
            callToAction: callToAction || DEFAULT_CTA
        });

        console.log('Iniciando criação de anúncio...');
        const adResult = await createAd(userAccessToken, adAccountId, adSetResult.id, creativeResult.id, {
            name: campaignName
        });

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
            location: location,
            postUrl: postUrl,
            postId: postId,
            callToAction: callToAction || DEFAULT_CTA,
            status: 'ACTIVE',
            adSetId: adSetResult.id,
            adId: adResult.id,
            creativeId: creativeResult.id,
            createdAt: new Date(),
            type: 'post',
            objective: DEFAULT_TRAFFIC_OBJECTIVE // Usar o objetivo fixo
        };

        // Armazenar a campanha em memória (backup local)
        if (!campaignsStore[adAccountId]) {
            campaignsStore[adAccountId] = [];
        }
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
                    access_token: userAccessToken
                }
            }
        );

        console.log(`Encontradas ${response.data.data.length} campanhas.`);
        
        // Processar campanhas para formato padronizado
        const campaigns = response.data.data.map(campaign => {
            // Calcular orçamento semanal a partir do orçamento diário
            let weeklyBudget = null;
            let dailyBudget = null;
            
            if (campaign.daily_budget) {
                dailyBudget = parseFloat(campaign.daily_budget) / 100; // Converter de centavos para reais
                weeklyBudget = dailyBudget * 7;
            } else if (campaign.lifetime_budget) {
                // Se for orçamento vitalício, dividir por 30 dias para obter diário aproximado
                dailyBudget = parseFloat(campaign.lifetime_budget) / 100 / 30;
                weeklyBudget = dailyBudget * 7;
            }
            
            // Extrair métricas de insights se disponíveis
            let impressions = 0;
            let clicks = 0;
            let ctr = 0;
            let cpc = 0;
            let reach = 0;
            let spend = 0;
            
            if (campaign.insights && campaign.insights.data && campaign.insights.data.length > 0) {
                const insights = campaign.insights.data[0];
                impressions = parseInt(insights.impressions || 0);
                clicks = parseInt(insights.clicks || 0);
                ctr = parseFloat(insights.ctr || 0);
                cpc = parseFloat(insights.cpc || 0);
                reach = parseInt(insights.reach || 0);
                spend = parseFloat(insights.spend || 0);
            }
            
            return {
                id: campaign.id,
                campaignId: campaign.id,
                name: campaign.name,
                objective: campaign.objective,
                status: campaign.status,
                created_time: campaign.created_time,
                startDate: campaign.start_time,
                endDate: campaign.stop_time,
                dailyBudget: dailyBudget,
                weeklyBudget: weeklyBudget,
                metrics: {
                    impressions,
                    clicks,
                    ctr,
                    cpc,
                    reach,
                    spend
                }
            };
        });

        // Adicionar campanhas do armazenamento local se existirem
        if (campaignsStore[adAccountId] && campaignsStore[adAccountId].length > 0) {
            console.log(`Adicionando ${campaignsStore[adAccountId].length} campanhas do armazenamento local.`);
            
            // Verificar se alguma campanha local já existe na lista da API para evitar duplicatas
            const apiCampaignIds = campaigns.map(c => c.id);
            const localCampaignsToAdd = campaignsStore[adAccountId].filter(c => !apiCampaignIds.includes(c.id));
            
            campaigns.push(...localCampaignsToAdd);
        }

        // Ordenar campanhas por data de criação (mais recentes primeiro)
        campaigns.sort((a, b) => {
            const dateA = new Date(a.created_time || a.createdAt || a.startDate);
            const dateB = new Date(b.created_time || b.createdAt || b.startDate);
            return dateB - dateA;
        });

        res.status(200).json({
            success: true,
            count: campaigns.length,
            campaigns
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

module.exports = {
    createFromImage,
    createFromPost,
    getCampaigns
};
