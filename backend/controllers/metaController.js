// Implementação completa do fluxo OAuth2 para Meta Ads
// Arquivo: backend/controllers/metaController.js

const axios = require('axios');
const User = require('../models/user');

// Gerar URL de autorização para o Facebook/Meta
exports.getAuthUrl = async (req, res) => {
  try {
    // Configuração do Facebook
    const appId = process.env.FB_APP_ID;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || 'https://chefstudio.vercel.app/meta-callback';
    
    if (!appId) {
      return res.status(500).json({ 
        message: 'Configuração do Facebook incompleta: FB_APP_ID não encontrado',
      });
    }
    
    // Construir URL de login do Facebook com todas as permissões necessárias
    const scopes = 'email,ads_management,ads_read,business_management,instagram_basic,instagram_content_publish,pages_read_engagement,pages_show_list';
    
    // Usar o ID do usuário como state para recuperá-lo no callback
    const state = req.user.userId;
    
    const loginUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}&response_type=code`;
    
    // Retornar a URL para o frontend redirecionar
    res.json({ url: loginUrl });
  } catch (error) {
    console.error('Erro ao gerar URL de autorização:', error);
    res.status(500).json({ 
      message: 'Erro ao gerar URL de autorização',
      error: error.message
    });
  }
};

// Processar o código de autorização e obter token de acesso
exports.handleCallback = async (req, res) => {
  try {
    const { code, state } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: 'Código de autorização ausente' });
    }
    
    // O state contém o ID do usuário
    const userId = state;
    
    // Buscar o usuário no banco de dados
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Configuração do Facebook
    const appId = process.env.FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || 'https://chefstudio.vercel.app/meta-callback';
    
    if (!appId || !appSecret) {
      return res.status(500).json({ 
        message: 'Configuração do Facebook incompleta',
        details: {
          appId: !!appId,
          appSecret: !!appSecret
        }
      });
    }
    
    // Trocar o código de autorização por um token de acesso
    const tokenResponse = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token`, {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code: code
      }
    });
    
    const { access_token, expires_in } = tokenResponse.data;
    
    if (!access_token) {
      return res.status(400).json({ message: 'Token de acesso não recebido' });
    }
    
    // Obter informações do usuário do Facebook
    const userResponse = await axios.get(`https://graph.facebook.com/v18.0/me`, {
      params: {
        access_token,
        fields: 'id,name,email'
      }
    });
    
    const { id: facebookId, name: facebookName } = userResponse.data;
    
    // Obter contas de anúncios do usuário
    const adAccountsResponse = await axios.get(`https://graph.facebook.com/v18.0/me/adaccounts`, {
      params: {
        access_token,
        fields: 'id,name,account_status'
      }
    });
    
    // Filtrar apenas contas ativas
    const adAccounts = adAccountsResponse.data.data.filter(account => account.account_status === 1);
    
    // Usar a primeira conta de anúncios ativa, se disponível
    const primaryAdAccount = adAccounts.length > 0 ? adAccounts[0] : null;
    
    // Atualizar o usuário com as informações do Meta
    user.facebookId = facebookId;
    user.facebookName = facebookName;
    user.metaAccessToken = access_token;
    user.metaTokenExpires = new Date(Date.now() + expires_in * 1000);
    user.metaConnectionStatus = 'connected';
    user.metaConnectedAt = new Date();
    
    if (primaryAdAccount) {
      user.adsAccountId = primaryAdAccount.id.replace('act_', '');
      user.adsAccountName = primaryAdAccount.name;
    }
    
    // Salvar todas as contas de anúncios disponíveis
    user.adAccounts = adAccounts.map(account => ({
      id: account.id,
      name: account.name,
      status: account.account_status
    }));
    
    // Salvar as alterações no usuário
    await user.save();
    
    // Retornar sucesso
    res.json({
      success: true,
      message: 'Conta conectada com sucesso ao Meta',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        facebookId: user.facebookId,
        facebookName: user.facebookName,
        metaConnectionStatus: user.metaConnectionStatus,
        metaConnectedAt: user.metaConnectedAt,
        adsAccountId: user.adsAccountId,
        adsAccountName: user.adsAccountName,
        adAccounts: user.adAccounts
      }
    });
  } catch (error) {
    console.error('Erro ao processar callback do Facebook:', error);
    res.status(500).json({ 
      message: 'Erro ao processar callback do Facebook',
      error: error.message,
      details: error.response?.data
    });
  }
};

