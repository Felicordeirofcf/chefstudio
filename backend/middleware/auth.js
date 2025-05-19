const jwt = require('jsonwebtoken');
const refreshToken = require('../models/refreshtoken');

// Middleware de autenticação
const authMiddleware = async (req, res, next) => {
  try {
    // Verificar se o token está presente no header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Token não fornecido ou formato inválido');
      return res.status(401).json({ message: 'Não autorizado' });
    }
    
    // Extrair o token
    const token = authHeader.split(' ')[1];
    
    // Verificar e decodificar o token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.log('Token expirado');
        return res.status(401).json({ 
          message: 'Token expirado', 
          expired: true 
        });
      }
      
      console.log('Token inválido:', error.message);
      return res.status(401).json({ message: 'Token inválido' });
    }
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

module.exports = { authMiddleware };
