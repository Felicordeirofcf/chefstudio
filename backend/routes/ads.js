const express = require('express');
const router = express.Router();
const { authMiddleware, decryptToken } = require('../middleware/auth');
const User = require('../models/user');
const { BusinessAdsInsights, AdAccount, Campaign, Ad, AdSet } = require('facebook-nodejs-business-sdk');

// Rota para obter contas de anúncios do usuário
router.get('/accounts', authMiddleware, async (req, res) => {
  try {
    if (!req.user.facebookAccessToken) {
      return res.status(400).json({ message: 'Usuário não conectado ao Facebook' });
    }

    // Se já tiver uma conta de anúncios salva, retornar
    if (req.user.adsAccountId) {
      return res.json({
        accounts: [{
          id: req.user.adsAccountId,
          name: req.user.adsAccountName || 'Conta de Anúncios'
        }]
      });
    }

    // Caso contrário, buscar contas de anúncios do usuário
    const accessToken = decryptToken(req.user.facebookAccessToken);
    
    // Buscar contas de anúncios usando a API do Facebook
    const adAccounts = await new Promise((resolve, reject) => {
      // Simulação de resposta da API do Facebook
      // Em produção, use a SDK do Facebook para buscar as contas reais
      setTimeout(() => {
        resolve([
          { id: 'act_123456789', name: 'Conta de Anúncios Principal' },
          { id: 'act_987654321', name: 'Conta de Anúncios Secundária' }
        ]);
      }, 500);
    });

    res.json({ accounts: adAccounts });
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
    req.user.adsAccountName = accountName || 'Conta de Anúncios';
    await req.user.save();

    res.json({ 
      message: 'Conta de anúncios selecionada com sucesso',
      account: {
        id: req.user.adsAccountId,
        name: req.user.adsAccountName
      }
    });
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

    // Buscar campanhas usando a API do Facebook
    const campaigns = await new Promise((resolve, reject) => {
      // Simulação de resposta da API do Facebook
      // Em produção, use a SDK do Facebook para buscar as campanhas reais
      setTimeout(() => {
        resolve([
          { 
            id: '123456789', 
            name: 'Campanha de Verão', 
            status: 'ACTIVE',
            objective: 'CONVERSIONS',
            daily_budget: 5000,
            lifetime_budget: 0,
            start_time: '2023-06-01T00:00:00Z',
            end_time: '2023-08-31T23:59:59Z'
          },
          { 
            id: '987654321', 
            name: 'Campanha de Inverno', 
            status: 'PAUSED',
            objective: 'TRAFFIC',
            daily_budget: 3000,
            lifetime_budget: 0,
            start_time: '2023-12-01T00:00:00Z',
            end_time: '2024-02-28T23:59:59Z'
          }
        ]);
      }, 500);
    });

    res.json({ campaigns });
  } catch (error) {
    console.error('Erro ao obter campanhas:', error);
    res.status(500).json({ message: 'Erro ao obter campanhas' });
  }
});

// Rota para criar campanha
router.post('/campaigns', authMiddleware, async (req, res) => {
  try {
    if (!req.user.adsAccountId) {
      return res.status(400).json({ message: 'Nenhuma conta de anúncios selecionada' });
    }

    const { 
      name, 
      objective, 
      status = 'PAUSED',
      daily_budget,
      lifetime_budget,
      start_time,
      end_time
    } = req.body;

    if (!name || !objective) {
      return res.status(400).json({ message: 'Nome e objetivo são obrigatórios' });
    }

    if (!daily_budget && !lifetime_budget) {
      return res.status(400).json({ message: 'É necessário fornecer um orçamento diário ou total' });
    }

    // Criar campanha usando a API do Facebook
    const campaign = await new Promise((resolve, reject) => {
      // Simulação de resposta da API do Facebook
      // Em produção, use a SDK do Facebook para criar a campanha real
      setTimeout(() => {
        resolve({ 
          id: Math.floor(Math.random() * 1000000000).toString(), 
          name, 
          status,
          objective,
          daily_budget: daily_budget || 0,
          lifetime_budget: lifetime_budget || 0,
          start_time,
          end_time
        });
      }, 500);
    });

    res.status(201).json({ campaign });
  } catch (error) {
    console.error('Erro ao criar campanha:', error);
    res.status(500).json({ message: 'Erro ao criar campanha' });
  }
});

