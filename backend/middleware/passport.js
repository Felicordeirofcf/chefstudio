const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const { BusinessManager } = require('facebook-nodejs-business-sdk');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

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

// Configuração do Passport com Facebook Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FB_APP_ID,
    clientSecret: process.env.FB_APP_SECRET,
    callbackURL: process.env.FACEBOOK_REDIRECT_URI,
    profileFields: ['id', 'displayName', 'email'],
    scope: ['email', 'public_profile', 'ads_management', 'ads_read', 'business_management']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Verificar se o usuário já existe no banco de dados
      let user = await User.findOne({ facebookId: profile.id });
      
      // Se não existir, criar um novo usuário
      if (!user) {
        user = new User({
          name: profile.displayName,
          email: profile.emails[0].value,
          facebookId: profile.id,
          facebookAccessToken: encryptToken(accessToken),
          facebookTokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 dias
        });
        
        await user.save();
      } else {
        // Atualizar o token de acesso
        user.facebookAccessToken = encryptToken(accessToken);
        user.facebookTokenExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
        await user.save();
      }
      
      // Obter ID da conta de anúncios
      try {
        const businessManager = new BusinessManager(accessToken);
        const adAccounts = await businessManager.getOwnedAdAccounts(['id', 'name', 'currency']);
        
        if (adAccounts && adAccounts.length > 0) {
          // Salvar a primeira conta de anúncios encontrada
          user.adsAccountId = adAccounts[0].id;
          user.adsAccountName = adAccounts[0].name;
          user.adsAccountCurrency = adAccounts[0].currency;
          user.lastSyncDate = new Date();
          await user.save();
        }
      } catch (adsError) {
        console.error('Erro ao obter contas de anúncios:', adsError);
        // Não interromper o fluxo de autenticação se falhar ao obter contas
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Serialização e deserialização do usuário
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

module.exports = {
  passport,
  encryptToken,
  decryptToken
};
