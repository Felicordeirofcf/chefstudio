const jwt = require('jsonwebtoken');

// Middleware para verificar token JWT
const authMiddleware = (req, res, next) => {
  try {
    // Obter o token do header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token de autenticação não fornecido' });
    }
    
    // Extrair o token
    const token = authHeader.split(' ')[1];
    
    // Verificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Adicionar o ID do usuário ao objeto de requisição
    req.user = { userId: decoded.userId };
    
    next();
  } catch (error) {
    console.error('Erro de autenticação:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    
    res.status(401).json({ message: 'Não autorizado', error: error.message });
  }
};

module.exports = { authMiddleware };