// Rota para obter conjuntos de anúncios de uma campanha
router.get('/campaigns/:campaignId/adsets', authMiddleware, async (req, res) => {
  try {
    if (!req.user.adsAccountId) {
      return res.status(400).json({ message: 'Nenhuma conta de anúncios selecionada' });
    }

    const { campaignId } = req.params;

    // Buscar conjuntos de anúncios usando a API do Facebook
    const adsets = await new Promise((resolve, reject) => {
      // Simulação de resposta da API do Facebook
      // Em produção, use a SDK do Facebook para buscar os conjuntos reais
      setTimeout(() => {
        resolve([
          { 
            id: '123456789', 
            name: 'Conjunto de Anúncios 1', 
            status: 'ACTIVE',
            campaign_id: campaignId,
            targeting: { 
              geo_locations: { countries: ['BR'] },
              age_min: 18,
              age_max: 65
            },
            daily_budget: 2000,
            bid_amount: 500
          },
          { 
            id: '987654321', 
            name: 'Conjunto de Anúncios 2', 
            status: 'PAUSED',
            campaign_id: campaignId,
            targeting: { 
              geo_locations: { countries: ['BR'] },
              age_min: 25,
              age_max: 45
            },
            daily_budget: 1500,
            bid_amount: 400
          }
        ]);
      }, 500);
    });

    res.json({ adsets });
  } catch (error) {
    console.error('Erro ao obter conjuntos de anúncios:', error);
    res.status(500).json({ message: 'Erro ao obter conjuntos de anúncios' });
  }
});

// Rota para criar conjunto de anúncios
router.post('/campaigns/:campaignId/adsets', authMiddleware, async (req, res) => {
  try {
    if (!req.user.adsAccountId) {
      return res.status(400).json({ message: 'Nenhuma conta de anúncios selecionada' });
    }

    const { campaignId } = req.params;
    const { 
      name, 
      status = 'PAUSED',
      targeting,
      daily_budget,
      bid_amount
    } = req.body;

    if (!name || !targeting) {
      return res.status(400).json({ message: 'Nome e segmentação são obrigatórios' });
    }

    // Criar conjunto de anúncios usando a API do Facebook
    const adset = await new Promise((resolve, reject) => {
      // Simulação de resposta da API do Facebook
      // Em produção, use a SDK do Facebook para criar o conjunto real
      setTimeout(() => {
        resolve({ 
          id: Math.floor(Math.random() * 1000000000).toString(), 
          name, 
          status,
          campaign_id: campaignId,
          targeting,
          daily_budget: daily_budget || 0,
          bid_amount: bid_amount || 0
        });
      }, 500);
    });

    res.status(201).json({ adset });
  } catch (error) {
    console.error('Erro ao criar conjunto de anúncios:', error);
    res.status(500).json({ message: 'Erro ao criar conjunto de anúncios' });
  }
});

// Rota para obter anúncios de um conjunto
router.get('/adsets/:adsetId/ads', authMiddleware, async (req, res) => {
  try {
    if (!req.user.adsAccountId) {
      return res.status(400).json({ message: 'Nenhuma conta de anúncios selecionada' });
    }

    const { adsetId } = req.params;

    // Buscar anúncios usando a API do Facebook
    const ads = await new Promise((resolve, reject) => {
      // Simulação de resposta da API do Facebook
      // Em produção, use a SDK do Facebook para buscar os anúncios reais
      setTimeout(() => {
        resolve([
          { 
            id: '123456789', 
            name: 'Anúncio 1', 
            status: 'ACTIVE',
            adset_id: adsetId,
            creative: { 
              id: '111111111',
              title: 'Título do Anúncio 1',
              body: 'Descrição do Anúncio 1',
              image_url: 'https://example.com/image1.jpg'
            }
          },
          { 
            id: '987654321', 
            name: 'Anúncio 2', 
            status: 'PAUSED',
            adset_id: adsetId,
            creative: { 
              id: '222222222',
              title: 'Título do Anúncio 2',
              body: 'Descrição do Anúncio 2',
              image_url: 'https://example.com/image2.jpg'
            }
          }
        ]);
      }, 500);
    });

    res.json({ ads });
  } catch (error) {
    console.error('Erro ao obter anúncios:', error);
    res.status(500).json({ message: 'Erro ao obter anúncios' });
  }
});

