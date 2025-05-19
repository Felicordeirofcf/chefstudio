const express = require('express');
const router = express.Router();
const { authMiddleware, decryptToken } = require('../middleware/auth');
const { AdAccount, Campaign, Ad, AdCreative, AdImage } = require('facebook-nodejs-business-sdk');

// Obter contas de anúncios disponíveis
router.get('/accounts', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    // Verificar se o usuário tem token do Facebook
    if (!user.facebookAccessToken) {
      return res.status(400).json({ 
        message: 'Usuário não conectado ao Facebook',
        needsFacebookAuth: true
      });
    }
    
    // Descriptografar o token
    const accessToken = decryptToken(user.facebookAccessToken);
    
    // Verificar se o token expirou
    if (user.facebookTokenExpiry && new Date(user.facebookTokenExpiry) < new Date()) {
      return res.status(401).json({ 
        message: 'Token do Facebook expirado',
        needsFacebookAuth: true
      });
    }
    
    // Obter contas de anúncios
    const businessManager = new BusinessManager(accessToken);
    const adAccounts = await businessManager.getOwnedAdAccounts(['id', 'name', 'currency', 'account_status']);
    
    res.json(adAccounts.map(account => ({
      id: account.id,
      name: account.name,
      currency: account.currency,
      status: account.account_status
    })));
  } catch (error) {
    console.error('Erro ao obter contas de anúncios:', error);
    res.status(500).json({ message: 'Erro ao obter contas de anúncios' });
  }
});

// Selecionar conta de anúncios principal
router.post('/accounts/select', authMiddleware, async (req, res) => {
  try {
    const { accountId, accountName, accountCurrency } = req.body;
    const user = req.user;
    
    // Atualizar conta de anúncios do usuário
    user.adsAccountId = accountId;
    user.adsAccountName = accountName;
    user.adsAccountCurrency = accountCurrency;
    user.lastSyncDate = new Date();
    
    await user.save();
    
    res.json({ 
      message: 'Conta de anúncios selecionada com sucesso',
      adsAccountId: user.adsAccountId,
      adsAccountName: user.adsAccountName
    });
  } catch (error) {
    console.error('Erro ao selecionar conta de anúncios:', error);
    res.status(500).json({ message: 'Erro ao selecionar conta de anúncios' });
  }
});

// Obter campanhas da conta selecionada
router.get('/campaigns', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    // Verificar se o usuário tem conta de anúncios selecionada
    if (!user.adsAccountId) {
      return res.status(400).json({ 
        message: 'Nenhuma conta de anúncios selecionada',
        needsAccountSelection: true
      });
    }
    
    // Descriptografar o token
    const accessToken = decryptToken(user.facebookAccessToken);
    
    // Inicializar a conta de anúncios
    const adAccount = new AdAccount(user.adsAccountId);
    adAccount.api = accessToken;
    
    // Obter campanhas
    const campaigns = await adAccount.getCampaigns(['id', 'name', 'status', 'objective', 'created_time', 'updated_time']);
    
    res.json(campaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      createdAt: campaign.created_time,
      updatedAt: campaign.updated_time
    })));
  } catch (error) {
    console.error('Erro ao obter campanhas:', error);
    res.status(500).json({ message: 'Erro ao obter campanhas' });
  }
});

// Criar nova campanha
router.post('/campaigns', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { name, objective, status, specialAdCategories, dailyBudget } = req.body;
    
    // Verificar se o usuário tem conta de anúncios selecionada
    if (!user.adsAccountId) {
      return res.status(400).json({ 
        message: 'Nenhuma conta de anúncios selecionada',
        needsAccountSelection: true
      });
    }
    
    // Descriptografar o token
    const accessToken = decryptToken(user.facebookAccessToken);
    
    // Inicializar a conta de anúncios
    const adAccount = new AdAccount(user.adsAccountId);
    adAccount.api = accessToken;
    
    // Criar campanha
    const campaign = await adAccount.createCampaign(
      [],
      {
        name,
        objective,
        status: status || 'PAUSED', // Padrão para PAUSED para evitar gastos acidentais
        special_ad_categories: specialAdCategories || [],
        daily_budget: dailyBudget * 100 // Converter para centavos
      }
    );
    
    res.status(201).json({
      id: campaign.id,
      name,
      objective,
      status: status || 'PAUSED'
    });
  } catch (error) {
    console.error('Erro ao criar campanha:', error);
    res.status(500).json({ message: 'Erro ao criar campanha' });
  }
});

