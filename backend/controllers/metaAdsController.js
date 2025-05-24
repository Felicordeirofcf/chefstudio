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
const createAdCreative = async (userAccessToken, adAccountId, pageId, creativeData, file = null) => {
    try {
        console.log(`Criando ad creative real no Meta Ads para conta ${adAccountId}`);
        console.log('Dados do criativo:', creativeData);
        
        // Se for anúncio de publicação existente (postId presente)
        if (creativeData.postId) {
            let objectStoryId;
            
            // Verificar se o postId é um pfbid e convertê-lo se necessário
            if (creativeData.postId.includes('pfbid')) {
                console.log(`Detectado pfbid no postId: ${creativeData.postId}`);
                try {
                    // Converter pfbid para object_story_id usando a Graph API
                    objectStoryId = await convertPfbidToObjectStoryId(creativeData.postId, pageId, userAccessToken);
                    console.log(`Object Story ID convertido via Graph API: ${objectStoryId}`);
                } catch (error) {
                    console.error(`Erro ao converter pfbid: ${error.message}`);
                    // Se falhar a conversão, tentar montar o object_story_id diretamente
                    objectStoryId = `${pageId}_${creativeData.postId}`;
                    console.log(`Usando object_story_id montado diretamente: ${objectStoryId}`);
                }
            } else {
                // Se não for pfbid, montar o object_story_id diretamente
                objectStoryId = `${pageId}_${creativeData.postId}`;
                console.log(`Object Story ID montado diretamente: ${objectStoryId}`);
            }
            
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
                console.warn('Aviso: Nenhum texto fornecido para o anúncio. Usando texto padrão.');
                creativeData.adDescription = 'Confira nossa oferta especial!';
            }
            
            // Validar título do anúncio
            if (!creativeData.adTitle) {
                console.warn('Aviso: Nenhum título fornecido para o anúncio. Usando título padrão.');
                creativeData.adTitle = 'Oferta Especial';
            }
            
            // Validar URL de destino
            if (!creativeData.menuUrl) {
                console.warn('Aviso: Nenhuma URL de destino fornecida. Usando URL padrão.');
                creativeData.menuUrl = 'https://www.facebook.com';
            }
            
            // Validar Call to Action
            if (!creativeData.callToAction) {
                console.warn('Aviso: Nenhum CTA fornecido. Usando CTA padrão.');
                creativeData.callToAction = DEFAULT_CTA;
            }
            
            // Criar payload com object_story_spec para anúncios com imagem
            const creativePayload = {
                name: `${creativeData.name} - Creative`,
                object_story_spec: {
                    page_id: pageId,
                    link_data: {
                        message: creativeData.message || creativeData.adDescription,
                        link: creativeData.menuUrl,
                        name: creativeData.adTitle,
                        call_to_action: {
                            type: creativeData.callToAction
                        }
                    }
                },
                access_token: userAccessToken
            };
            
            // Adicionar imagem ao payload se disponível
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
            
            // Adicionar URL da imagem ao resultado para referência
            response.data.imageUrl = imageUrl;
            
            return response.data;
        }
    } catch (error) {
        console.error('Erro ao criar criativo de anúncio:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Detalhes do erro:', JSON.stringify(error.response.data));
        }
        
        // Verificar se é um erro específico de publicação não encontrada ou inacessível
        if (error.response?.data?.error?.code === 100 && error.response?.data?.error?.error_subcode === 1487472) {
            throw new Error('Não é possível usar esta publicação em um anúncio. Verifique se a publicação está pública e pertence à página selecionada.');
        }
        
        // Verificar se é um erro de parâmetro inválido (post_id)
        if (error.response?.data?.error?.code === 100 && error.response?.data?.error?.error_user_msg?.includes('Invalid post_id parameter')) {
            throw new Error('ID da publicação inválido. Verifique se o link da publicação está correto e se a publicação está pública.');
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
        console.log(`Criando anúncio real no Meta Ads para ad set ${adSetId} e criativo ${creativeId}`);
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
            startDate: !!startDate,
            menuUrl: !!menuUrl
        };
        
        // Se não tiver arquivo de imagem, verificar se tem URL de imagem
        if (!req.file) {
            camposObrigatorios.image_url = !!image_url;
        }
        
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
    getMetrics
};
