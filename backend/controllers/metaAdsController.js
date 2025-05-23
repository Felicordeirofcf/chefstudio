const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configurações da API do Meta
const META_API_VERSION = 'v18.0'; // Usar a versão mais recente da API
const META_API_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Armazenamento em memória para campanhas criadas (backup local)
const campaignsStore = {};

// // Função para obter o token de acesso do ambiente (REMOVIDA - Usar token do usuário)
// const getAccessToken = () => {
//     const accessToken = process.env.META_ACCESS_TOKEN;
//     if (!accessToken) {
//         console.error('META_ACCESS_TOKEN não encontrado no ambiente');
//         throw new Error('Token de acesso do Meta não configurado');
//     }
//     return accessToken;
// };

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
 * Cria uma campanha no Meta Ads
 * @param {string} userAccessToken - Token de acesso do usuário Meta
 * @param {string} adAccountId - ID da conta de anúncios
 * @param {object} campaignData - Dados da campanha
 * @returns {Promise<object>} - Objeto com os dados da campanha criada
 */
const createCampaign = async (userAccessToken, adAccountId, campaignData) => {
    try {
        console.log(`Criando campanha real no Meta Ads para conta ${adAccountId}`);
        const response = await axios.post(
            `${META_API_BASE_URL}/${adAccountId}/campaigns`,
            {
                name: campaignData.name,
                objective: 'TRAFFIC',
                status: 'ACTIVE',
                special_ad_categories: '[]',
                access_token: userAccessToken // Usar token do usuário
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
        const formData = new FormData();
        formData.append('access_token', userAccessToken); // Usar token do usuário
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
        throw error;
    }
};

/**
 * Cria um anúncio completo a partir de uma imagem
 */
const createFromImage = async (req, res) => {
    try {
        console.log('Iniciando criação de anúncio a partir de imagem (integração real)');

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
                 // Continuar com a localização padrão se houver erro
            }
        }

        // Criar campanha, ad set, criativo e anúncio em sequência usando o token do usuário
        const campaignResult = await createCampaign(userAccessToken, adAccountId, {
            name: campaignName,
            objective: 'TRAFFIC'
        });

        const adSetResult = await createAdSet(userAccessToken, adAccountId, campaignResult.id, {
            name: campaignName,
            weeklyBudget: parseFloat(weeklyBudget),
            startDate: startDate,
            endDate: endDate || null,
            location: location
        });

        const creativeResult = await createAdCreative(userAccessToken, adAccountId, pageId, {
            name: campaignName,
            adDescription: adDescription,
            adTitle: adTitle || null,
            callToAction: callToAction || 'LEARN_MORE',
            menuUrl: menuUrl || null
        }, req.file); // Passar o arquivo de imagem

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
            type: 'image'
        };

        // Armazenar a campanha em memória (backup local)
        if (!campaignsStore[adAccountId]) {
            campaignsStore[adAccountId] = [];
        }
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
        // Limpar arquivo temporário se existir em caso de erro
        if (req.file && req.file.path) {
             fs.unlink(req.file.path, (err) => {
                if (err) console.error('Erro ao limpar arquivo temporário (após erro no controller):', err);
            });
        }
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
                 // Continuar com a localização padrão se houver erro
            }
        }

        // Extrair ID da publicação da URL
        let postId = null;
        try {
            // Tentar extrair o ID da publicação da URL
            // Exemplo: https://www.facebook.com/123456789/posts/987654321
            // ou https://www.facebook.com/permalink.php?story_fbid=987654321&id=123456789
            const postUrlObj = new URL(postUrl);
            const pathname = postUrlObj.pathname;
            const searchParams = postUrlObj.searchParams;
            
            if (pathname.includes('/posts/')) {
                // Formato: /username/posts/postid
                postId = pathname.split('/posts/')[1].split('/')[0];
            } else if (pathname.includes('/permalink.php')) {
                // Formato: /permalink.php?story_fbid=postid&id=pageid
                postId = searchParams.get('story_fbid');
            } else {
                // Tentar extrair de outros formatos
                const matches = postUrl.match(/\/(\d+)(?:\/|$)/g);
                if (matches && matches.length > 0) {
                    postId = matches[matches.length - 1].replace(/\//g, '');
                }
            }
            
            if (!postId) {
                throw new Error('Não foi possível extrair o ID da publicação da URL');
            }
        } catch (error) {
            console.error('Erro ao extrair ID da publicação:', error);
            return res.status(400).json({ message: 'URL da publicação inválida ou não suportada' });
        }

        // Criar campanha, ad set, criativo e anúncio em sequência
        const campaignResult = await createCampaign(userAccessToken, adAccountId, {
            name: campaignName,
            objective: 'TRAFFIC'
        });

        const adSetResult = await createAdSet(userAccessToken, adAccountId, campaignResult.id, {
            name: campaignName,
            weeklyBudget: parseFloat(weeklyBudget),
            startDate: startDate,
            endDate: endDate || null,
            location: location
        });

        // Criar criativo usando object_story_id
        const creativeResult = await createAdCreative(userAccessToken, adAccountId, pageId, {
            name: campaignName,
            postId: postId, // Passar o ID do post para usar object_story_id
            // Não passar adDescription, adTitle, callToAction, menuUrl aqui, pois vêm do post
        });

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
            type: 'post'
        };

        // Armazenar a campanha em memória (backup local)
        if (!campaignsStore[adAccountId]) {
            campaignsStore[adAccountId] = [];
        }
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
        console.error('Erro ao criar anúncio a partir de post:', error.response?.data || error.message);
        res.status(500).json({
            message: 'Erro ao criar anúncio a partir da publicação',
            error: error.response?.data || error.message
        });
    }
};

/**
 * Obtém as campanhas do usuário
 */
const getCampaigns = async (req, res) => {
    try {
        console.log('Buscando campanhas do Meta Ads (integração real)');

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

        const { adAccountId } = req.query;

        if (!adAccountId) {
            return res.status(400).json({ message: 'ID da conta de anúncios (adAccountId) é obrigatório' });
        }

        // Buscar campanhas da API do Meta
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

        res.status(200).json({ campaigns: uniqueCampaigns });

    } catch (error) {
        console.error('Erro ao buscar campanhas do Meta Ads:', error.response?.data || error.message);
        res.status(500).json({
            message: 'Erro ao buscar campanhas',
            error: error.response?.data || error.message
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
