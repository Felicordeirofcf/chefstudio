const asyncHandler = require('express-async-handler');
const fetch = require('node-fetch');
const User = require('../models/user');

// @desc    Iniciar login com Facebook
// @route   GET /api/meta/login
// @access  Public
const facebookLogin = asyncHandler(async (req, res) => {
  // Usar as variáveis de ambiente com os nomes corretos conforme definido no Railway
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI || process.env.META_REDIRECT_URI;
  const clientId = process.env.FACEBOOK_CLIENT_ID || process.env.META_CLIENT_ID;
  
  // Verificar se as variáveis de ambiente estão definidas
  if (!clientId) {
    console.error("ERRO: FACEBOOK_CLIENT_ID não está definido nas variáveis de ambiente");
    return res.status(500).json({ 
      error: "Configuração incompleta", 
      message: "ID do cliente Facebook não está configurado no servidor" 
    });
  }
  
  if (!redirectUri) {
    console.error("ERRO: FACEBOOK_REDIRECT_URI não está definido nas variáveis de ambiente");
    return res.status(500).json({ 
      error: "Configuração incompleta", 
      message: "URI de redirecionamento não está configurado no servidor" 
    });
  }
  
  // Construir URL de autorização do Facebook
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=ads_management,ads_read,business_management,pages_read_engagement,pages_manage_ads,public_profile,email`;
  
  // Logar para debug
  console.log(`Gerando authUrl com clientId=${clientId} e redirectUri=${redirectUri}`);
  
  res.json({ authUrl });
});

// @desc    Callback do Facebook
// @route   GET /api/meta/callback
// @access  Public
const facebookCallback = asyncHandler(async (req, res) => {
  const { code } = req.query;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI || process.env.META_REDIRECT_URI;
  const clientId = process.env.FACEBOOK_CLIENT_ID || process.env.META_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET || process.env.META_CLIENT_SECRET;
  
  if (!code) {
    res.status(400);
    throw new Error('Código de autorização não fornecido');
  }
  
  try {
    // Trocar código por token de acesso
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&client_secret=${clientSecret}&code=${code}`
    );
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      throw new Error(`Erro ao obter token: ${tokenData.error.message}`);
    }
    
    const accessToken = tokenData.access_token;
    
    // Obter informações do usuário
    const userResponse = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${accessToken}`);
    const userData = await userResponse.json();
    
    if (userData.error) {
      throw new Error(`Erro ao obter dados do usuário: ${userData.error.message}`);
    }
    
    // Obter contas de anúncios
    const adAccountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status,amount_spent,business_name,currency,account_id&access_token=${accessToken}`
    );
    
    const adAccountsData = await adAccountsResponse.json();
    
    if (adAccountsData.error) {
      throw new Error(`Erro ao obter contas de anúncios: ${adAccountsData.error.message}`);
    }
    
    // Obter páginas
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}`
    );
    
    const pagesData = await pagesResponse.json();
    
    if (pagesData.error) {
      throw new Error(`Erro ao obter páginas: ${pagesData.error.message}`);
    }
    
    // Verificar se o usuário existe no banco de dados
    // Resto do código permanece igual...
  } catch (error) {
    console.error('Erro no callback do Facebook:', error);
    res.status(500).json({
      success: false,
      message: `Erro no callback do Facebook: ${error.message}`
    });
  }
});

// Exportar as funções
module.exports = {
  facebookLogin,
  facebookCallback,
  // Outros exports...
};
