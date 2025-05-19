const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { BusinessManager, AdAccount, Campaign, Ad, AdSet } = require('facebook-nodejs-business-sdk');
const { decryptToken } = require('../middleware/auth');

// Rota para obter contas de anúncios do usuário
router.get('/accounts', authMiddleware, async (req, res) => {
  try {
    if (!req.user.facebookAccessToken) {
      return res.status(400).json({ message: 'Usuário não conectado ao Facebook' });
    }

    const accessToken = decryptToken(req.user.facebookAccessToken);
    const businessManager = new BusinessManager(accessToken);
    
    // Obter contas de anúncios
    const accounts = await businessManager.getOwnedAdAccounts(['id', 'name', 'currency', 'account_status']);
    
    res.json(accounts.map(account => ({
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

// Rota para selecionar conta de anúncios
router.post('/accounts/select', authMiddleware, async (req, res) => {
  try {
    const { accountId, accountName } = req.body;
    
    if (!accountId) {
      return res.status(400).json({ message: 'ID da conta de anúncios não fornecido' });
    }
    
    // Atualizar usuário com a conta selecionada
    req.user.adsAccountId = accountId;
    req.user.adsAccountName = accountName;
    await req.user.save();
    
    res.json({ message: 'Conta de anúncios selecionada com sucesso' });
  } catch (error) {
    console.error('Erro ao selecionar conta de anúncios:', error);
    res.status(500).json({ message: 'Erro ao selecionar conta de anúncios' });
  }
});

// Rota para obter campanhas
router.get('/campaigns', authMiddleware, async (req, res) => {
  try {
    if (!req.user.adsAccountId) {
      return res.status(400).json({ message: 'Nenhuma conta de anúncios selecionada' });
    }
    
    if (!req.user.facebookAccessToken) {
      return res.status(400).json({ message: 'Usuário não conectado ao Facebook' });
    }
    
    const accessToken = decryptToken(req.user.facebookAccessToken);
    const adAccount = new AdAccount(req.user.adsAccountId, accessToken);
    
    // Obter campanhas
    const campaigns = await adAccount.getCampaigns(['id', 'name', 'status', 'objective', 'created_time', 'updated_time', 'spend']);
    
    res.json(campaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      createdTime: campaign.created_time,
      updatedTime: campaign.updated_time,
      spend: campaign.spend
    })));
  } catch (error) {
    console.error('Erro ao obter campanhas:', error);
    res.status(500).json({ message: 'Erro ao obter campanhas' });
  }
});

// Rota para criar campanha
router.post('/campaigns', authMiddleware, async (req, res) => {
  try {
    const { name, objective, status, specialAdCategories, dailyBudget } = req.body;
    
    if (!req.user.adsAccountId) {
      return res.status(400).json({ message: 'Nenhuma conta de anúncios selecionada' });
    }
    
    if (!req.user.facebookAccessToken) {
      return res.status(400).json({ message: 'Usuário não conectado ao Facebook' });
    }
    
    const accessToken = decryptToken(req.user.facebookAccessToken);
    const adAccount = new AdAccount(req.user.adsAccountId, accessToken);
    
    // Criar campanha
    const campaign = await adAccount.createCampaign(
      [Campaign.Fields.name, Campaign.Fields.status, Campaign.Fields.objective],
      {
        [Campaign.Fields.name]: name,
        [Campaign.Fields.status]: status || 'PAUSED',
        [Campaign.Fields.objective]: objective || 'OUTCOME_AWARENESS',
        [Campaign.Fields.special_ad_categories]: specialAdCategories || [],
        [Campaign.Fields.daily_budget]: dailyBudget || 1000 // em centavos
      }
    );
    
    res.status(201).json({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective
    });
  } catch (error) {
    console.error('Erro ao criar campanha:', error);
    res.status(500).json({ message: 'Erro ao criar campanha' });
  }
});

// Rota para obter conjuntos de anúncios de uma campanha
router.get('/campaigns/:campaignId/adsets', authMiddleware, async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    if (!req.user.facebookAccessToken) {
      return res.status(400).json({ message: 'Usuário não conectado ao Facebook' });
    }
    
    const accessToken = decryptToken(req.user.facebookAccessToken);
    const campaign = new Campaign(campaignId, accessToken);
    
    // Obter conjuntos de anúncios
    const adSets = await campaign.getAdSets(['id', 'name', 'status', 'daily_budget', 'targeting', 'start_time', 'end_time']);
    
    res.json(adSets.map(adSet => ({
      id: adSet.id,
      name: adSet.name,
      status: adSet.status,
      dailyBudget: adSet.daily_budget,
      targeting: adSet.targeting,
      startTime: adSet.start_time,
      endTime: adSet.end_time
    })));
  } catch (error) {
    console.error('Erro ao obter conjuntos de anúncios:', error);
    res.status(500).json({ message: 'Erro ao obter conjuntos de anúncios' });
  }
});

// Rota para criar conjunto de anúncios
router.post('/campaigns/:campaignId/adsets', authMiddleware, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { name, status, dailyBudget, targeting, startTime, endTime } = req.body;
    
    if (!req.user.adsAccountId) {
      return res.status(400).json({ message: 'Nenhuma conta de anúncios selecionada' });
    }
    
    if (!req.user.facebookAccessToken) {
      return res.status(400).json({ message: 'Usuário não conectado ao Facebook' });
    }
    
    const accessToken = decryptToken(req.user.facebookAccessToken);
    const adAccount = new AdAccount(req.user.adsAccountId, accessToken);
    
    // Criar conjunto de anúncios
    const adSet = await adAccount.createAdSet(
      [AdSet.Fields.name, AdSet.Fields.status, AdSet.Fields.campaign_id, AdSet.Fields.daily_budget, AdSet.Fields.targeting, AdSet.Fields.start_time, AdSet.Fields.end_time],
      {
        [AdSet.Fields.name]: name,
        [AdSet.Fields.status]: status || 'PAUSED',
        [AdSet.Fields.campaign_id]: campaignId,
        [AdSet.Fields.daily_budget]: dailyBudget || 1000, // em centavos
        [AdSet.Fields.targeting]: targeting || {},
        [AdSet.Fields.start_time]: startTime || new Date().toISOString(),
        [AdSet.Fields.end_time]: endTime || null
      }
    );
    
    res.status(201).json({
      id: adSet.id,
      name: adSet.name,
      status: adSet.status,
      dailyBudget: adSet.daily_budget,
      targeting: adSet.targeting,
      startTime: adSet.start_time,
      endTime: adSet.end_time
    });
  } catch (error) {
    console.error('Erro ao criar conjunto de anúncios:', error);
    res.status(500).json({ message: 'Erro ao criar conjunto de anúncios' });
  }
});

