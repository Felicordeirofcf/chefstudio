/**
 * Cria um anúncio a partir de uma imagem enviada pelo usuário
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
const createFromImage = async (req, res) => {
  try {
    console.log('Iniciando criação de anúncio a partir de imagem');
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
      title, 
      description, 
      callToAction, 
      objective, 
      location 
    } = req.body;

    // Verificar campos obrigatórios
    if (!adAccountId || !pageId || !campaignName || !weeklyBudget || !startDate || !req.file) {
      console.error('❌ Erro: Campos obrigatórios não preenchidos.');
      return res.status(400).json({ message: 'Campos obrigatórios não preenchidos.' });
    }

    // Validar objetivo (usar padrão se não for válido)
    const validObjective = isValidObjective(objective) ? objective : DEFAULT_TRAFFIC_OBJECTIVE;
    console.log(`Objetivo da campanha: ${validObjective}`);

    // Validar CTA (usar padrão se não for válido)
    const validCTA = isValidCTA(callToAction) ? callToAction : DEFAULT_CTA;
    console.log(`Call to Action: ${validCTA}`);

    // Processar localização
    let locationData = { latitude: -23.5505, longitude: -46.6333, radius: 10 }; // Padrão: São Paulo com raio de 10km
    if (location) {
      try {
        if (typeof location === 'string') {
          locationData = JSON.parse(location);
        } else if (location.latitude && location.longitude && location.radius) {
          locationData = {
            latitude: parseFloat(location.latitude),
            longitude: parseFloat(location.longitude),
            radius: parseInt(location.radius)
          };
        }
        console.log('Localização processada:', locationData);
      } catch (error) {
        console.error('Erro ao processar localização:', error);
        console.log('Usando localização padrão:', locationData);
      }
    }

    // Fazer upload da imagem
    console.log('Fazendo upload da imagem...');
    const imageData = await uploadImage(userAccessToken, adAccountId, req.file);
    console.log('Upload de imagem concluído:', imageData);

    // Criar campanha
    console.log('Criando campanha...');
    const campaignResult = await createCampaign(userAccessToken, adAccountId, {
      name: campaignName,
      objective: validObjective
    });

    // Criar ad set
    console.log('Criando ad set...');
    const adSetResult = await createAdSet(userAccessToken, adAccountId, campaignResult.id, {
      name: campaignName,
      weeklyBudget: parseFloat(weeklyBudget),
      startDate: startDate,
      endDate: endDate || null,
      location: locationData
    });

    // Criar criativo
    console.log('Criando criativo...');
    const creativeResult = await createAdCreative(userAccessToken, adAccountId, pageId, {
      name: `${campaignName} - Creative`,
      title: title || campaignName,
      description: description || '',
      imageHash: imageData.hash,
      callToAction: validCTA,
      linkUrl: imageData.url || 'https://facebook.com'
    });

    // Criar anúncio
    console.log('Criando anúncio...');
    const adResult = await createAd(userAccessToken, adAccountId, adSetResult.id, creativeResult.id, {
      name: campaignName
    });

    // Armazenar detalhes da campanha em memória
    if (!campaignsStore[adAccountId]) {
      campaignsStore[adAccountId] = [];
    }

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
      title: title || campaignName,
      description: description || '',
      imageHash: imageData.hash,
      imageUrl: imageData.url,
      callToAction: validCTA,
      objective: validObjective,
      location: locationData,
      status: 'ACTIVE',
      adSetId: adSetResult.id,
      adId: adResult.id,
      creativeId: creativeResult.id,
      createdAt: new Date(),
      type: 'image'
    };

    // Adicionar ao início da lista (para aparecer primeiro)
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
    
    // Limpar arquivo temporário em caso de erro
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Erro ao limpar arquivo temporário (após erro):', err);
      });
    }
    
    res.status(500).json({
      message: 'Erro ao criar anúncio a partir de imagem',
      error: error.response?.data || error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Cria um anúncio a partir de uma publicação existente do Facebook
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
const createFromPost = async (req, res) => {
  try {
    console.log('Iniciando criação de anúncio a partir de publicação existente');
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
      postUrl, 
      callToAction, 
      objective, 
      location 
    } = req.body;

    // Verificar campos obrigatórios
    if (!adAccountId || !pageId || !campaignName || !weeklyBudget || !startDate || !postUrl) {
      console.error('❌ Erro: Campos obrigatórios não preenchidos.');
      return res.status(400).json({ message: 'Campos obrigatórios não preenchidos.' });
    }

    // Extrair IDs da URL da publicação
    const extractedIds = extractFacebookPostIds(postUrl, pageId);
    if (!extractedIds) {
      console.error('❌ Erro: Não foi possível extrair os IDs da URL da publicação.');
      return res.status(400).json({ message: 'URL da publicação inválida. Por favor, verifique o formato e tente novamente.' });
    }

    console.log('IDs extraídos da URL:', extractedIds);
    
    // Verificar se o postId é um pfbid e convertê-lo se necessário
    let objectStoryId;
    try {
      objectStoryId = await convertPfbidToObjectStoryId(extractedIds.postId, extractedIds.pageId, userAccessToken);
      console.log('Object Story ID final:', objectStoryId);
    } catch (error) {
      console.error('❌ Erro ao converter pfbid:', error.message);
      return res.status(400).json({ message: error.message });
    }

    // Validar objetivo (usar padrão se não for válido)
    const validObjective = isValidObjective(objective) ? objective : DEFAULT_TRAFFIC_OBJECTIVE;
    console.log(`Objetivo da campanha: ${validObjective}`);

    // Validar CTA (usar padrão se não for válido)
    const validCTA = isValidCTA(callToAction) ? callToAction : DEFAULT_CTA;
    console.log(`Call to Action: ${validCTA}`);

    // Processar localização
    let locationData = { latitude: -23.5505, longitude: -46.6333, radius: 10 }; // Padrão: São Paulo com raio de 10km
    if (location) {
      try {
        if (typeof location === 'string') {
          locationData = JSON.parse(location);
        } else if (location.latitude && location.longitude && location.radius) {
          locationData = {
            latitude: parseFloat(location.latitude),
            longitude: parseFloat(location.longitude),
            radius: parseInt(location.radius)
          };
        }
        console.log('Localização processada:', locationData);
      } catch (error) {
        console.error('Erro ao processar localização:', error);
        console.log('Usando localização padrão:', locationData);
      }
    }

    // Criar campanha
    console.log('Criando campanha...');
    const campaignResult = await createCampaign(userAccessToken, adAccountId, {
      name: campaignName,
      objective: validObjective
    });

    // Criar ad set
    console.log('Criando ad set...');
    const adSetResult = await createAdSet(userAccessToken, adAccountId, campaignResult.id, {
      name: campaignName,
      weeklyBudget: parseFloat(weeklyBudget),
      startDate: startDate,
      endDate: endDate || null,
      location: locationData
    });

    // Criar criativo usando object_story_id
    console.log('Criando criativo com object_story_id...');
    const creativePayload = {
      name: `${campaignName} - Creative`,
      object_story_id: objectStoryId,
      access_token: userAccessToken
    };
    
    const creativeResponse = await axios.post(
      `${META_API_BASE_URL}/${adAccountId}/adcreatives`,
      creativePayload
    );
    
    console.log('Criativo criado com sucesso:', creativeResponse.data);
    const creativeId = creativeResponse.data.id;

    // Criar anúncio
    console.log('Criando anúncio...');
    const adResult = await createAd(userAccessToken, adAccountId, adSetResult.id, creativeId, {
      name: campaignName
    });

    // Armazenar detalhes da campanha em memória
    if (!campaignsStore[adAccountId]) {
      campaignsStore[adAccountId] = [];
    }

    // Criar objeto com detalhes completos do anúncio
    const adDetails = {
      id: campaignResult.id,
      campaignId: campaignResult.id,
      name: campaignName,
      adAccountId: adAccountId,
      pageId: extractedIds.pageId,
      weeklyBudget: parseFloat(weeklyBudget),
      dailyBudget: parseFloat(weeklyBudget) / 7,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      location: locationData,
      postUrl: postUrl,
      objectStoryId: objectStoryId,
      callToAction: validCTA,
      objective: validObjective,
      status: 'ACTIVE',
      adSetId: adSetResult.id,
      adId: adResult.id,
      creativeId: creativeId,
      createdAt: new Date(),
      type: 'post'
    };

    // Adicionar ao início da lista (para aparecer primeiro)
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
