// Unificando os middlewares de autenticação para evitar duplicidade
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Middleware para verificar token JWT
const authMiddleware = async (req, res, next) => {
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
    
    // Buscar o usuário pelo ID e não incluir a senha
    const user = await User.findById(decoded.userId || decoded.id).select('-password');
    if (!user) {
      console.log('Usuário não encontrado após verificação do token');
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }
    
    // Adicionar o usuário e ID ao objeto de requisição
    req.user = { 
      userId: user._id,
      role: user.role,
      email: user.email,
      name: user.name
    };
    
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

// Para compatibilidade com código existente
const protect = authMiddleware;

module.exports = { 
  authMiddleware,
  protect
};