// Rota para obter anúncios de um conjunto de anúncios
router.get('/adsets/:adSetId/ads', authMiddleware, async (req, res) => {
  try {
    const { adSetId } = req.params;
    
    if (!req.user.facebookAccessToken) {
      return res.status(400).json({ message: 'Usuário não conectado ao Facebook' });
    }
    
    const accessToken = decryptToken(req.user.facebookAccessToken);
    const adSet = new AdSet(adSetId, accessToken);
    
    // Obter anúncios
    const ads = await adSet.getAds(['id', 'name', 'status', 'creative', 'adset_id', 'campaign_id']);
    
    res.json(ads.map(ad => ({
      id: ad.id,
      name: ad.name,
      status: ad.status,
      creative: ad.creative,
      adSetId: ad.adset_id,
      campaignId: ad.campaign_id
    })));
  } catch (error) {
    console.error('Erro ao obter anúncios:', error);
    res.status(500).json({ message: 'Erro ao obter anúncios' });
  }
});

// Rota para criar anúncio
router.post('/adsets/:adSetId/ads', authMiddleware, async (req, res) => {
  try {
    const { adSetId } = req.params;
    const { name, status, creative } = req.body;
    
    if (!req.user.adsAccountId) {
      return res.status(400).json({ message: 'Nenhuma conta de anúncios selecionada' });
    }
    
    if (!req.user.facebookAccessToken) {
      return res.status(400).json({ message: 'Usuário não conectado ao Facebook' });
    }
    
    const accessToken = decryptToken(req.user.facebookAccessToken);
    const adAccount = new AdAccount(req.user.adsAccountId, accessToken);
    
    // Criar anúncio
    const ad = await adAccount.createAd(
      [Ad.Fields.name, Ad.Fields.status, Ad.Fields.adset_id, Ad.Fields.creative],
      {
        [Ad.Fields.name]: name,
        [Ad.Fields.status]: status || 'PAUSED',
        [Ad.Fields.adset_id]: adSetId,
        [Ad.Fields.creative]: creative || {}
      }
    );
    
    res.status(201).json({
      id: ad.id,
      name: ad.name,
      status: ad.status,
      adSetId: ad.adset_id,
      creative: ad.creative
    });
  } catch (error) {
    console.error('Erro ao criar anúncio:', error);
    res.status(500).json({ message: 'Erro ao criar anúncio' });
  }
});

