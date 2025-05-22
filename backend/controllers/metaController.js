// Versão corrigida do controlador de autenticação Meta
const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");

// Configurações do Meta
const APP_ID = process.env.META_APP_ID || "2430942723957669";
const APP_SECRET = process.env.META_APP_SECRET || "470806b6e330fff673451f5689ca3d4d";
const REDIRECT_URI = process.env.META_REDIRECT_URI || "https://chefstudio-production.up.railway.app/api/meta/callback";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://chefstudio.vercel.app";
const SCOPES = "ads_management,ads_read,business_management,public_profile,email";

// @desc    Iniciar login com Facebook
// @route   GET /api/meta/login
// @access  Public
const facebookLogin = (req, res) => {
  try {
    // Obter userId da query e garantir que seja passado para o callback
    const userId = req.query.userId;
    
    if (!userId) {
      console.error("Tentativa de login Meta sem userId");
      return res.redirect(`${FRONTEND_URL}/connect-meta?meta_error=true&message=${encodeURIComponent("ID do usuário não fornecido")}`);
    }
    
    console.log(`Iniciando login Meta para usuário: ${userId}`);
    
    // Gerar URL de autorização do Facebook com userId no state
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&response_type=code&state=${userId}`;
    
    // Redirecionar para a URL de autorização
    res.redirect(authUrl);
  } catch (error) {
    console.error("Erro ao iniciar login com Facebook:", error);
    res.redirect(`${FRONTEND_URL}/connect-meta?meta_error=true&message=${encodeURIComponent(error.message)}`);
  }
};

// @desc    Callback do Facebook após autorização
// @route   GET /api/meta/callback
// @access  Public
const facebookCallback = asyncHandler(async (req, res) => {
  try {
    const { code, state } = req.query;
    
    // O state deve conter o userId
    const userId = state;
    
    if (!userId) {
      console.error("Callback Meta recebido sem userId no state");
      throw new Error("ID do usuário não encontrado no retorno da autenticação");
    }
    
    if (!code) {
      console.error("Callback Meta recebido sem código de autorização");
      throw new Error("Código de autorização não recebido");
    }
    
    console.log(`Processando callback Meta para usuário: ${userId}`);
    
    // Trocar código por token de acesso
    const tokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${APP_SECRET}&code=${code}`, {
      method: "GET",
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error("Token de acesso não recebido do Meta:", tokenData);
      throw new Error("Token de acesso não recebido");
    }
    
    console.log(`Token Meta obtido com sucesso para usuário: ${userId}`);
    
    // Obter informações do usuário Meta
    const userResponse = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${tokenData.access_token}`, {
      method: "GET",
    });
    
    const userData = await userResponse.json();
    
    if (!userData.id) {
      console.error("ID do usuário Meta não recebido:", userData);
      throw new Error("ID do usuário Meta não recebido");
    }
    
    console.log(`Informações do usuário Meta obtidas: ${userData.id} (${userData.name})`);
    
    // Obter contas de anúncios
    const adAccountsResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status&access_token=${tokenData.access_token}`, {
      method: "GET",
    });
    
    const adAccountsData = await adAccountsResponse.json();
    
    // Verificar se há erro na resposta de contas de anúncios
    if (adAccountsData.error) {
      console.error("Erro ao obter contas de anúncios:", adAccountsData.error);
      throw new Error(`Erro ao obter contas de anúncios: ${adAccountsData.error.message}`);
    }
    
    // Verificar se o usuário tem pelo menos uma conta de anúncios
    if (!adAccountsData.data || adAccountsData.data.length === 0) {
      console.error("Nenhuma conta de anúncios encontrada para o usuário Meta");
      throw new Error("Nenhuma conta de anúncios encontrada. Verifique se você tem uma conta de anúncios no Business Manager.");
    }
    
    console.log(`Contas de anúncios encontradas: ${adAccountsData.data.length}`);
    
    // Atualizar usuário no banco de dados
    const user = await User.findById(userId);
    
    if (!user) {
      console.error(`Usuário não encontrado no banco de dados: ${userId}`);
      throw new Error("Usuário não encontrado no sistema");
    }
    
    // Atualizar dados do Meta no usuário
    user.metaId = userData.id;
    user.metaName = userData.name;
    user.metaEmail = userData.email || user.email;
    user.metaAccessToken = tokenData.access_token;
    user.metaTokenExpires = Date.now() + (tokenData.expires_in * 1000);
    
    // Salvar todas as contas de anúncios
    user.metaAdAccounts = adAccountsData.data.map(account => ({
      id: account.id,
      name: account.name,
      status: account.account_status
    }));
    
    // Selecionar e salvar a conta de anúncios principal (a primeira ativa ou a primeira da lista)
    const primaryAdAccount = adAccountsData.data.find(account => account.account_status === 1) || adAccountsData.data[0];
    user.metaPrimaryAdAccountId = primaryAdAccount.id;
    user.metaPrimaryAdAccountName = primaryAdAccount.name;
    
    // Definir status de conexão como conectado
    user.metaConnectionStatus = "connected";
    
    // Salvar alterações no banco de dados
    await user.save();
    
    console.log(`Usuário ${userId} conectado ao Meta com sucesso. Primary Ad Account ID: ${user.metaPrimaryAdAccountId}`);
    
    // Adicionar timestamp para evitar problemas de cache
    const timestamp = Date.now();
    
    // Redirecionar para a página de callback no frontend
    res.redirect(`${FRONTEND_URL}/meta-callback?meta_connected=true&userId=${userId}&timestamp=${timestamp}`);
    
  } catch (error) {
    console.error("Erro no callback do Facebook:", error);
    res.redirect(`${FRONTEND_URL}/meta-callback?meta_error=true&message=${encodeURIComponent(error.message)}`);
  }
});

