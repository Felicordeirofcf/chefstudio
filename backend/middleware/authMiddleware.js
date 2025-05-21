const jwt = require('jsonwebtoken');
const User = require('../models/user');

exports.protect = async (req, res, next) => {
  let token;

  // Verificar se o token está no header Authorization
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Obter o token do header
      token = req.headers.authorization.split(' ')[1];

      // Verificar o token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

      // Buscar o usuário pelo ID e não incluir a senha
      req.user = await User.findById(decoded.userId || decoded.id).select('-password');

      if (!req.user) {
        console.log('❌ Usuário não encontrado após verificação do token');
        return res.status(401).json({ message: 'Usuário não encontrado' });
      }

      next();
    } catch (error) {
      console.error('❌ Erro de autenticação:', error.message);
      return res.status(401).json({ message: 'Token inválido ou expirado' });
    }
  } else {
    console.log('❌ Token não fornecido no header Authorization');
    return res.status(401).json({ message: 'Acesso não autorizado, token não fornecido' });
  }
};
