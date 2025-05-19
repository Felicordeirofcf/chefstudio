const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/user');

// Obter contas de anúncios do usuário
router.get('/accounts', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user.facebookId || !user.facebookToken) {
      return res.status(400).json({ message: 'Usuário não conectado ao Facebook' });
    }
    
    // Em um ambiente real, aqui faríamos uma chamada para a API do Facebook
    // para obter as contas de anúncios do usuário
    // Como exemplo, retornaremos dados simulados
    
    const accounts = [
      {
        id: 'act_123456789',
        name: 'Conta de Anúncios Principal'
      },
      {
        id: 'act_987654321',
        name: 'Conta de Anúncios Secundária'
      }
    ];
    
    res.status(200).json({ accounts });
  } catch (error) {
    console.error('Erro ao obter contas de anúncios:', error);
    res.status(500).json({ message: 'Erro ao obter contas de anúncios' });
  }
});

// Selecionar conta de anúncios
router.post('/accounts/select', auth, async (req, res) => {
  try {
    const { accountId, accountName } = req.body;
    
    if (!accountId) {
      return res.status(400).json({ message: 'ID da conta de anúncios não fornecido' });
    }
    
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    user.adsAccountId = accountId;
    user.adsAccountName = accountName || accountId;
    
    await user.save();
    
    res.status(200).json({
      message: 'Conta de anúncios selecionada com sucesso',
      account: {
        id: accountId,
        name: accountName || accountId
      }
    });
  } catch (error) {
    console.error('Erro ao selecionar conta de anúncios:', error);
    res.status(500).json({ message: 'Erro ao selecionar conta de anúncios' });
  }
});

// Obter campanhas
router.get('/campaigns', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user.adsAccountId) {
      return res.status(400).json({ message: 'Nenhuma conta de anúncios selecionada' });
    }
    
    // Em um ambiente real, aqui faríamos uma chamada para a API do Facebook
    // para obter as campanhas da conta de anúncios selecionada
    // Como exemplo, retornaremos dados simulados
    
    const campaigns = [
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
    ];
    
    res.status(200).json({ campaigns });
  } catch (error) {
    console.error('Erro ao obter campanhas:', error);
    res.status(500).json({ message: 'Erro ao obter campanhas' });
  }
});

// Criar campanha
router.post('/campaigns', auth, async (req, res) => {
  try {
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
    
    const user = await User.findById(req.user.userId);
    
    if (!user.adsAccountId) {
      return res.status(400).json({ message: 'Nenhuma conta de anúncios selecionada' });
    }
    
    // Em um ambiente real, aqui faríamos uma chamada para a API do Facebook
    // para criar a campanha na conta de anúncios selecionada
    // Como exemplo, retornaremos dados simulados
    
    const campaign = {
      id: Math.floor(Math.random() * 1000000000).toString(),
      name,
      objective,
      status,
      daily_budget: daily_budget || 0,
      lifetime_budget: lifetime_budget || 0,
      start_time: start_time || new Date().toISOString(),
      end_time: end_time || null
    };
    
    res.status(201).json({ campaign });
  } catch (error) {
    console.error('Erro ao criar campanha:', error);
    res.status(500).json({ message: 'Erro ao criar campanha' });
  }
});

// Obter métricas de uma campanha
router.get('/campaigns/:campaignId/insights', auth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { timeRange = 'last_30d' } = req.query;
    
    const user = await User.findById(req.user.userId);
    
    if (!user.adsAccountId) {
      return res.status(400).json({ message: 'Nenhuma conta de anúncios selecionada' });
    }
    
    // Em um ambiente real, aqui faríamos uma chamada para a API do Facebook
    // para obter as métricas da campanha
    // Como exemplo, retornaremos dados simulados
    
    const data = [
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
    ];
    
    const summary = {
      impressions: '12345',
      clicks: '234',
      spend: '45.67',
      cpc: '0.19',
      ctr: '1.89',
      conversions: '12',
      cost_per_conversion: '3.81'
    };
    
    res.status(200).json({ data, summary });
  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    res.status(500).json({ message: 'Erro ao obter métricas' });
  }
});

// Obter contas de Instagram conectadas
router.get('/instagram-accounts', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user.facebookId || !user.facebookToken) {
      return res.status(400).json({ message: 'Usuário não conectado ao Facebook' });
    }
    
    // Em um ambiente real, aqui faríamos uma chamada para a API do Facebook
    // para obter as contas de Instagram conectadas
    // Como exemplo, retornaremos dados simulados ou os dados armazenados no usuário
    
    const accounts = user.instagramAccounts || [
      {
        id: '123456789',
        username: 'instagram_account_1',
        name: 'Conta de Instagram 1'
      }
    ];
    
    res.status(200).json({ accounts });
  } catch (error) {
    console.error('Erro ao obter contas de Instagram:', error);
    res.status(500).json({ message: 'Erro ao obter contas de Instagram' });
  }
});

module.exports = router;
