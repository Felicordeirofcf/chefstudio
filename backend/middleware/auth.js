const jwt = require('jsonwebtoken');
const crypto = require('crypto');
// Importando o modelo diretamente do mesmo diretório para evitar problemas de path
const refreshToken = require('./refreshtoken');
const User = require('../models/user');
const { BusinessManager } = require('facebook-nodejs-business-sdk');

// Função para gerar token JWT
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '1h' } // Token de acesso expira em 1 hora
  );
};

// Função para gerar refresh token
const generateRefreshToken = async (userId) => {
  // Criar token aleatório
  const refreshTokenString = crypto.randomBytes(40).toString('hex');
  
  // Definir data de expiração (30 dias)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  
  // Salvar no banco de dados
  await refreshToken.create({
    userId,
    token: refreshTokenString,
    expiresAt
  });
  
  return refreshTokenString;
};

// Função para criptografar tokens sensíveis
const encryptToken = (token) => {
  // Em produção, use uma chave de criptografia armazenada em variável de ambiente
  const encKey = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encKey.slice(0, 32)), iv);
  let encrypted = cipher.update(token);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

// Função para descriptografar tokens
const decryptToken = (encryptedToken) => {
  const encKey = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  const textParts = encryptedToken.split(':');
  const iv = Buffer.from(textParts[0], 'hex');
  const encryptedText = Buffer.from(textParts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encKey.slice(0, 32)), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

// Middleware para verificar autenticação
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Verificar token JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Buscar usuário
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      
      req.user = user;
      next();
    } catch (error) {
      // Se o token expirou, verificar se há refresh token
      if (error.name === 'TokenExpiredError') {
        // Verificar se o refresh token foi fornecido
        const refreshTokenString = req.headers['x-refresh-token'];
        if (!refreshTokenString) {
          return res.status(401).json({ 
            message: 'Token expirado',
            code: 'TOKEN_EXPIRED'
          });
        }
        
        // Verificar se o refresh token é válido
        const storedToken = await refreshToken.findOne({ token: refreshTokenString });
        if (!storedToken || storedToken.expiresAt < new Date()) {
          return res.status(401).json({ 
            message: 'Refresh token inválido ou expirado',
            code: 'REFRESH_TOKEN_INVALID'
          });
        }
        
        // Gerar novo token JWT
        const newToken = generateToken(storedToken.userId);
        
        // Buscar usuário
        const user = await User.findById(storedToken.userId);
        if (!user) {
          return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        
        // Verificar se o token do Facebook expirou
        if (user.facebookTokenExpiry && user.facebookTokenExpiry < new Date()) {
          // Tentar renovar o token do Facebook
          try {
            // Implementação da renovação do token do Facebook
            // Isso depende da API do Facebook e pode variar
            
            // Exemplo simplificado:
            const fbToken = decryptToken(user.facebookAccessToken);
            const businessManager = new BusinessManager(fbToken);
            
            // Aqui você implementaria a lógica para renovar o token
            // usando a API do Facebook
            
            // Atualizar o token no banco de dados
            user.facebookTokenExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 dias
            await user.save();
          } catch (fbError) {
            console.error('Erro ao renovar token do Facebook:', fbError);
            // Não interromper o fluxo, apenas registrar o erro
          }
        }
        
        req.user = user;
        
        // Enviar novo token no cabeçalho
        res.setHeader('X-New-Token', newToken);
        next();
      } else {
        return res.status(401).json({ message: 'Token inválido' });
      }
    }
  } catch (error) {
    console.error('Erro de autenticação:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  encryptToken,
  decryptToken,
  authMiddleware
};
