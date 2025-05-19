const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/refreshtoken');
const User = require('../models/user');
const { BusinessManager } = require('facebook-nodejs-business-sdk');

// Gerar token JWT
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '1h' } // expiração de 1 hora
  );
};

// Gerar refresh token e salvar no banco
const generateRefreshToken = async (userId) => {
  const refreshTokenString = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias

  await RefreshToken.create({
    userId,
    token: refreshTokenString,
    expiresAt
  });

  return refreshTokenString;
};

// Criptografar token
const encryptToken = (token) => {
  const encKey = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encKey.slice(0, 32)), iv);
  let encrypted = cipher.update(token);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

// Descriptografar token
const decryptToken = (encryptedToken) => {
  const encKey = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  const [ivHex, encryptedHex] = encryptedToken.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encKey.slice(0, 32)), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

// Middleware de autenticação
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });

      req.user = user;
      return next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        const refreshTokenString = req.headers['x-refresh-token'];
        if (!refreshTokenString) {
          return res.status(401).json({ message: 'Token expirado', code: 'TOKEN_EXPIRED' });
        }

        const storedToken = await RefreshToken.findOne({ token: refreshTokenString });
        if (!storedToken || storedToken.expiresAt < new Date()) {
          return res.status(401).json({ message: 'Refresh token inválido ou expirado', code: 'REFRESH_TOKEN_INVALID' });
        }

        const newToken = generateToken(storedToken.userId);
        const user = await User.findById(storedToken.userId);
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });

        // Renova token do Facebook, se necessário
        if (user.facebookTokenExpiry && user.facebookTokenExpiry < new Date()) {
          try {
            const fbToken = decryptToken(user.facebookAccessToken);
            const businessManager = new BusinessManager(fbToken);

            // Aqui entraria a lógica de renovação real via API do Meta

            user.facebookTokenExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
            await user.save();
          } catch (fbError) {
            console.error('Erro ao renovar token do Facebook:', fbError);
          }
        }

        req.user = user;
        res.setHeader('X-New-Token', newToken);
        return next();
      } else {
        return res.status(401).json({ message: 'Token inválido' });
      }
    }
  } catch (error) {
    console.error('Erro de autenticação:', error);
    res.status(500).json({ message: 'Erro interno de autenticação' });
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  encryptToken,
  decryptToken,
  authMiddleware
};
