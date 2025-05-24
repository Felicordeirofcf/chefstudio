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
 * Verifica se uma publicação existe e está acessível
 * @param {string} userAccessToken - Token de acesso do usuário Meta
 * @param {string} objectStoryId - ID da publicação no formato pageId_postId
 * @returns {Promise<boolean>} - True se a publicação existe e está acessível, false caso contrário
 */
const validatePostExists = async (userAccessToken, objectStoryId) => {
    try {
        console.log(`Validando existência da publicação: ${objectStoryId}`);
        
        // Extrair pageId e postId do objectStoryId
        const [pageId, postId] = objectStoryId.split('_');
        
        if (!pageId || !postId) {
            console.error('❌ Erro: object_story_id inválido, formato esperado: pageId_postId');
            return false;
        }
        
        // Tentar buscar a publicação usando o token do usuário
        const response = await axios.get(`${META_API_BASE_URL}/${postId}`, {
            params: {
                fields: 'id,permalink_url,is_published',
                access_token: userAccessToken
            }
        });
        
        // Verificar se a publicação existe e está publicada
        if (response.data && response.data.id) {
            console.log('✅ Publicação encontrada:', response.data);
            
            // Verificar se a publicação está publicada
            if (response.data.is_published === false) {
                console.error('❌ Erro: A publicação existe, mas não está publicada');
                return false;
            }
            
            return true;
        }
        
        console.error('❌ Erro: Publicação não encontrada');
        return false;
    } catch (error) {
        console.error('❌ Erro ao validar publicação:', error.response?.data || error.message);
        
        // Verificar se o erro é de permissão ou publicação não encontrada
        if (error.response?.data?.error) {
            const errorCode = error.response.data.error.code;
            const errorMessage = error.response.data.error.message;
            
            // Códigos comuns: 100 (parâmetro inválido), 190 (token inválido), 10 (permissão)
            console.error(`Código de erro: ${errorCode}, Mensagem: ${errorMessage}`);
            
            // Se for erro de permissão, pode ser que a publicação exista mas o usuário não tenha acesso
            if (errorCode === 10) {
                console.warn('⚠️ Aviso: Erro de permissão ao validar publicação. A publicação pode existir, mas o token não tem permissão para acessá-la.');
                // Retornar true neste caso, pois o Meta Ads pode ter permissão mesmo que a API Graph não tenha
                return true;
            }
        }
        
        return false;
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
            
            // Validar se a publicação existe e está acessível
            try {
                const isValid = await validatePostExists(userAccessToken, objectStoryId);
                if (!isValid) {
                    throw new Error(`Publicação não encontrada ou não está acessível: ${objectStoryId}`);
                }
                console.log('✅ Publicação validada com sucesso!');
            } catch (validationError) {
                console.warn('⚠️ Aviso na validação da publicação:', validationError.message);
                // Continuar mesmo com erro de validação, pois pode ser apenas um problema de permissão da API
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
        
        if (error.response) {
            console.error('Detalhes do erro de criação de anúncio:', {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            });
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
        console.log('Arquivo recebido (req.file):', req.file ? {
            originalname: req.file.originalname,
            path: req.file.path,
            mimetype: req.file.mimetype,
            size: req.file.size
        } : 'Nenhum arquivo recebido');

        // Verificar se o usuário está autenticado
        if (!req.user) {
            console.error('❌ Erro: Usuário não autenticado.');
            return res.status(401).json({ message: 'Usuário não autenticado. Por favor, faça login novamente.' });
        }
        
        // Obter token de acesso do usuário autenticado (verificar ambos os campos para compatibilidade)
        const userAccessToken = getUserMetaToken(req.user);
        
        if (!userAccessToken) {
            console.error('❌ Erro: Token de acesso Meta do usuário não encontrado.');
            return res.status(401).json({ message: 'Token Meta não encontrado. Por favor, conecte sua conta Meta.' });
        }

        console.log('Token Meta do usuário obtido com sucesso (primeiros 10 caracteres):', userAccessToken.substring(0, 10) + '...');

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
            image_url,
            objective // Ignorado, será usado o valor fixo
        } = req.body;

        // Log detalhado dos campos recebidos
        console.log('Campos recebidos:', {
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
            image_url,
            objective
        });

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
        
        // Obter token de acesso do usuário autenticado (verificar ambos os campos para compatibilidade)
        const userAccessToken = getUserMetaToken(req.user);
        
        if (!userAccessToken) {
            console.error('❌ Erro: Token de acesso Meta do usuário não encontrado.');
            return res.status(401).json({ message: 'Token Meta não encontrado. Por favor, conecte sua conta Meta.' });
        }

        console.log('Token Meta do usuário obtido com sucesso (primeiros 10 caracteres):', userAccessToken.substring(0, 10) + '...');

        const {
            adAccountId,
            pageId,
            campaignName,
            weeklyBudget,
            startDate,
            endDate,
            postUrl,
            callToAction,
            objective // Ignorado, será usado o valor fixo
        } = req.body;

        // Log detalhado dos campos recebidos
        console.log('Campos recebidos:', {
            adAccountId,
            pageId,
            campaignName,
            weeklyBudget,
            startDate,
            endDate,
            postUrl,
            callToAction,
            objective
        });

        // Verificar campos obrigatórios
        const camposObrigatorios = {
            postUrl: !!postUrl,
            adAccountId: !!adAccountId,
            pageId: !!pageId,
            campaignName: !!campaignName,
            weeklyBudget: !!weeklyBudget,
            startDate: !!startDate
        };
        
        console.log('Validação de campos obrigatórios:', camposObrigatorios);
        
        if (!postUrl) {
            console.error('❌ Erro: URL da publicação não fornecida');
            return res.status(400).json({ message: 'URL da publicação é obrigatória', camposFaltantes: { postUrl: true } });
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

        // Extrair ID da publicação da URL
        let postId = null;
        try {
            console.log('Tentando extrair ID da publicação da URL:', postUrl);
            
            // Tentar extrair o ID da publicação da URL
            // Exemplo: https://www.facebook.com/123456789/posts/987654321
            // ou https://www.facebook.com/permalink.php?story_fbid=987654321&id=123456789
            // ou https://www.facebook.com/photo/?fbid=122102873852863870&set=a.122102873882863870
            const postUrlObj = new URL(postUrl);
            const pathname = postUrlObj.pathname;
            const searchParams = postUrlObj.searchParams;
            
            console.log('URL parseada:', {
                pathname,
                searchParams: Object.fromEntries(searchParams.entries())
            });
            
            if (pathname.includes('/posts/')) {
                // Formato: /username/posts/postid
                postId = pathname.split('/posts/')[1].split('/')[0];
                console.log('ID extraído do formato /posts/:', postId);
            } else if (pathname.includes('/permalink.php')) {
                // Formato: /permalink.php?story_fbid=postid&id=pageid
                postId = searchParams.get('story_fbid');
                console.log('ID extraído do formato permalink.php:', postId);
            } else if (pathname.includes('/photo/') || pathname === '/photo') {
                // Formato: /photo/?fbid=postid&set=a.albumid
                postId = searchParams.get('fbid');
                console.log('ID extraído do formato photo/?fbid=:', postId);
            } else if (pathname.includes('/photos/')) {
                // Formato: /username/photos/postid
                postId = pathname.split('/photos/')[1].split('/')[0];
                console.log('ID extraído do formato /photos/:', postId);
            } else if (pathname.includes('/pfbid')) {
                // Formato: /pagename/posts/pfbid...
                const parts = pathname.split('/');
                for (const part of parts) {
                    if (part.startsWith('pfbid')) {
                        postId = part;
                        console.log('ID extraído do formato pfbid:', postId);
                        break;
                    }
                }
            } else {
                // Tentar extrair de outros formatos
                const matches = postUrl.match(/\/(\d+)(?:\/|$)/g);
                if (matches && matches.length > 0) {
                    postId = matches[matches.length - 1].replace(/\//g, '');
                    console.log('ID extraído de formato genérico:', postId);
                }
                
                // Se ainda não encontrou, tentar extrair de parâmetros de URL
                if (!postId) {
                    // Verificar parâmetros comuns
                    const possibleParams = ['fbid', 'id', 'post_id', 'story_fbid'];
                    for (const param of possibleParams) {
                        const value = searchParams.get(param);
                        if (value) {
                            postId = value;
                            console.log(`ID extraído do parâmetro ${param}:`, postId);
                            break;
                        }
                    }
                }
            }
            
            if (!postId) {
                throw new Error('Não foi possível extrair o ID da publicação da URL');
            }
            
            console.log('ID da publicação extraído com sucesso:', postId);
            
            // Validar o formato do object_story_id
            const objectStoryId = `${pageId}_${postId}`;
            console.log(`Object Story ID montado: ${objectStoryId}`);
            
            // Validar se a publicação existe e está acessível
            try {
                const isValid = await validatePostExists(userAccessToken, objectStoryId);
                if (!isValid) {
                    console.warn('⚠️ Aviso: Publicação pode não estar acessível, mas continuando mesmo assim...');
                } else {
                    console.log('✅ Publicação validada com sucesso!');
                }
            } catch (validationError) {
                console.warn('⚠️ Aviso na validação da publicação:', validationError.message);
                // Continuar mesmo com erro de validação, pois pode ser apenas um problema de permissão da API
            }
            
        } catch (error) {
            console.error('❌ Erro ao extrair ID da publicação:', error.message);
            return res.status(400).json({ 
                message: 'URL da publicação inválida ou não suportada. Não foi possível extrair o ID da publicação.',
                error: error.message
            });
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
            postId: postId,
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
            message: 'Erro ao criar anúncio',
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
        console.log('Buscando campanhas do Meta Ads');
        
        // Verificar se o usuário está autenticado
        if (!req.user) {
            console.error('❌ Erro: Usuário não autenticado.');
            return res.status(401).json({ message: 'Usuário não autenticado. Por favor, faça login novamente.' });
        }
        
        // Obter token de acesso do usuário autenticado (verificar ambos os campos para compatibilidade)
        const userAccessToken = getUserMetaToken(req.user);
        
        if (!userAccessToken) {
            console.error('❌ Erro: Token de acesso Meta do usuário não encontrado.');
            return res.status(401).json({ message: 'Usuário não autenticado ou token Meta não encontrado. Por favor, conecte sua conta Meta.' });
        }

        console.log('Token Meta do usuário obtido com sucesso (primeiros 10 caracteres):', userAccessToken.substring(0, 10) + '...');

        const { adAccountId } = req.query;
        
        if (!adAccountId) {
            console.error('❌ Erro: ID da conta de anúncios não fornecido');
            return res.status(400).json({ message: 'ID da conta de anúncios (adAccountId) é obrigatório' });
        }

        // Buscar campanhas da API do Meta
        console.log(`Buscando campanhas para a conta ${adAccountId}...`);
        const response = await axios.get(`${META_API_BASE_URL}/${adAccountId}/campaigns`, {
            params: {
                fields: 'id,name,status,objective,created_time,start_time,stop_time,daily_budget,lifetime_budget,budget_remaining'
                // access_token: userAccessToken // REMOVIDO - Token agora vai no header
            },
            headers: {
                'Authorization': `Bearer ${userAccessToken}` // Adicionar token no header
            }
        });

        console.log(`Campanhas encontradas para a conta ${adAccountId}:`, response.data.data.length);

        // Combinar com campanhas armazenadas localmente (se necessário)
        const localCampaigns = campaignsStore[adAccountId] || [];
        const combinedCampaigns = [...localCampaigns, ...response.data.data]; // Dar preferência às locais?

        // Filtrar duplicatas (se houver)
        const uniqueCampaigns = Array.from(new Map(combinedCampaigns.map(c => [c.id, c])).values());

        console.log(`Total de campanhas após combinação e remoção de duplicatas: ${uniqueCampaigns.length}`);
        res.status(200).json({ campaigns: uniqueCampaigns });

    } catch (error) {
        console.error('❌ Erro ao buscar campanhas do Meta Ads:', error.response?.data || error.message);
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
            message: 'Erro ao buscar campanhas',
            error: error.response?.data || error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

module.exports = {
    createFromImage,
    createFromPost,
    getCampaigns,
    // Exportar funções auxiliares se forem usadas em outros lugares (não é o caso aqui)
    // createCampaign, createAdSet, uploadImage, createAdCreative, createAd
};