// Obter detalhes de uma campanha específica
router.get('/campaigns/:id', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const campaignId = req.params.id;
    
    // Descriptografar o token
    const accessToken = decryptToken(user.facebookAccessToken);
    
    // Inicializar a campanha
    const campaign = new Campaign(campaignId, {
      api: accessToken
    });
    
    // Obter detalhes da campanha
    const campaignDetails = await campaign.get([
      'id', 
      'name', 
      'status', 
      'objective', 
      'special_ad_categories',
      'daily_budget',
      'created_time', 
      'updated_time'
    ]);
    
    res.json({
      id: campaignDetails.id,
      name: campaignDetails.name,
      status: campaignDetails.status,
      objective: campaignDetails.objective,
      specialAdCategories: campaignDetails.special_ad_categories,
      dailyBudget: campaignDetails.daily_budget ? campaignDetails.daily_budget / 100 : 0, // Converter de centavos
      createdAt: campaignDetails.created_time,
      updatedAt: campaignDetails.updated_time
    });
  } catch (error) {
    console.error('Erro ao obter detalhes da campanha:', error);
    res.status(500).json({ message: 'Erro ao obter detalhes da campanha' });
  }
});

// Atualizar campanha existente
router.put('/campaigns/:id', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const campaignId = req.params.id;
    const { name, status, dailyBudget } = req.body;
    
    // Descriptografar o token
    const accessToken = decryptToken(user.facebookAccessToken);
    
    // Inicializar a campanha
    const campaign = new Campaign(campaignId, {
      api: accessToken
    });
    
    // Preparar dados para atualização
    const updateData = {};
    if (name) updateData.name = name;
    if (status) updateData.status = status;
    if (dailyBudget) updateData.daily_budget = dailyBudget * 100; // Converter para centavos
    
    // Atualizar campanha
    await campaign.update([], updateData);
    
    // Obter detalhes atualizados
    const updatedCampaign = await campaign.get(['id', 'name', 'status', 'daily_budget']);
    
    res.json({
      id: updatedCampaign.id,
      name: updatedCampaign.name,
      status: updatedCampaign.status,
      dailyBudget: updatedCampaign.daily_budget ? updatedCampaign.daily_budget / 100 : 0 // Converter de centavos
    });
  } catch (error) {
    console.error('Erro ao atualizar campanha:', error);
    res.status(500).json({ message: 'Erro ao atualizar campanha' });
  }
});

// Criar anúncio
router.post('/ads', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { 
      campaignId, 
      name, 
      status, 
      headline, 
      description, 
      imageUrl,
      linkUrl,
      callToAction
    } = req.body;
    
    // Verificar se o usuário tem conta de anúncios selecionada
    if (!user.adsAccountId) {
      return res.status(400).json({ 
        message: 'Nenhuma conta de anúncios selecionada',
        needsAccountSelection: true
      });
    }
    
    // Descriptografar o token
    const accessToken = decryptToken(user.facebookAccessToken);
    
    // Inicializar a conta de anúncios
    const adAccount = new AdAccount(user.adsAccountId);
    adAccount.api = accessToken;
    
    // 1. Criar conjunto de anúncios (Ad Set)
    const adSet = await adAccount.createAdSet(
      [],
      {
        name: `${name} - Ad Set`,
        campaign_id: campaignId,
        bid_amount: 500, // $5.00 em centavos
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'REACH',
        targeting: {
          geo_locations: {
            countries: ['BR']
          },
          age_min: 18,
          age_max: 65
        },
        status: status || 'PAUSED'
      }
    );
    
    // 2. Fazer upload da imagem (se fornecida)
    let adImage;
    if (imageUrl) {
      adImage = await adAccount.createAdImage(
        [],
        {
          filename: `${name.replace(/\s+/g, '_')}.jpg`,
          bytes: imageUrl // Deve ser base64 ou URL
        }
      );
    }
    
    // 3. Criar criativo do anúncio
    const adCreative = await adAccount.createAdCreative(
      [],
      {
        name: `${name} - Creative`,
        object_story_spec: {
          page_id: '123456789', // ID da página do Facebook (deve ser substituído pelo real)
          link_data: {
            message: description,
            link: linkUrl,
            caption: 'www.chefstudio.com',
            call_to_action: {
              type: callToAction || 'LEARN_MORE'
            },
            image_hash: adImage ? adImage.hash : undefined
          }
        }
      }
    );
    
    // 4. Criar anúncio
    const ad = await adAccount.createAd(
      [],
      {
        name,
        adset_id: adSet.id,
        creative: {
          creative_id: adCreative.id
        },
        status: status || 'PAUSED'
      }
    );
    
    res.status(201).json({
      id: ad.id,
      name,
      status: status || 'PAUSED',
      adSetId: adSet.id,
      creativeId: adCreative.id
    });
  } catch (error) {
    console.error('Erro ao criar anúncio:', error);
    res.status(500).json({ message: 'Erro ao criar anúncio', error: error.message });
  }
});

