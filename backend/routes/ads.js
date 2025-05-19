const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { BusinessManager, AdAccount } = require('facebook-nodejs-business-sdk');
const { decryptToken } = require('../middleware/passport');

// Middleware para verificar autenticação
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Erro de autenticação:', error);
    res.status(401).json({ message: 'Token inválido' });
  }
};

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

// Obter métricas de desempenho
router.get('/metrics', authMiddleware, async (req, res) => {
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
    
    // Obter insights (últimos 30 dias)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const insights = await adAccount.getInsights(
      ['spend', 'impressions', 'clicks', 'reach', 'cpc', 'ctr'],
      {
        time_range: {
          'since': thirtyDaysAgo.toISOString().split('T')[0],
          'until': today.toISOString().split('T')[0]
        },
        time_increment: 1
      }
    );
    
    res.json(insights);
  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    res.status(500).json({ message: 'Erro ao obter métricas' });
  }
});

module.exports = router;