// Verificar status da conexão com o Meta
exports.getConnectionStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Buscar o usuário no banco de dados
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar se o token de acesso existe e não expirou
    const isConnected = user.metaAccessToken && 
                        user.metaConnectionStatus === 'connected' &&
                        (!user.metaTokenExpires || new Date(user.metaTokenExpires) > new Date());
    
    res.json({
      connected: isConnected,
      status: user.metaConnectionStatus || 'disconnected',
      facebookId: user.facebookId,
      facebookName: user.facebookName,
      adsAccountId: user.adsAccountId,
      adsAccountName: user.adsAccountName,
      connectedAt: user.metaConnectedAt,
      tokenExpires: user.metaTokenExpires,
      adAccounts: user.adAccounts || []
    });
  } catch (error) {
    console.error('Erro ao verificar status da conexão:', error);
    res.status(500).json({ 
      message: 'Erro ao verificar status da conexão',
      error: error.message
    });
  }
};

// Desconectar do Meta
exports.disconnect = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Buscar o usuário no banco de dados
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Se houver um token de acesso, revogar no Facebook
    if (user.metaAccessToken) {
      try {
        await axios.delete(`https://graph.facebook.com/v18.0/me/permissions`, {
          params: {
            access_token: user.metaAccessToken
          }
        });
      } catch (revokeError) {
        console.warn('Erro ao revogar permissões no Facebook:', revokeError);
        // Continuar mesmo se a revogação falhar
      }
    }
    
    // Limpar informações do Meta no usuário
    user.facebookId = null;
    user.facebookName = null;
    user.metaAccessToken = null;
    user.metaTokenExpires = null;
    user.metaConnectionStatus = 'disconnected';
    user.metaConnectedAt = null;
    user.adsAccountId = null;
    user.adsAccountName = null;
    user.adAccounts = [];
    
    // Salvar as alterações no usuário
    await user.save();
    
    // Retornar sucesso
    res.json({
      success: true,
      message: 'Conta desconectada com sucesso do Meta'
    });
  } catch (error) {
    console.error('Erro ao desconectar do Meta:', error);
    res.status(500).json({ 
      message: 'Erro ao desconectar do Meta',
      error: error.message
    });
  }
};

// Obter contas de anúncios do usuário
exports.getAdAccounts = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Buscar o usuário no banco de dados
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar se o usuário está conectado ao Meta
    if (!user.metaAccessToken || user.metaConnectionStatus !== 'connected') {
      return res.status(400).json({ message: 'Usuário não está conectado ao Meta' });
    }
    
    // Obter contas de anúncios do usuário
    const response = await axios.get(`https://graph.facebook.com/v18.0/me/adaccounts`, {
      params: {
        access_token: user.metaAccessToken,
        fields: 'id,name,account_status,amount_spent,balance,currency,funding_source_details'
      }
    });
    
    // Filtrar apenas contas ativas
    const adAccounts = response.data.data.filter(account => account.account_status === 1);
    
    // Atualizar as contas de anúncios do usuário
    user.adAccounts = adAccounts.map(account => ({
      id: account.id,
      name: account.name,
      status: account.account_status,
      amountSpent: account.amount_spent,
      balance: account.balance,
      currency: account.currency,
      fundingSource: account.funding_source_details
    }));
    
    // Salvar as alterações no usuário
    await user.save();
    
    // Retornar as contas de anúncios
    res.json(adAccounts);
  } catch (error) {
    console.error('Erro ao obter contas de anúncios:', error);
    res.status(500).json({ 
      message: 'Erro ao obter contas de anúncios',
      error: error.message,
      details: error.response?.data
    });
  }
};

// Selecionar conta de anúncios principal
exports.selectAdAccount = async (req, res) => {
  try {
    const { adAccountId } = req.body;
    
    if (!adAccountId) {
      return res.status(400).json({ message: 'ID da conta de anúncios ausente' });
    }
    
    const userId = req.user.userId;
    
    // Buscar o usuário no banco de dados
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar se o usuário está conectado ao Meta
    if (!user.metaAccessToken || user.metaConnectionStatus !== 'connected') {
      return res.status(400).json({ message: 'Usuário não está conectado ao Meta' });
    }
    
    // Verificar se a conta de anúncios existe nas contas do usuário
    const adAccount = user.adAccounts?.find(account => account.id === `act_${adAccountId}` || account.id === adAccountId);
    
    if (!adAccount) {
      return res.status(400).json({ message: 'Conta de anúncios não encontrada ou não pertence ao usuário' });
    }
    
    // Atualizar a conta de anúncios principal do usuário
    user.adsAccountId = adAccountId.replace('act_', '');
    user.adsAccountName = adAccount.name;
    
    // Salvar as alterações no usuário
    await user.save();
    
    // Retornar sucesso
    res.json({
      success: true,
      message: 'Conta de anúncios selecionada com sucesso',
      adsAccountId: user.adsAccountId,
      adsAccountName: user.adsAccountName
    });
  } catch (error) {
    console.error('Erro ao selecionar conta de anúncios:', error);
    res.status(500).json({ 
      message: 'Erro ao selecionar conta de anúncios',
      error: error.message
    });
  }
};
