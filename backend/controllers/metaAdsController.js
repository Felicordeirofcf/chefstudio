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

// Objetivo padrão para campanhas de tráfego
const DEFAULT_TRAFFIC_OBJECTIVE = 'OUTCOME_TRAFFIC';

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
        const objective = campaignData.objective || DEFAULT_TRAFFIC_OBJECTIVE;
        if (!isValidObjective(objective)) {
            console.error(`Objetivo inválido: ${objective}. Usando objetivo padrão: ${DEFAULT_TRAFFIC_OBJECTIVE}`);
            objective = DEFAULT_TRAFFIC_OBJECTIVE;
        }
        
        console.log(`Usando objetivo: ${objective}`);
        
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
 * @returns {Promise<string>} - Hash da imagem
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
        console.log('Upload de imagem concluído, hash:', imageHash);
        
        // Limpar arquivo temporário após upload
        fs.unlink(file.path, (err) => {
            if (err) console.error('Erro ao limpar arquivo temporário:', err);
        });
        return imageHash;
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
        
        let imageHash = null;
        if (file) {
            imageHash = await uploadImage(userAccessToken, adAccountId, file); // Passar token do usuário
        }
        
        const creativePayload = {
            name: `${creativeData.name} - Creative`,
            object_story_spec: {
                page_id: pageId,
                link_data: {
                    message: creativeData.adDescription,
                    link: creativeData.menuUrl || 'https://chefstudio.com',
                    call_to_action: {
                        type: creativeData.callToAction || 'LEARN_MORE'
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
        
        // Se for anúncio de post, adicionar object_story_id
        if (creativeData.postId) {
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
        return response.data;
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
            adTitle,
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
            adDescription: adDescription ? `${adDescription.substring(0, 20)}...` : null,
            adTitle,
            callToAction,
            menuUrl,
            objective
        });

        // Verificar campos obrigatórios
        const camposObrigatorios = {
            imagem: !!req.file,
            adAccountId: !!adAccountId,
            pageId: !!pageId,
            campaignName: !!campaignName,
            weeklyBudget: !!weeklyBudget,
            startDate: !!startDate,
            adDescription: !!adDescription
        };
        
        console.log('Validação de campos obrigatórios:', camposObrigatorios);
        
        if (!req.file) {
            console.error('❌ Erro: Imagem não fornecida');
            return res.status(400).json({ message: 'Imagem é obrigatória', camposFaltantes: { imagem: true } });
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
        
        // Validar objetivo da campanha se fornecido
        if (objective && !isValidObjective(objective)) {
            console.error('❌ Erro: Objetivo inválido:', objective);
            return res.status(400).json({ 
                message: `Objetivo inválido: ${objective}. Valores válidos: ${VALID_OBJECTIVES.join(', ')}`,
                objetivosValidos: VALID_OBJECTIVES
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

        // Criar campanha, ad set, criativo e anúncio em sequência usando o token do usuário
        console.log('Iniciando criação de campanha...');
        const campaignResult = await createCampaign(userAccessToken, adAccountId, {
            name: campaignName,
            objective: objective || DEFAULT_TRAFFIC_OBJECTIVE
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
            adTitle: adTitle || null,
            callToAction: callToAction || 'LEARN_MORE',
            menuUrl: menuUrl || null
        }, req.file); // Passar o arquivo de imagem

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
            adDescription: adDescription,
            adTitle: adTitle || null,
            callToAction: callToAction || 'LEARN_MORE',
            menuUrl: menuUrl || null,
            status: 'ACTIVE',
            // A URL da imagem não pode ser construída assim, pois o arquivo foi movido/excluído
            // O hash da imagem pode ser mais útil: creativeResult.image_hash (se a API retornar)
            imageUrl: null, // Ajustar se necessário obter a URL da imagem de outra forma
            adSetId: adSetResult.id,
            adId: adResult.id,
            creativeId: creativeResult.id,
            createdAt: new Date(),
            type: 'image',
            objective: objective || DEFAULT_TRAFFIC_OBJECTIVE
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
        
        // Validar objetivo da campanha se fornecido
        if (objective && !isValidObjective(objective)) {
            console.error('❌ Erro: Objetivo inválido:', objective);
            return res.status(400).json({ 
                message: `Objetivo inválido: ${objective}. Valores válidos: ${VALID_OBJECTIVES.join(', ')}`,
                objetivosValidos: VALID_OBJECTIVES
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
        } catch (error) {
            console.error('❌ Erro ao extrair ID da publicação:', error);
            console.error('URL problemática:', postUrl);
            return res.status(400).json({ 
                message: 'URL da publicação inválida ou não suportada',
                error: error.message,
                url: postUrl
            });
        }

        // Criar campanha, ad set, criativo e anúncio em sequência
        console.log('Iniciando criação de campanha...');
        const campaignResult = await createCampaign(userAccessToken, adAccountId, {
            name: campaignName,
            objective: objective || DEFAULT_TRAFFIC_OBJECTIVE
        });

        console.log('Iniciando criação de ad set...');
        const adSetResult = await createAdSet(userAccessToken, adAccountId, campaignResult.id, {
            name: campaignName,
            weeklyBudget: parseFloat(weeklyBudget),
            startDate: startDate,
            endDate: endDate || null,
            location: location
        });

        // Criar criativo usando object_story_id
        console.log('Iniciando criação de criativo com postId:', postId);
        const creativeResult = await createAdCreative(userAccessToken, adAccountId, pageId, {
            name: campaignName,
            postId: postId, // Passar o ID do post para usar object_story_id
            // Não passar adDescription, adTitle, callToAction, menuUrl aqui, pois vêm do post
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
            // Não incluir CTA/menuUrl aqui, pois são definidos no post original
            status: 'ACTIVE',
            adSetId: adSetResult.id,
            adId: adResult.id,
            creativeId: creativeResult.id,
            createdAt: new Date(),
            type: 'post',
            objective: objective || DEFAULT_TRAFFIC_OBJECTIVE
        };

        // Armazenar a campanha em memória (backup local)
        if (!campaignsStore[adAccountId]) {
            campaignsStore[adAccountId] = [];
        }
        campaignsStore[adAccountId].unshift(adDetails);

        console.log('✅ Anúncio criado com sucesso a partir da publicação!');
        res.status(201).json({
            success: true,
            message: 'Anúncio criado com sucesso a partir da publicação e publicado como ACTIVE',
            campaignId: adDetails.campaignId,
            adSetId: adDetails.adSetId,
            adId: adDetails.adId,
            status: 'ACTIVE',
            adDetails
        });
    } catch (error) {
        console.error('❌ Erro ao criar anúncio a partir de post:', error.response?.data || error.message);
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
            message: 'Erro ao criar anúncio a partir da publicação',
            error: error.response?.data || error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Obtém as campanhas do usuário
 */
const getCampaigns = async (req, res) => {
    try {
        console.log('Buscando campanhas do Meta Ads (integração real)');
        console.log('Query params:', req.query);

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
