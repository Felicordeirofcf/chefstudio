// Middleware para validação de token Meta
const fetch = require('node-fetch');
const User = require('../models/userModel');

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
      const response = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${user.metaAccessToken}`);
      const data = await response.json();
      
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