// Rota para criar anúncio
router.post('/adsets/:adsetId/ads', authMiddleware, async (req, res) => {
  try {
    if (!req.user.adsAccountId) {
      return res.status(400).json({ message: 'Nenhuma conta de anúncios selecionada' });
    }

    const { adsetId } = req.params;
    const { 
      name, 
      status = 'PAUSED',
      creative
    } = req.body;

    if (!name || !creative) {
      return res.status(400).json({ message: 'Nome e criativo são obrigatórios' });
    }

    // Criar anúncio usando a API do Facebook
    const ad = await new Promise((resolve, reject) => {
      // Simulação de resposta da API do Facebook
      // Em produção, use a SDK do Facebook para criar o anúncio real
      setTimeout(() => {
        resolve({ 
          id: Math.floor(Math.random() * 1000000000).toString(), 
          name, 
          status,
          adset_id: adsetId,
          creative: {
            id: Math.floor(Math.random() * 1000000000).toString(),
            ...creative
          }
        });
      }, 500);
    });

    res.status(201).json({ ad });
  } catch (error) {
    console.error('Erro ao criar anúncio:', error);
    res.status(500).json({ message: 'Erro ao criar anúncio' });
  }
});

// Rota para obter métricas de uma campanha
router.get('/campaigns/:campaignId/insights', authMiddleware, async (req, res) => {
  try {
    if (!req.user.adsAccountId) {
      return res.status(400).json({ message: 'Nenhuma conta de anúncios selecionada' });
    }

    const { campaignId } = req.params;
    const { timeRange = 'last_30d' } = req.query;

    // Buscar métricas usando a API do Facebook
    const insights = await new Promise((resolve, reject) => {
      // Simulação de resposta da API do Facebook
      // Em produção, use a SDK do Facebook para buscar as métricas reais
      setTimeout(() => {
        resolve({
          data: [
            {
              date_start: '2023-05-01',
              date_stop: '2023-05-31',
              impressions: '12345',
              clicks: '234',
              spend: '45.67',
              cpc: '0.19',
              ctr: '1.89',
              conversions: '12',
              cost_per_conversion: '3.81'
            }
          ],
          summary: {
            impressions: '12345',
            clicks: '234',
            spend: '45.67',
            cpc: '0.19',
            ctr: '1.89',
            conversions: '12',
            cost_per_conversion: '3.81'
          }
        });
      }, 500);
    });

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

    // Se já tiver contas de Instagram salvas, retornar
    if (req.user.instagramAccounts && req.user.instagramAccounts.length > 0) {
      return res.json({
        accounts: req.user.instagramAccounts
      });
    }

    // Caso contrário, buscar contas de Instagram do usuário
    const accessToken = decryptToken(req.user.facebookAccessToken);
    
    // Buscar contas de Instagram usando a API do Facebook
    const instagramAccounts = await new Promise((resolve, reject) => {
      // Simulação de resposta da API do Facebook
      // Em produção, use a SDK do Facebook para buscar as contas reais
      setTimeout(() => {
        resolve([
          { id: '123456789', username: 'instagram_account_1', name: 'Conta de Instagram 1' },
          { id: '987654321', username: 'instagram_account_2', name: 'Conta de Instagram 2' }
        ]);
      }, 500);
    });

    // Atualizar usuário com as contas de Instagram
    req.user.instagramAccounts = instagramAccounts;
    await req.user.save();

    res.json({ accounts: instagramAccounts });
  } catch (error) {
    console.error('Erro ao obter contas de Instagram:', error);
    res.status(500).json({ message: 'Erro ao obter contas de Instagram' });
  }
});

module.exports = router;
