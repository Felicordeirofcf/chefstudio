// Middleware para validação de token Meta usando https nativo em vez de node-fetch
const https = require('https');
const User = require('../models/userModel');

/**
 * Função auxiliar para fazer requisições HTTP usando o módulo https nativo
 * @param {string} url - URL completa para a requisição
 * @returns {Promise<Object>} - Promise que resolve para o objeto JSON da resposta
 */
const httpsRequest = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      // Receber os dados em chunks
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      // Quando a resposta terminar, parsear o JSON
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve(parsedData);
        } catch (error) {
          reject(new Error(`Erro ao parsear resposta: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Erro na requisição: ${error.message}`));
    });
  });
};

/**
 * Middleware para validar token Meta antes de acessar rotas protegidas
 * Verifica se o token existe, não está expirado e é válido com a API do Meta
 */
const validateMetaToken = async (req, res, next) => {
  try {
    // Verificar se o usuário está autenticado
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    
    // Buscar usuário no banco de dados
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar se o token Meta existe
    if (!user.metaAccessToken) {
      return res.status(400).json({ 
        message: 'Usuário não está conectado ao Meta',
        metaConnectionStatus: 'disconnected',
        requiresAuth: true
      });
    }
    
    // Verificar se o token está expirado
    if (user.metaTokenExpires && user.metaTokenExpires < Date.now()) {
      // Atualizar status de conexão
      user.metaConnectionStatus = 'disconnected';
      await user.save();
      
      return res.status(401).json({ 
        message: 'Token Meta expirado. Por favor, reconecte sua conta.',
        metaConnectionStatus: 'expired',
        requiresAuth: true
      });
    }
    
    // Verificar se o token é válido fazendo uma chamada de teste à API do Meta
    try {
      const url = `https://graph.facebook.com/v18.0/me?access_token=${user.metaAccessToken}`;
      const data = await httpsRequest(url);
      
      if (data.error) {
        // Token inválido, atualizar status
        user.metaConnectionStatus = 'disconnected';
        await user.save();
        
        return res.status(401).json({ 
          message: `Token Meta inválido: ${data.error.message}`,
          metaConnectionStatus: 'invalid',
          requiresAuth: true
        });
      }
      
      // Token válido, garantir que o status esteja como conectado
      if (user.metaConnectionStatus !== 'connected') {
        user.metaConnectionStatus = 'connected';
        await user.save();
      }
      
      // Adicionar informações do Meta ao objeto de requisição para uso nos controladores
      req.metaInfo = {
        accessToken: user.metaAccessToken,
        userId: user.metaId,
        adAccounts: user.metaAdAccounts || [],
        primaryAdAccountId: user.metaPrimaryAdAccountId
      };
      
      // Continuar para o próximo middleware ou controlador
      next();
      
    } catch (error) {
      console.error('Erro ao validar token Meta:', error);
      return res.status(500).json({ 
        message: 'Erro ao validar conexão com Meta',
        error: error.message
      });
    }
    
  } catch (error) {
    console.error('Erro no middleware de validação Meta:', error);
    return res.status(500).json({ 
      message: 'Erro interno ao validar conexão Meta',
      error: error.message
    });
  }
};

module.exports = validateMetaToken;