// Rota para obter métricas de uma campanha
router.get('/campaigns/:campaignId/insights', authMiddleware, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { timeRange, metrics } = req.query;
    
    if (!req.user.facebookAccessToken) {
      return res.status(400).json({ message: 'Usuário não conectado ao Facebook' });
    }
    
    const accessToken = decryptToken(req.user.facebookAccessToken);
    const campaign = new Campaign(campaignId, accessToken);
    
    // Definir intervalo de tempo padrão (últimos 30 dias)
    const defaultTimeRange = {
      since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      until: new Date().toISOString().split('T')[0]
    };
    
    // Definir métricas padrão
    const defaultMetrics = [
      'impressions',
      'clicks',
      'spend',
      'cpc',
      'ctr',
      'reach',
      'frequency'
    ];
    
    // Obter insights
    const insights = await campaign.getInsights(
      metrics ? metrics.split(',') : defaultMetrics,
      {
        time_range: timeRange ? JSON.parse(timeRange) : defaultTimeRange
      }
    );
    
    res.json(insights);
  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    res.status(500).json({ message: 'Erro ao obter métricas' });
  }
});

// Rota para obter contas de Instagram conectadas
router.get('/instagram-accounts', authMiddleware, async (req, res) => {
  try {
    if (!req.user.facebookAccessToken) {
      return res.status(400).json({ message: 'Usuário não conectado ao Facebook' });
    }
    
    const accessToken = decryptToken(req.user.facebookAccessToken);
    const businessManager = new BusinessManager(accessToken);
    
    // Obter páginas do Facebook
    const pages = await businessManager.getOwnedPages(['id', 'name', 'access_token']);
    
    // Para cada página, obter contas de Instagram conectadas
    const instagramAccounts = [];
    
    for (const page of pages) {
      try {
        const pageAccessToken = page.access_token;
        const pageId = page.id;
        
        // Obter contas de Instagram conectadas à página
        const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/instagram_accounts?access_token=${pageAccessToken}`);
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
          for (const account of data.data) {
            instagramAccounts.push({
              id: account.id,
              name: account.name,
              username: account.username,
              profilePictureUrl: account.profile_picture_url,
              pageId: pageId,
              pageName: page.name
            });
          }
        }
      } catch (pageError) {
        console.error(`Erro ao obter contas de Instagram para a página ${page.id}:`, pageError);
        // Continuar para a próxima página
      }
    }
    
    // Atualizar usuário com as contas de Instagram
    req.user.instagramAccounts = instagramAccounts;
    await req.user.save();
    
    res.json(instagramAccounts);
  } catch (error) {
    console.error('Erro ao obter contas de Instagram:', error);
    res.status(500).json({ message: 'Erro ao obter contas de Instagram' });
  }
});

module.exports = router;
