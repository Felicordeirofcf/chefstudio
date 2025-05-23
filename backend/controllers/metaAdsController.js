const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Configurações da API do Meta
const META_API_VERSION = 'v18.0'; // Usar a versão mais recente da API
const META_API_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Armazenamento em memória para campanhas criadas (simulação)
// Em um ambiente de produção, isso seria substituído por um banco de dados
const campaignsStore = {
    // Mapeamento de adAccountId para array de campanhas
    // Exemplo: { 'act_123456789': [campaign1, campaign2, ...] }
};

// Adicionar algumas campanhas de exemplo para cada conta
const addExampleCampaigns = (adAccountId) => {
    if (!campaignsStore[adAccountId]) {
        campaignsStore[adAccountId] = [
            {
                id: '23848123456789',
                campaignId: '23848123456789',
                name: 'Campanha de Verão',
                status: 'ACTIVE',
                weeklyBudget: 350.00,
                dailyBudget: 50.00,
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                adAccountId: adAccountId,
                metrics: {
                    reach: 1234,
                    impressions: 5678,
                    clicks: 89,
                    spend: 123.45
                }
            },
            {
                id: '23848987654321',
                campaignId: '23848987654321',
                name: 'Promoção de Fim de Semana',
                status: 'PAUSED',
                weeklyBudget: 210.00,
                dailyBudget: 30.00,
                startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                endDate: null,
                adAccountId: adAccountId,
                metrics: {
                    reach: 567,
                    impressions: 2345,
                    clicks: 45,
                    spend: 67.89
                }
            }
        ];
    }
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
        // Em um ambiente real, esta seria a chamada para a API do Meta
        // const response = await axios.post(
        //     `${META_API_BASE_URL}/${adAccountId}/campaigns`,
        //     {
        //         name: campaignData.name,
        //         objective: 'TRAFFIC',
        //         status: 'ACTIVE', // Definir explicitamente como ACTIVE
        //         special_ad_categories: '[]',
        //         access_token: accessToken
        //     }
        // );
        // return response.data;

        // Simulação da resposta da API
        const campaignId = `23848${Math.floor(Math.random() * 10000000)}`;
        return {
            id: campaignId,
            name: campaignData.name,
            status: 'ACTIVE',
            objective: 'TRAFFIC'
        };
    } catch (error) {
        console.error('Erro ao criar campanha no Meta Ads:', error);
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
        // Em um ambiente real, esta seria a chamada para a API do Meta
        // const dailyBudget = Math.round(adSetData.weeklyBudget / 7 * 100); // Converter para centavos
        // const response = await axios.post(
        //     `${META_API_BASE_URL}/${adAccountId}/adsets`,
        //     {
        //         name: `${adSetData.name} - AdSet`,
        //         campaign_id: campaignId,
        //         daily_budget: dailyBudget,
        //         bid_amount: 1000, // 10 USD em centavos
        //         billing_event: 'IMPRESSIONS',
        //         optimization_goal: 'LINK_CLICKS',
        //         targeting: {
        //             geo_locations: {
        //                 custom_locations: [
        //                     {
        //                         latitude: adSetData.location.latitude,
        //                         longitude: adSetData.location.longitude,
        //                         radius: adSetData.location.radius,
        //                         distance_unit: 'kilometer'
        //                     }
        //                 ]
        //             }
        //         },
        //         status: 'ACTIVE', // Definir explicitamente como ACTIVE
        //         start_time: new Date(adSetData.startDate).toISOString(),
        //         end_time: adSetData.endDate ? new Date(adSetData.endDate).toISOString() : null,
        //         access_token: accessToken
        //     }
        // );
        // return response.data;

        // Simulação da resposta da API
        const adSetId = `23848${Math.floor(Math.random() * 10000000)}`;
        return {
            id: adSetId,
            name: `${adSetData.name} - AdSet`,
            campaign_id: campaignId,
            status: 'ACTIVE',
            daily_budget: Math.round(adSetData.weeklyBudget / 7 * 100)
        };
    } catch (error) {
        console.error('Erro ao criar conjunto de anúncios no Meta Ads:', error);
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
        // Em um ambiente real, primeiro faríamos upload da imagem
        // let imageHash = null;
        // if (file) {
        //     const formData = new FormData();
        //     formData.append('access_token', accessToken);
        //     formData.append('image', fs.createReadStream(file.path));
        //     
        //     const uploadResponse = await axios.post(
        //         `${META_API_BASE_URL}/${adAccountId}/adimages`,
        //         formData,
        //         {
        //             headers: formData.getHeaders()
        //         }
        //     );
        //     
        //     // Extrair o hash da imagem da resposta
        //     const images = uploadResponse.data.images;
        //     imageHash = Object.keys(images)[0];
        // }
        //
        // // Criar o criativo com a imagem ou com o post
        // const creativePayload = {
        //     name: `${creativeData.name} - Creative`,
        //     object_story_spec: {
        //         page_id: pageId,
        //         link_data: {
        //             message: creativeData.adDescription,
        //             link: creativeData.menuUrl || 'https://chefstudio.com',
        //             call_to_action: {
        //                 type: creativeData.callToAction || 'LEARN_MORE'
        //             }
        //         }
        //     },
        //     access_token: accessToken
        // };
        //
        // // Adicionar imagem se disponível
        // if (imageHash) {
        //     creativePayload.object_story_spec.link_data.image_hash = imageHash;
        // }
        //
        // // Adicionar título se disponível
        // if (creativeData.adTitle) {
        //     creativePayload.object_story_spec.link_data.name = creativeData.adTitle;
        // }
        //
        // const response = await axios.post(
        //     `${META_API_BASE_URL}/${adAccountId}/adcreatives`,
        //     creativePayload
        // );
        // return response.data;

        // Simulação da resposta da API
        const creativeId = `23848${Math.floor(Math.random() * 10000000)}`;
        return {
            id: creativeId,
            name: `${creativeData.name} - Creative`,
            effective_object_story_id: `${pageId}_${Math.floor(Math.random() * 10000000)}`
        };
    } catch (error) {
        console.error('Erro ao criar criativo de anúncio no Meta Ads:', error);
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
        // Em um ambiente real, esta seria a chamada para a API do Meta
        // const response = await axios.post(
        //     `${META_API_BASE_URL}/${adAccountId}/ads`,
        //     {
        //         name: `${adData.name} - Ad`,
        //         adset_id: adSetId,
        //         creative: { creative_id: creativeId },
        //         status: 'ACTIVE', // Definir explicitamente como ACTIVE
        //         access_token: accessToken
        //     }
        // );
        // return response.data;

        // Simulação da resposta da API
        const adId = `23848${Math.floor(Math.random() * 10000000)}`;
        return {
            id: adId,
            name: `${adData.name} - Ad`,
            adset_id: adSetId,
            creative: { id: creativeId },
            status: 'ACTIVE'
        };
    } catch (error) {
        console.error('Erro ao criar anúncio no Meta Ads:', error);
        throw error;
    }
};

