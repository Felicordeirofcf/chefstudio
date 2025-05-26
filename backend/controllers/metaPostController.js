const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const { getUserMetaToken } = require('./metaAdsController');

/**
 * Publica uma imagem com legenda na página do Facebook e cria um anúncio automaticamente
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
const publicarPostCriarAnuncio = async (req, res) => {
  try {
    console.log('Iniciando fluxo de publicação de post e criação de anúncio automático');
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
      pageId, 
      caption, 
      adAccountId, 
      campaignName, 
      weeklyBudget, 
      startDate, 
      endDate 
    } = req.body;

    // Verificar campos obrigatórios
    const camposObrigatorios = {
      pageId: !!pageId,
      caption: !!caption,
      adAccountId: !!adAccountId,
      campaignName: !!campaignName,
      weeklyBudget: !!weeklyBudget,
      startDate: !!startDate,
      file: !!req.file
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

    // Etapa 1: Publicar a imagem na página do Facebook
    console.log(`Publicando imagem na página ${pageId}...`);
    
    // Preparar FormData para upload da imagem
    const formData = new FormData();
    formData.append('source', fs.createReadStream(req.file.path));
    formData.append('caption', caption);
    formData.append('access_token', userAccessToken);
    
    // Fazer requisição para publicar a foto na página
    const publishResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${pageId}/photos`,
      formData,
      {
        headers: {
          ...formData.getHeaders()
        }
      }
    );
    
    console.log('Resposta da publicação da foto:', publishResponse.data);
    
    if (!publishResponse.data || !publishResponse.data.id) {
      throw new Error('Falha ao publicar a imagem na página do Facebook.');
    }
    
    // Extrair o ID da publicação
    const postId = publishResponse.data.id;
    console.log(`✅ Imagem publicada com sucesso! Post ID: ${postId}`);
    
    // Montar o object_story_id para o anúncio
    const objectStoryId = `${pageId}_${postId}`;
    console.log(`Object Story ID para o anúncio: ${objectStoryId}`);

    // Etapa 2: Criar anúncio com base na publicação
    console.log('Iniciando criação de anúncio com base na publicação...');
    
    // Importar funções do metaAdsController
    const { 
      createCampaign, 
      createAdSet, 
      createAdCreative, 
      createAd 
    } = require('./metaAdsController');

    // Obter informações de localização (usar valores padrão)
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
      }
    }

    // Criar campanha
    console.log('Criando campanha...');
    const campaignResult = await createCampaign(userAccessToken, adAccountId, {
      name: campaignName
    });

    // Criar ad set
    console.log('Criando ad set...');
    const adSetResult = await createAdSet(userAccessToken, adAccountId, campaignResult.id, {
      name: campaignName,
      weeklyBudget: parseFloat(weeklyBudget),
      startDate: startDate,
      endDate: endDate || null,
      location: location
    });

    // Criar criativo usando object_story_id
    console.log('Criando criativo com object_story_id...');
    const creativePayload = {
      name: `${campaignName} - Creative`,
      
      access_token: userAccessToken
    };
    
    const creativeResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${adAccountId}/adcreatives`,
      creativePayload
    );
    
    console.log('Criativo criado com sucesso:', creativeResponse.data);
    const creativeId = creativeResponse.data.id;

    // Criar anúncio
    console.log('Criando anúncio...');
    const adResult = await createAd(userAccessToken, adAccountId, adSetResult.id, creativeId, {
      name: campaignName
    });

    // Limpar arquivo temporário após uso
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Erro ao limpar arquivo temporário:', err);
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
      postId: postId,
      objectStoryId: objectStoryId,
      status: 'ACTIVE',
      adSetId: adSetResult.id,
      adId: adResult.id,
      creativeId: creativeId,
      createdAt: new Date(),
      type: 'post',
      caption: caption
    };

    console.log('✅ Post publicado e anúncio criado com sucesso!');
    res.status(201).json({
      success: true,
      message: 'Post publicado e anúncio criado com sucesso',
      postId: postId,
      campaignId: adDetails.campaignId,
      adSetId: adDetails.adSetId,
      adId: adDetails.adId,
      status: 'ACTIVE',
      adDetails
    });
  } catch (error) {
    console.error('❌ Erro ao publicar post e criar anúncio:', error.response?.data || error.message);
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
      message: 'Erro ao publicar post e criar anúncio',
      error: error.response?.data || error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  publicarPostCriarAnuncio
};