// Obter anúncios de uma campanha
router.get('/campaigns/:id/ads', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const campaignId = req.params.id;
    
    // Descriptografar o token
    const accessToken = decryptToken(user.facebookAccessToken);
    
    // Inicializar a campanha
    const campaign = new Campaign(campaignId, {
      api: accessToken
    });
    
    // Obter anúncios da campanha
    const ads = await campaign.getAds(['id', 'name', 'status', 'created_time', 'updated_time']);
    
    res.json(ads.map(ad => ({
      id: ad.id,
      name: ad.name,
      status: ad.status,
      createdAt: ad.created_time,
      updatedAt: ad.updated_time
    })));
  } catch (error) {
    console.error('Erro ao obter anúncios da campanha:', error);
    res.status(500).json({ message: 'Erro ao obter anúncios da campanha' });
  }
});

// Obter métricas de desempenho
router.get('/metrics', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { timeRange, granularity } = req.query;
    
    // Verificar se o usuário tem conta de anúncios selecionada
    if (!user.adsAccountId) {
      return res.status(400).json({ 
        message: 'Nenhuma conta de anúncios selecionada',
        needsAccountSelection: true
      });
    }
    
    // Descriptografar o token
    const accessToken = decryptToken(user.facebookAccessToken);
    
    // Inicializar a conta de anúncios
    const adAccount = new AdAccount(user.adsAccountId);
    adAccount.api = accessToken;
    
    // Definir intervalo de tempo
    const today = new Date();
    let startDate, endDate;
    
    switch (timeRange || 'last_30_days') {
      case 'today':
        startDate = today.toISOString().split('T')[0];
        endDate = startDate;
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = yesterday.toISOString().split('T')[0];
        endDate = startDate;
        break;
      case 'last_7_days':
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        startDate = sevenDaysAgo.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      case 'last_30_days':
      default:
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        startDate = thirtyDaysAgo.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
    }
    
    // Obter insights
    const insights = await adAccount.getInsights(
      ['spend', 'impressions', 'clicks', 'reach', 'cpc', 'ctr'],
      {
        time_range: {
          'since': startDate,
          'until': endDate
        },
        time_increment: granularity === 'daily' ? 1 : undefined
      }
    );
    
    res.json(insights);
  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    res.status(500).json({ message: 'Erro ao obter métricas' });
  }
});

// Obter contas de Instagram conectadas
router.get('/instagram-accounts', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    // Verificar se o usuário tem token do Facebook
    if (!user.facebookAccessToken) {
      return res.status(400).json({ 
        message: 'Usuário não conectado ao Facebook',
        needsFacebookAuth: true
      });
    }
    
    // Descriptografar o token
    const accessToken = decryptToken(user.facebookAccessToken);
    
    // Inicializar a conta de anúncios
    const adAccount = new AdAccount(user.adsAccountId);
    adAccount.api = accessToken;
    
    // Obter contas de Instagram conectadas
    // Nota: Esta é uma implementação simplificada, a API real pode variar
    const instagramAccounts = await adAccount.getInstagramAccounts(['id', 'name', 'profile_picture_url']);
    
    res.json(instagramAccounts.map(account => ({
      id: account.id,
      name: account.name,
      profilePictureUrl: account.profile_picture_url
    })));
  } catch (error) {
    console.error('Erro ao obter contas de Instagram:', error);
    res.status(500).json({ message: 'Erro ao obter contas de Instagram' });
  }
});

module.exports = router;
