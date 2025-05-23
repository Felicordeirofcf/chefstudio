const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configurações da API do Meta
const META_API_VERSION = 'v18.0'; // Usar a versão mais recente da API
const META_API_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Armazenamento em memória para campanhas criadas (backup local)
const campaignsStore = {};

// Função para obter o token de acesso do ambiente
const getAccessToken = () => {
    // Em produção, isso viria de um sistema seguro de gerenciamento de tokens
    // Por exemplo, de variáveis de ambiente, banco de dados ou serviço de segredos
    const accessToken = process.env.META_ACCESS_TOKEN;
    
    if (!accessToken) {
        console.error('META_ACCESS_TOKEN não encontrado no ambiente');
        throw new Error('Token de acesso do Meta não configurado');
    }
    
    return accessToken;
};

/**
 * Cria uma campanha no Meta Ads
 * @param {string} accessToken - Token de acesso do Meta
 * @param {string} adAccountId - ID da conta de anúncios
 * @param {object} campaignData - Dados da campanha
 * @returns {Promise<object>} - Objeto com os dados da campanha criada
 */
const createCampaign = async (accessToken, adAccountId, campaignData) => {
    try {
        console.log(`Criando campanha real no Meta Ads para conta ${adAccountId}`);
        
        const response = await axios.post(
            `${META_API_BASE_URL}/${adAccountId}/campaigns`,
            {
                name: campaignData.name,
                objective: 'TRAFFIC',
                status: 'ACTIVE', // Definir explicitamente como ACTIVE
                special_ad_categories: '[]',
                access_token: accessToken
            }
        );
        
        console.log('Campanha criada com sucesso:', response.data);
        return response.data;
    } catch (error) {
        console.error('Erro ao criar campanha no Meta Ads:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Cria um conjunto de anúncios (Ad Set) no Meta Ads
 * @param {string} accessToken - Token de acesso do Meta
 * @param {string} adAccountId - ID da conta de anúncios
 * @param {string} campaignId - ID da campanha
 * @param {object} adSetData - Dados do conjunto de anúncios
 * @returns {Promise<object>} - Objeto com os dados do conjunto de anúncios criado
 */
const createAdSet = async (accessToken, adAccountId, campaignId, adSetData) => {
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
                status: 'ACTIVE', // Definir explicitamente como ACTIVE
                start_time: new Date(adSetData.startDate).toISOString(),
                end_time: adSetData.endDate ? new Date(adSetData.endDate).toISOString() : null,
                access_token: accessToken
            }
        );
        
        console.log('Ad Set criado com sucesso:', response.data);
        return response.data;
    } catch (error) {
        console.error('Erro ao criar conjunto de anúncios no Meta Ads:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Faz upload de uma imagem para o Meta Ads
 * @param {string} accessToken - Token de acesso do Meta
 * @param {string} adAccountId - ID da conta de anúncios
 * @param {object} file - Arquivo de imagem
 * @returns {Promise<string>} - Hash da imagem
 */
const uploadImage = async (accessToken, adAccountId, file) => {
    try {
        console.log(`Fazendo upload de imagem para conta ${adAccountId}`);
        
        const formData = new FormData();
        formData.append('access_token', accessToken);
        formData.append('image', fs.createReadStream(file.path));
        
        const uploadResponse = await axios.post(
            `${META_API_BASE_URL}/${adAccountId}/adimages`,
            formData,
            {
                headers: {
                    ...formData.getHeaders()
                }
            }
        );
        
        // Extrair o hash da imagem da resposta
        const images = uploadResponse.data.images;
        const imageHash = Object.keys(images)[0];
        
        console.log('Upload de imagem concluído, hash:', imageHash);
        return imageHash;
    } catch (error) {
        console.error('Erro ao fazer upload de imagem:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Cria um criativo de anúncio no Meta Ads
 * @param {string} accessToken - Token de acesso do Meta
 * @param {string} adAccountId - ID da conta de anúncios
 * @param {string} pageId - ID da página do Facebook
 * @param {object} creativeData - Dados do criativo
 * @param {object} file - Arquivo de imagem (opcional)
 * @returns {Promise<object>} - Objeto com os dados do criativo criado
 */
const createAdCreative = async (accessToken, adAccountId, pageId, creativeData, file = null) => {
    try {
        console.log(`Criando ad creative real no Meta Ads para conta ${adAccountId}`);
        
        // Fazer upload da imagem se fornecida
        let imageHash = null;
        if (file) {
            imageHash = await uploadImage(accessToken, adAccountId, file);
        }
        
        // Criar o criativo com a imagem ou com o post
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
            access_token: accessToken
        };
        
        // Adicionar imagem se disponível
        if (imageHash) {
            creativePayload.object_story_spec.link_data.image_hash = imageHash;
        }
        
        // Adicionar título se disponível
        if (creativeData.adTitle) {
            creativePayload.object_story_spec.link_data.name = creativeData.adTitle;
        }
        
        const response = await axios.post(
            `${META_API_BASE_URL}/${adAccountId}/adcreatives`,
            creativePayload
        );
        
        console.log('Ad Creative criado com sucesso:', response.data);
        return response.data;
    } catch (error) {
        console.error('Erro ao criar criativo de anúncio no Meta Ads:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Cria um anúncio no Meta Ads
 * @param {string} accessToken - Token de acesso do Meta
 * @param {string} adAccountId - ID da conta de anúncios
 * @param {string} adSetId - ID do conjunto de anúncios
 * @param {string} creativeId - ID do criativo
 * @param {object} adData - Dados do anúncio
 * @returns {Promise<object>} - Objeto com os dados do anúncio criado
 */
const createAd = async (accessToken, adAccountId, adSetId, creativeId, adData) => {
    try {
        console.log(`Criando anúncio real no Meta Ads para ad set ${adSetId}`);
        
        const response = await axios.post(
            `${META_API_BASE_URL}/${adAccountId}/ads`,
            {
                name: `${adData.name} - Ad`,
                adset_id: adSetId,
                creative: { creative_id: creativeId },
                status: 'ACTIVE', // Definir explicitamente como ACTIVE
                access_token: accessToken
            }
        );
        
        console.log('Anúncio criado com sucesso:', response.data);
        return response.data;
    } catch (error) {
        console.error('Erro ao criar anúncio no Meta Ads:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Cria um anúncio completo a partir de uma imagem
 */
const createFromImage = async (req, res) => {
    try {
        console.log('Iniciando criação de anúncio a partir de imagem (integração real)');
        
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
            menuUrl 
        } = req.body;
        
        // Verificar campos obrigatórios
        if (!req.file) {
            return res.status(400).json({ message: 'Imagem é obrigatória' });
        }
        
        if (!adAccountId || !pageId || !campaignName || !weeklyBudget || !startDate || !adDescription) {
            return res.status(400).json({ message: 'Campos obrigatórios não preenchidos' });
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
            } catch (error) {
                console.error('Erro ao processar localização:', error);
            }
        }
        
        // Obter token de acesso do ambiente
        const accessToken = getAccessToken();
        
        // Criar campanha, ad set, criativo e anúncio em sequência
        const campaignResult = await createCampaign(accessToken, adAccountId, {
            name: campaignName,
            objective: 'TRAFFIC'
        });
        
        const adSetResult = await createAdSet(accessToken, adAccountId, campaignResult.id, {
            name: campaignName,
            weeklyBudget: parseFloat(weeklyBudget),
            startDate: startDate,
            endDate: endDate || null,
            location: location
        });
        
        const creativeResult = await createAdCreative(accessToken, adAccountId, pageId, {
            name: campaignName,
            adDescription: adDescription,
            adTitle: adTitle || null,
            callToAction: callToAction || 'LEARN_MORE',
            menuUrl: menuUrl || null
        }, req.file);
        
        const adResult = await createAd(accessToken, adAccountId, adSetResult.id, creativeResult.id, {
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
            imageUrl: req.file ? `${req.protocol}://${req.get('host')}/uploads/${path.basename(req.file.path)}` : null,
            adSetId: adSetResult.id,
            adId: adResult.id,
            creativeId: creativeResult.id,
            createdAt: new Date(),
            type: 'image'
        };
        
        // Armazenar a campanha em memória (backup local)
        if (!campaignsStore[adAccountId]) {
            campaignsStore[adAccountId] = [];
        }
        
        // Adicionar a nova campanha no início da lista
        campaignsStore[adAccountId].unshift(adDetails);
        
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
        console.error('Erro ao criar anúncio a partir de imagem:', error.response?.data || error.message);
        res.status(500).json({ 
            message: 'Erro ao criar anúncio',
            error: error.response?.data || error.message
        });
    }
};

/**
 * Cria um anúncio completo a partir de uma publicação existente
 */
const createFromPost = async (req, res) => {
    try {
        console.log('Iniciando criação de anúncio a partir de publicação existente (integração real)');
        
        const { 
            adAccountId, 
            pageId, 
            campaignName, 
            weeklyBudget, 
            startDate, 
            endDate, 
            postUrl,
            callToAction, 
            menuUrl 
        } = req.body;
        
        // Verificar campos obrigatórios
        if (!postUrl) {
            return res.status(400).json({ message: 'URL da publicação é obrigatória' });
        }
        
        if (!adAccountId || !pageId || !campaignName || !weeklyBudget || !startDate) {
            return res.status(400).json({ message: 'Campos obrigatórios não preenchidos' });
        }
        
        // Obter informações de localização
        let location = { latitude: -23.5505, longitude: -46.6333, radius: 10 }; // Padrão: São Paulo com raio de 10km
        
        if (req.body.location) {
            try {
                location = req.body.location;
            } catch (error) {
                console.error('Erro ao processar localização:', error);
            }
        }
        
        // Extrair ID da publicação da URL
        let postId = null;
        
        // Tentar extrair o ID da publicação da URL
        if (postUrl.includes('fbid=')) {
            const fbidMatch = postUrl.match(/fbid=(\d+)/);
            if (fbidMatch && fbidMatch[1]) {
                postId = fbidMatch[1];
            }
        } else if (postUrl.includes('/posts/')) {
            const postsMatch = postUrl.match(/\/posts\/(\d+)/);
            if (postsMatch && postsMatch[1]) {
                postId = postsMatch[1];
            }
        }
        
        if (!postId) {
            return res.status(400).json({ 
                message: 'Não foi possível extrair o ID da publicação da URL fornecida',
                postUrl
            });
        }
        
        // Obter token de acesso do ambiente
        const accessToken = getAccessToken();
        
        // Criar campanha com status ACTIVE
        const campaignResult = await createCampaign(accessToken, adAccountId, {
            name: campaignName,
            objective: 'TRAFFIC'
        });
        
        // Criar ad set com status ACTIVE
        const adSetResult = await createAdSet(accessToken, adAccountId, campaignResult.id, {
            name: campaignName,
            weeklyBudget: parseFloat(weeklyBudget),
            startDate: startDate,
            endDate: endDate || null,
            location: location
        });
        
        // Para publicações existentes, o criativo é diferente
        console.log(`Criando ad creative para publicação existente ${postId}`);
        
        // Criar criativo baseado em uma publicação existente
        const creativePayload = {
            name: `${campaignName} - Creative`,
            object_story_id: `${pageId}_${postId}`,
            access_token: accessToken
        };
        
        const creativeResponse = await axios.post(
            `${META_API_BASE_URL}/${adAccountId}/adcreatives`,
            creativePayload
        );
        
        const creativeResult = creativeResponse.data;
        console.log('Ad Creative criado com sucesso a partir de publicação:', creativeResult);
        
        // Criar anúncio com status ACTIVE
        const adResult = await createAd(accessToken, adAccountId, adSetResult.id, creativeResult.id, {
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
            callToAction: callToAction || 'LEARN_MORE',
            menuUrl: menuUrl || null,
            status: 'ACTIVE',
            postId: postId,
            postUrl: postUrl,
            adSetId: adSetResult.id,
            adId: adResult.id,
            creativeId: creativeResult.id,
            createdAt: new Date(),
            type: 'post'
        };
        
        // Armazenar a campanha em memória (backup local)
        if (!campaignsStore[adAccountId]) {
            campaignsStore[adAccountId] = [];
        }
        
        // Adicionar a nova campanha no início da lista
        campaignsStore[adAccountId].unshift(adDetails);
        
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
        console.error('Erro ao criar anúncio a partir de publicação:', error.response?.data || error.message);
        res.status(500).json({ 
            message: 'Erro ao criar anúncio',
            error: error.response?.data || error.message
        });
    }
};

/**
 * Obtém as campanhas do usuário diretamente da API do Meta
 */
const getCampaigns = async (req, res) => {
    try {
        const { adAccountId } = req.query;
        
        if (!adAccountId) {
            return res.status(400).json({ message: 'ID da conta de anúncios é obrigatório' });
        }
        
        console.log(`Buscando campanhas reais para conta ${adAccountId}`);
        
        // Obter token de acesso do ambiente
        const accessToken = getAccessToken();
        
        // Buscar campanhas diretamente da API do Meta
        const response = await axios.get(
            `${META_API_BASE_URL}/${adAccountId}/campaigns`,
            {
                params: {
                    fields: 'id,name,status,objective,created_time,start_time,stop_time,daily_budget,lifetime_budget',
                    access_token: accessToken
                }
            }
        );
        
        console.log(`Encontradas ${response.data.data.length} campanhas na API do Meta`);
        
        // Mapear as campanhas para o formato esperado pelo frontend
        const campaigns = response.data.data.map(campaign => {
            return {
                id: campaign.id,
                campaignId: campaign.id,
                name: campaign.name,
                status: campaign.status,
                objective: campaign.objective,
                startDate: campaign.start_time,
                endDate: campaign.stop_time,
                dailyBudget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null, // Converter de centavos
                weeklyBudget: campaign.daily_budget ? (parseFloat(campaign.daily_budget) / 100) * 7 : null,
                createdAt: campaign.created_time
            };
        });
        
        // Adicionar campanhas do armazenamento local que ainda não foram sincronizadas
        const localCampaigns = campaignsStore[adAccountId] || [];
        const allCampaigns = [...campaigns];
        
        // Adicionar campanhas locais que não estão na lista da API
        localCampaigns.forEach(localCampaign => {
            if (!allCampaigns.some(c => c.id === localCampaign.id)) {
                allCampaigns.push(localCampaign);
            }
        });
        
        // Ordenar por data de criação (mais recentes primeiro)
        allCampaigns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.json({
            success: true,
            campaigns: allCampaigns
        });
    } catch (error) {
        console.error('Erro ao obter campanhas:', error.response?.data || error.message);
        
        // Em caso de erro na API, tentar retornar as campanhas armazenadas localmente
        const localCampaigns = campaignsStore[req.query.adAccountId] || [];
        
        res.json({
            success: true,
            campaigns: localCampaigns,
            warning: 'Usando dados locais devido a erro na API do Meta'
        });
    }
};

module.exports = {
    createFromImage,
    createFromPost,
    getCampaigns
};
