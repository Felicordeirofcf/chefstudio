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

// Extensões de imagem válidas
const VALID_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

// Objetivo padrão para campanhas de tráfego
const DEFAULT_TRAFFIC_OBJECTIVE = 'LINK_CLICKS';

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
 * Verifica se a URL termina com uma extensão de imagem válida
 * @param {string} url - URL a ser validada
 * @returns {boolean} - True se a URL tem extensão de imagem válida
 */
const hasValidImageExtension = (url) => {
    if (!url) return false;
    
    // Remover parâmetros de query da URL
    const urlWithoutParams = url.split('?')[0].split('#')[0];
    
    // Verificar se a URL termina com uma extensão de imagem válida
    return VALID_IMAGE_EXTENSIONS.some(ext => 
        urlWithoutParams.toLowerCase().endsWith(ext)
    );
};

/**
 * Valida se uma URL é acessível e é uma imagem válida
 * @param {string} url - URL a ser validada
 * @returns {Promise<{isAccessible: boolean, contentType: string|null, error: string|null}>} - Resultado da validação
 */
const validateImageUrl = async (url) => {
    try {
        console.log(`Validando URL de imagem: ${url}`);
        
        // Verificar se a URL tem formato válido
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return {
                isAccessible: false,
                contentType: null,
                error: 'URL deve começar com http:// ou https://'
            };
        }
        
        // Verificar se a URL termina com extensão de imagem válida
        if (!hasValidImageExtension(url)) {
            console.warn(`URL não termina com extensão de imagem válida: ${url}`);
            // Não retornar erro aqui, pois alguns serviços de hospedagem não exigem extensão
        }
        
        // Fazer requisição HEAD para verificar se a URL é acessível
        const response = await axios.head(url, { 
            timeout: 5000,
            validateStatus: status => status < 400 // Aceitar qualquer status < 400
        });
        
        // Verificar o Content-Type da resposta
        const contentType = response.headers['content-type'];
        console.log(`Content-Type da URL: ${contentType}`);
        
        // Verificar se o Content-Type é de imagem
        const isImageContentType = contentType && contentType.startsWith('image/');
        
        if (!isImageContentType) {
            console.warn(`URL não tem Content-Type de imagem: ${contentType}`);
            // Se a URL tem extensão de imagem válida, aceitar mesmo sem Content-Type correto
            if (hasValidImageExtension(url)) {
                console.log('URL tem extensão de imagem válida, aceitando mesmo sem Content-Type correto');
                return {
                    isAccessible: true,
                    contentType: contentType,
                    error: null
                };
            }
            
            return {
                isAccessible: false,
                contentType: contentType,
                error: `URL não é uma imagem válida (Content-Type: ${contentType})`
            };
        }
        
        return {
            isAccessible: true,
            contentType: contentType,
            error: null
        };
    } catch (error) {
        console.error(`Erro ao validar URL de imagem: ${url}`, error.message);
        return {
            isAccessible: false,
            contentType: null,
            error: `Erro ao acessar URL: ${error.message}`
        };
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
        
        // Validar o objetivo da campanha
        let objective = campaignData.objective || DEFAULT_TRAFFIC_OBJECTIVE;
        if (!isValidObjective(objective)) {
            console.error(`Objetivo inválido: ${objective}. Usando objetivo padrão: ${DEFAULT_TRAFFIC_OBJECTIVE}`);
            objective = DEFAULT_TRAFFIC_OBJECTIVE;
        }
        
        console.log(`Usando objetivo: ${objective}`);
        
        // Construir payload para a API do Meta
        const campaignPayload = {
            name: campaignData.name,
            objective: objective,
            status: 'ACTIVE',
            special_ad_categories: '[]',
            access_token: userAccessToken // Usar token do usuário
        };
        
        console.log('Enviando payload para criação de campanha:', JSON.stringify(campaignPayload, null, 2));
        
        const response = await axios.post(
            `${META_API_BASE_URL}/${adAccountId}/campaigns`,
            campaignPayload
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
            originalname: file.originalname,
            path: file.path,
            mimetype: file.mimetype,
            size: file.size
        });
        
        // Verificar se o arquivo é uma imagem válida
        if (!file.mimetype || !file.mimetype.startsWith('image/')) {
            throw new Error(`Arquivo não é uma imagem válida (mimetype: ${file.mimetype})`);
        }
        
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
        
        console.log('Resposta do upload de imagem:', JSON.stringify(uploadResponse.data, null, 2));
        
        // Verificar se a resposta contém imagens
        if (!uploadResponse.data.images || Object.keys(uploadResponse.data.images).length === 0) {
            throw new Error('Resposta do upload não contém imagens');
        }
        
        const images = uploadResponse.data.images;
        const imageHash = Object.keys(images)[0];
        const imageData = images[imageHash];
        
        if (!imageHash) {
            throw new Error('Não foi possível obter o hash da imagem');
        }
        
        console.log('Hash da imagem obtido:', imageHash);
        
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
        console.log('Dados do criativo:', JSON.stringify(creativeData, null, 2));
        
        let imageHash = null;
        let imageUrl = null;
        
        // Processar imagem (upload de arquivo ou URL externa)
        if (file) {
            console.log('Usando arquivo de imagem enviado');
            // Fazer upload da imagem e obter hash e URL
            const imageData = await uploadImage(userAccessToken, adAccountId, file);
            imageHash = imageData.hash;
            imageUrl = imageData.url;
            
            if (!imageHash) {
                throw new Error('Falha ao obter hash da imagem após upload');
            }
            
            console.log('Hash da imagem obtido após upload:', imageHash);
        } else if (creativeData.imageUrl) {
            console.log('Usando URL de imagem externa:', creativeData.imageUrl);
            
            // Validar URL da imagem
            const validationResult = await validateImageUrl(creativeData.imageUrl);
            
            if (!validationResult.isAccessible) {
                throw new Error(`URL da imagem inválida ou inacessível: ${validationResult.error}`);
            }
            
            console.log('URL da imagem validada com sucesso:', creativeData.imageUrl);
            
            // Tentar fazer upload da imagem para o Meta Ads a partir da URL
            try {
                console.log('Tentando fazer upload da imagem para o Meta Ads a partir da URL');
                
                const uploadResponse = await axios.post(
                    `${META_API_BASE_URL}/${adAccountId}/adimages`,
                    {
                        url: creativeData.imageUrl,
                        access_token: userAccessToken
                    }
                );
                
                console.log('Resposta do upload de imagem por URL:', JSON.stringify(uploadResponse.data, null, 2));
                
                if (uploadResponse.data.images && Object.keys(uploadResponse.data.images).length > 0) {
                    const images = uploadResponse.data.images;
                    const uploadedImageHash = Object.keys(images)[0];
                    const uploadedImageData = images[uploadedImageHash];
                    
                    imageHash = uploadedImageHash;
                    
                    if (uploadedImageData && uploadedImageData.url) {
                        imageUrl = uploadedImageData.url;
                    } else if (uploadedImageData && uploadedImageData.permalink_url) {
                        imageUrl = uploadedImageData.permalink_url;
                    } else {
                        imageUrl = creativeData.imageUrl; // Manter URL original se não conseguir obter do Meta
                    }
                    
                    console.log('Hash da imagem obtido após upload por URL:', imageHash);
                } else {
                    throw new Error('Resposta do upload por URL não contém imagens');
                }
            } catch (uploadError) {
                console.error('Erro ao fazer upload da imagem por URL:', uploadError.message);
                console.error('Detalhes do erro:', uploadError.response?.data || uploadError);
                
                // Se falhar o upload por URL, usar a URL diretamente no criativo
                console.log('Usando URL da imagem diretamente no criativo');
                imageUrl = creativeData.imageUrl;
                imageHash = null; // Não temos hash, vamos usar URL diretamente
            }
        } else {
            throw new Error('Nenhuma imagem fornecida (nem arquivo nem URL)');
        }
        
        // Validar message (texto do anúncio)
        if (!creativeData.adDescription && !creativeData.message) {
            throw new Error('Texto do anúncio (message/adDescription) é obrigatório');
        }
        
        // Usar message ou adDescription, priorizando message se ambos estiverem presentes
        const adMessage = creativeData.message || creativeData.adDescription;
        
        // Validar CTA
        let ctaType = creativeData.callToAction || DEFAULT_CTA;
        if (!isValidCTA(ctaType)) {
            console.warn(`CTA inválido: ${ctaType}. Usando CTA padrão: ${DEFAULT_CTA}`);
            ctaType = DEFAULT_CTA;
        }
        
        // Construir payload para criação de criativo
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
        
        // Adicionar imagem ao criativo
        if (imageHash) {
            // Se temos hash, usar image_hash
            console.log('Usando image_hash no criativo:', imageHash);
            creativePayload.object_story_spec.link_data.image_hash = imageHash;
        } else if (imageUrl) {
            // Se não temos hash mas temos URL, usar image_url
            console.log('Usando image_url no criativo:', imageUrl);
            creativePayload.object_story_spec.link_data.image_url = imageUrl;
        }
        
        if (creativeData.adTitle) {
            creativePayload.object_story_spec.link_data.name = creativeData.adTitle;
        }
        
        // Se for anúncio de post, adicionar object_story_id
        if (creativeData.postId) {
            console.log('Criando criativo a partir de post ID:', creativeData.postId);
            creativePayload.object_story_id = `${pageId}_${creativeData.postId}`;
            // Remover link_data se object_story_id for usado
            delete creativePayload.object_story_spec.link_data;
        }

        console.log('Enviando payload para criação de criativo:', JSON.stringify(creativePayload, null, 2));
        const response = await axios.post(
            `${META_API_BASE_URL}/${adAccountId}/adcreatives`,
            creativePayload
        );
        
        console.log('Ad Creative criado com sucesso:', response.data);
        
        // Adicionar URL da imagem ao resultado
        return {
            ...response.data,
            imageUrl: imageUrl
        };
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
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
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
            adDescription,
            message,
            adTitle,
            callToAction,
            menuUrl,
            objective,
            image_url
        } = req.body;

        // Log detalhado dos campos recebidos
        console.log('Campos recebidos:', {
            adAccountId,
            pageId,
            campaignName,
            weeklyBudget,
            startDate,
            endDate,
            adDescription: adDescription ? `${adDescription.substring(0, 20)}...` : null,
            message: message ? `${message.substring(0, 20)}...` : null,
            adTitle,
            callToAction,
            menuUrl,
            objective,
            image_url
        });

        // Verificar campos obrigatórios
        const camposObrigatorios = {
            imagem: !!req.file || !!image_url,
            adAccountId: !!adAccountId,
            pageId: !!pageId,
            campaignName: !!campaignName,
            weeklyBudget: !!weeklyBudget,
            startDate: !!startDate,
            message: !!(message || adDescription),
            objective: !!objective // Tornar objective obrigatório
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
        
        // Validar objetivo da campanha
        if (!isValidObjective(objective)) {
            console.error('❌ Erro: Objetivo inválido:', objective);
            return res.status(400).json({ 
                message: `Objetivo inválido: ${objective}. Valores válidos: ${VALID_OBJECTIVES.join(', ')}`,
                objetivosValidos: VALID_OBJECTIVES
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
                console.log('Validando URL da imagem:', image_url);
                const validationResult = await validateImageUrl(image_url);
                
                if (!validationResult.isAccessible) {
                    console.error('❌ Erro: URL da imagem inválida ou inacessível:', validationResult.error);
                    return res.status(400).json({ 
                        message: `URL da imagem inválida ou inacessível: ${validationResult.error}`,
                        camposFaltantes: { image_url: true }
                    });
                }
                
                console.log('✅ URL da imagem validada com sucesso:', image_url);
                console.log('Content-Type:', validationResult.contentType);
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
        console.log('Usando objetivo:', objective);
        const campaignResult = await createCampaign(userAccessToken, adAccountId, {
            name: campaignName,
            objective: objective // Usar o objetivo fornecido pelo frontend
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
            message: message,
            adTitle: adTitle,
            callToAction: callToAction || DEFAULT_CTA,
            menuUrl: menuUrl,
            imageUrl: image_url
        }, req.file);

        console.log('Iniciando criação de anúncio...');
        const adResult = await createAd(userAccessToken, adAccountId, adSetResult.id, creativeResult.id, {
            name: campaignName
        });

        // Armazenar informações da campanha criada (backup local)
        campaignsStore[adResult.id] = {
            campaignId: campaignResult.id,
            adSetId: adSetResult.id,
            creativeId: creativeResult.id,
            adId: adResult.id,
            name: campaignName,
            objective: objective,
            weeklyBudget: parseFloat(weeklyBudget),
            startDate: startDate,
            endDate: endDate,
            createdAt: new Date().toISOString()
        };

        // Retornar informações da campanha criada
        return res.status(201).json({
            message: 'Anúncio criado com sucesso',
            campaignId: campaignResult.id,
            adSetId: adSetResult.id,
            creativeId: creativeResult.id,
            adId: adResult.id,
            imageUrl: creativeResult.imageUrl,
            adDetails: {
                name: campaignName,
                objective: objective,
                dailyBudget: parseFloat(weeklyBudget) / 7,
                startDate: startDate,
                endDate: endDate,
                status: 'ACTIVE'
            }
        });
    } catch (error) {
        console.error('Erro ao criar anúncio a partir de imagem:', error);
        
        // Log detalhado do erro para diagnóstico
        if (error.response) {
            console.error('Detalhes do erro da API:', JSON.stringify(error.response.data || {}));
        }
        
        return res.status(500).json({
            message: 'Erro ao criar anúncio',
            error: error.response?.data || { message: error.message }
        });
    }
};

/**
 * Cria um anúncio completo a partir de uma publicação existente
 */
const createFromPost = async (req, res) => {
    try {
        console.log('Iniciando criação de anúncio a partir de publicação (integração real)');
        console.log('Corpo da requisição (req.body):', req.body);

        // Verificar se o usuário está autenticado
        if (!req.user) {
            console.error('❌ Erro: Usuário não autenticado.');
            return res.status(401).json({ message: 'Usuário não autenticado. Por favor, faça login novamente.' });
        }
        
        // Obter token de acesso do usuário autenticado
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
            menuUrl,
            objective
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
            menuUrl,
            objective
        });

        // Verificar campos obrigatórios
        const camposObrigatorios = {
            adAccountId: !!adAccountId,
            pageId: !!pageId,
            campaignName: !!campaignName,
            weeklyBudget: !!weeklyBudget,
            startDate: !!startDate,
            postUrl: !!postUrl,
            objective: !!objective // Tornar objective obrigatório
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
        
        // Validar objetivo da campanha
        if (!isValidObjective(objective)) {
            console.error('❌ Erro: Objetivo inválido:', objective);
            return res.status(400).json({ 
                message: `Objetivo inválido: ${objective}. Valores válidos: ${VALID_OBJECTIVES.join(', ')}`,
                objetivosValidos: VALID_OBJECTIVES
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

        // Extrair ID da publicação da URL
        let postId = null;
        
        // Log da URL da publicação para diagnóstico
        console.log('URL da publicação recebida:', postUrl);
        
        try {
            // Suporte para diferentes formatos de URL do Facebook
            if (postUrl.includes('facebook.com/permalink.php')) {
                // Formato: https://www.facebook.com/permalink.php?story_fbid=123456789&id=987654321
                const urlObj = new URL(postUrl);
                const storyFbid = urlObj.searchParams.get('story_fbid');
                if (storyFbid) {
                    postId = storyFbid;
                }
            } else if (postUrl.includes('facebook.com/photo.php') || postUrl.includes('facebook.com/photo/')) {
                // Formato: https://www.facebook.com/photo.php?fbid=123456789
                // ou https://www.facebook.com/photo/?fbid=123456789
                const urlObj = new URL(postUrl);
                const fbid = urlObj.searchParams.get('fbid');
                if (fbid) {
                    postId = fbid;
                }
            } else if (postUrl.includes('/posts/')) {
                // Formato: https://www.facebook.com/username/posts/123456789
                const parts = postUrl.split('/posts/');
                if (parts.length > 1) {
                    postId = parts[1].split('?')[0].split('/')[0];
                }
            } else if (postUrl.includes('/videos/')) {
                // Formato: https://www.facebook.com/username/videos/123456789
                const parts = postUrl.split('/videos/');
                if (parts.length > 1) {
                    postId = parts[1].split('?')[0].split('/')[0];
                }
            } else if (postUrl.includes('/photos/')) {
                // Formato: https://www.facebook.com/username/photos/a.123456789/987654321
                const parts = postUrl.split('/photos/');
                if (parts.length > 1) {
                    const photoId = parts[1].split('?')[0].split('/').pop();
                    if (photoId && photoId.match(/^\d+$/)) {
                        postId = photoId;
                    }
                }
            }
            
            // Se não conseguiu extrair o ID por nenhum dos métodos acima, tentar extrair qualquer número da URL
            if (!postId) {
                const matches = postUrl.match(/\d{15,}/g); // Procurar números com pelo menos 15 dígitos
                if (matches && matches.length > 0) {
                    postId = matches[0];
                }
            }
            
            console.log('ID da publicação extraído:', postId);
            
            if (!postId) {
                throw new Error('Não foi possível extrair o ID da publicação da URL fornecida');
            }
        } catch (error) {
            console.error('❌ Erro ao extrair ID da publicação:', error);
            return res.status(400).json({ 
                message: 'URL da publicação inválida ou não suportada', 
                error: error.message 
            });
        }

        // Obter informações de localização
        let location = { latitude: -23.5505, longitude: -46.6333, radius: 10 }; // Padrão: São Paulo com raio de 10km
        if (req.body.location) {
            try {
                if (typeof req.body.location === 'string') {
                    location = JSON.parse(req.body.location);
                } else if (typeof req.body.location === 'object') {
                    location = req.body.location;
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
        console.log('Usando objetivo:', objective);
        const campaignResult = await createCampaign(userAccessToken, adAccountId, {
            name: campaignName,
            objective: objective // Usar o objetivo fornecido pelo frontend
        });

        console.log('Iniciando criação de ad set...');
        const adSetResult = await createAdSet(userAccessToken, adAccountId, campaignResult.id, {
            name: campaignName,
            weeklyBudget: parseFloat(weeklyBudget),
            startDate: startDate,
            endDate: endDate || null,
            location: location
        });

        console.log('Iniciando criação de criativo a partir de publicação...');
        const creativeResult = await createAdCreative(userAccessToken, adAccountId, pageId, {
            name: campaignName,
            postId: postId,
            callToAction: callToAction || DEFAULT_CTA,
            menuUrl: menuUrl
        });

        console.log('Iniciando criação de anúncio...');
        const adResult = await createAd(userAccessToken, adAccountId, adSetResult.id, creativeResult.id, {
            name: campaignName
        });

        // Armazenar informações da campanha criada (backup local)
        campaignsStore[adResult.id] = {
            campaignId: campaignResult.id,
            adSetId: adSetResult.id,
            creativeId: creativeResult.id,
            adId: adResult.id,
            name: campaignName,
            objective: objective,
            weeklyBudget: parseFloat(weeklyBudget),
            startDate: startDate,
            endDate: endDate,
            postUrl: postUrl,
            postId: postId,
            createdAt: new Date().toISOString()
        };

        // Retornar informações da campanha criada
        return res.status(201).json({
            message: 'Anúncio criado com sucesso a partir de publicação',
            campaignId: campaignResult.id,
            adSetId: adSetResult.id,
            creativeId: creativeResult.id,
            adId: adResult.id,
            postId: postId,
            adDetails: {
                name: campaignName,
                objective: objective,
                dailyBudget: parseFloat(weeklyBudget) / 7,
                startDate: startDate,
                endDate: endDate,
                status: 'ACTIVE'
            }
        });
    } catch (error) {
        console.error('Erro ao criar anúncio a partir de publicação:', error);
        
        // Log detalhado do erro para diagnóstico
        if (error.response) {
            console.error('Detalhes do erro da API:', JSON.stringify(error.response.data || {}));
        }
        
        return res.status(500).json({
            message: 'Erro ao criar anúncio',
            error: error.response?.data || { message: error.message }
        });
    }
};

/**
 * Obtém as campanhas do usuário
 */
const getCampaigns = async (req, res) => {
    try {
        console.log('Obtendo campanhas do usuário (integração real)');
        
        // Verificar se o usuário está autenticado
        if (!req.user) {
            console.error('❌ Erro: Usuário não autenticado.');
            return res.status(401).json({ message: 'Usuário não autenticado. Por favor, faça login novamente.' });
        }
        
        // Obter token de acesso do usuário autenticado
        const userAccessToken = getUserMetaToken(req.user);
        
        if (!userAccessToken) {
            console.error('❌ Erro: Token de acesso Meta do usuário não encontrado.');
            return res.status(401).json({ message: 'Token Meta não encontrado. Por favor, conecte sua conta Meta.' });
        }

        console.log('Token Meta do usuário obtido com sucesso (primeiros 10 caracteres):', userAccessToken.substring(0, 10) + '...');

        const { adAccountId } = req.query;
        
        if (!adAccountId) {
            return res.status(400).json({ message: 'ID da conta de anúncios é obrigatório' });
        }

        // Obter campanhas da API do Meta
        const response = await axios.get(
            `${META_API_BASE_URL}/${adAccountId}/campaigns`,
            {
                headers: {
                    Authorization: `Bearer ${userAccessToken}`
                },
                params: {
                    fields: 'id,name,objective,status,created_time,updated_time,start_time,stop_time,daily_budget,lifetime_budget',
                    limit: 100
                }
            }
        );

        console.log(`Obtidas ${response.data.data.length} campanhas da API do Meta`);

        // Retornar campanhas
        return res.status(200).json({
            message: 'Campanhas obtidas com sucesso',
            campaigns: response.data.data
        });
    } catch (error) {
        console.error('Erro ao obter campanhas:', error);
        
        // Log detalhado do erro para diagnóstico
        if (error.response) {
            console.error('Detalhes do erro da API:', JSON.stringify(error.response.data || {}));
        }
        
        return res.status(500).json({
            message: 'Erro ao obter campanhas',
            error: error.response?.data || { message: error.message }
        });
    }
};

module.exports = {
    createFromImage,
    createFromPost,
    getCampaigns
};
