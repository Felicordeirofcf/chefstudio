const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
// Usando path relativo com case minúsculo
const User = require('../models/user');
const { encryptToken } = require('./auth');

// Verificar se todas as variáveis de ambiente necessárias estão presentes
const hasFacebookConfig = process.env.FB_APP_ID && 
                         process.env.FB_APP_SECRET && 
                         process.env.FACEBOOK_REDIRECT_URI;

// Configurar estratégia do Facebook apenas se as variáveis de ambiente estiverem configuradas
if (hasFacebookConfig) {
  passport.use(new FacebookStrategy({
      clientID: process.env.FB_APP_ID,
      clientSecret: process.env.FB_APP_SECRET,
      callbackURL: process.env.FACEBOOK_REDIRECT_URI,
      profileFields: ['id', 'displayName', 'email', 'photos']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Verificar se o usuário já existe
        let user = await User.findOne({ facebookId: profile.id });
        
        if (user) {
          // Atualizar token de acesso
          user.facebookAccessToken = encryptToken(accessToken);
          
          // Definir data de expiração (60 dias a partir de agora)
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 60);
          user.facebookTokenExpiry = expiryDate;
          
          await user.save();
        } else {
          // Criar novo usuário
          user = new User({
            name: profile.displayName,
            email: profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@facebook.com`,
            facebookId: profile.id,
            facebookAccessToken: encryptToken(accessToken),
            facebookTokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 dias
          });
          
          await user.save();
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));
} else {
  console.warn('Facebook OAuth não configurado. Variáveis de ambiente FB_APP_ID, FB_APP_SECRET ou FACEBOOK_REDIRECT_URI não definidas.');
}

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

module.exports = passport;