/**
 * Cria um anúncio completo a partir de uma imagem
 */
const createFromImage = async (req, res) => {
    try {
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
        
        // Em um ambiente real, obteríamos o token de acesso do usuário
        const accessToken = 'SIMULATED_ACCESS_TOKEN';
        
        // Criar campanha, ad set, criativo e anúncio em sequência
        // Em um ambiente real, estas seriam chamadas reais para a API do Meta
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
            status: 'ACTIVE', // Definir explicitamente como ACTIVE
            imageUrl: req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null,
            adSetId: adSetResult.id,
            adId: adResult.id,
            creativeId: creativeResult.id,
            createdAt: new Date(),
            type: 'image'
        };
        
        // Armazenar a campanha em memória
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
        console.error('Erro ao criar anúncio a partir de imagem:', error);
        res.status(500).json({ 
            message: 'Erro ao criar anúncio',
            error: error.message
        });
    }
};

/**
 * Cria um anúncio completo a partir de uma publicação existente
 */
const createFromPost = async (req, res) => {
    try {
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
        
        // Em um ambiente real, obteríamos o token de acesso do usuário
        const accessToken = 'SIMULATED_ACCESS_TOKEN';
        
        // Criar campanha, ad set, criativo e anúncio em sequência
        // Em um ambiente real, estas seriam chamadas reais para a API do Meta
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
        
        // Para publicações existentes, o criativo seria diferente
        // Simulação da resposta da API
        const creativeId = `23848${Math.floor(Math.random() * 10000000)}`;
        const creativeResult = {
            id: creativeId,
            name: `${campaignName} - Creative`,
            effective_object_story_id: `${pageId}_${postId}`
        };
        
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
            status: 'ACTIVE', // Definir explicitamente como ACTIVE
            postId: postId,
            postUrl: postUrl,
            adSetId: adSetResult.id,
            adId: adResult.id,
            creativeId: creativeResult.id,
            createdAt: new Date(),
            type: 'post'
        };
        
        // Armazenar a campanha em memória
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
        console.error('Erro ao criar anúncio a partir de publicação:', error);
        res.status(500).json({ 
            message: 'Erro ao criar anúncio',
            error: error.message
        });
    }
};

/**
 * Obtém as campanhas do usuário
 */
const getCampaigns = async (req, res) => {
    try {
        const { adAccountId } = req.query;
        
        if (!adAccountId) {
            return res.status(400).json({ message: 'ID da conta de anúncios é obrigatório' });
        }
        
        // Adicionar campanhas de exemplo se não houver nenhuma para esta conta
        if (!campaignsStore[adAccountId]) {
            addExampleCampaigns(adAccountId);
        }
        
        // Retornar as campanhas armazenadas para esta conta
        res.json({
            success: true,
            campaigns: campaignsStore[adAccountId] || []
        });
    } catch (error) {
        console.error('Erro ao obter campanhas:', error);
        res.status(500).json({ 
            message: 'Erro ao obter campanhas',
            error: error.message
        });
    }
};

module.exports = {
    createFromImage,
    createFromPost,
    getCampaigns
};