// @desc    Obter status de conexão com Meta
// @route   GET /api/meta/connection-status
// @access  Private
const getConnectionStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (!user) {
    res.status(404);
    throw new Error("Usuário não encontrado");
  }
  
  // Verificar se o token expirou
  const tokenExpired = user.metaTokenExpires && user.metaTokenExpires < Date.now();
  
  // Verificar se o usuário está realmente conectado
  const isConnected = user.metaConnectionStatus === "connected" && 
                      user.metaAccessToken && 
                      user.metaId && 
                      !tokenExpired;
  
  console.log(`Status de conexão Meta para usuário ${user._id}: ${isConnected ? 'Conectado' : 'Desconectado'}`);
  
  if (tokenExpired) {
    console.log(`Token Meta expirado para usuário ${user._id}`);
  }
  
  res.json({
    connected: isConnected,
    metaId: user.metaId || null,
    metaName: user.metaName || null,
    metaEmail: user.metaEmail || null,
    adAccounts: user.metaAdAccounts || [],
    primaryAdAccountId: user.metaPrimaryAdAccountId || null,
    primaryAdAccountName: user.metaPrimaryAdAccountName || null,
    tokenExpired: tokenExpired || false
  });
});

// @desc    Verificar e atualizar status de conexão Meta
// @route   GET /api/meta/verify-connection
// @access  Private
const verifyConnection = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (!user) {
    res.status(404);
    throw new Error("Usuário não encontrado");
  }
  
  // Verificar se o usuário tem token Meta
  if (!user.metaAccessToken) {
    user.metaConnectionStatus = "disconnected";
    await user.save();
    
    return res.json({
      connected: false,
      message: "Usuário não possui token Meta"
    });
  }
  
  // Verificar se o token expirou
  if (user.metaTokenExpires && user.metaTokenExpires < Date.now()) {
    user.metaConnectionStatus = "disconnected";
    await user.save();
    
    return res.json({
      connected: false,
      tokenExpired: true,
      message: "Token Meta expirado"
    });
  }
  
  try {
    // Verificar se o token é válido fazendo uma chamada à API do Meta
    const response = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${user.metaAccessToken}`);
    const data = await response.json();
    
    if (data.error) {
      // Token inválido, atualizar status
      user.metaConnectionStatus = "disconnected";
      await user.save();
      
      return res.json({
        connected: false,
        message: `Token Meta inválido: ${data.error.message}`
      });
    }
    
    // Token válido, garantir que o status esteja como conectado
    if (user.metaConnectionStatus !== "connected") {
      user.metaConnectionStatus = "connected";
      await user.save();
    }
    
    return res.json({
      connected: true,
      metaId: data.id,
      metaName: data.name
    });
    
  } catch (error) {
    console.error("Erro ao verificar conexão Meta:", error);
    
    // Em caso de erro, marcar como desconectado
    user.metaConnectionStatus = "disconnected";
    await user.save();
    
    return res.json({
      connected: false,
      message: `Erro ao verificar conexão: ${error.message}`
    });
  }
});

module.exports = {
  facebookLogin,
  facebookCallback,
  getConnectionStatus,
  verifyConnection
};
