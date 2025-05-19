const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/user');

// Configuração condicional do Facebook OAuth
const configureFacebookStrategy = () => {
  const fbAppId = process.env.FB_APP_ID;
  const fbAppSecret = process.env.FB_APP_SECRET;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI;

  if (!fbAppId || !fbAppSecret || !redirectUri) {
    console.warn('Facebook OAuth não configurado. Variáveis de ambiente FB_APP_ID, FB_APP_SECRET ou FACEBOOK_REDIRECT_URI não definidas.');
    return null;
  }

  return new FacebookStrategy({
    clientID: fbAppId,
    clientSecret: fbAppSecret,
    callbackURL: redirectUri,
    profileFields: ['id', 'emails', 'name', 'displayName'],
    enableProof: true
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Autenticação Facebook: perfil recebido', {
        id: profile.id,
        displayName: profile.displayName,
        email: profile.emails && profile.emails[0] ? profile.emails[0].value : 'não fornecido'
      });

      // Verificar se o usuário já existe
      let user = await User.findOne({ facebookId: profile.id });
      
      // Se não existir pelo facebookId, tentar pelo email
      if (!user && profile.emails && profile.emails[0]) {
        user = await User.findOne({ email: profile.emails[0].value });
      }
      
      if (user) {
        console.log('Usuário existente encontrado, atualizando tokens');
        // Atualizar tokens
        user.facebookId = profile.id;
        user.facebookAccessToken = accessToken;
        user.facebookTokenExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 dias
        await user.save();
        return done(null, user);
      }
      
      // Criar novo usuário
      console.log('Criando novo usuário com Facebook');
      const newUser = new User({
        name: profile.displayName || `${profile.name.givenName} ${profile.name.familyName}`,
        email: profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@facebook.com`,
        facebookId: profile.id,
        facebookAccessToken: accessToken,
        facebookTokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 dias
      });
      
      await newUser.save();
      console.log('Novo usuário criado com sucesso, ID:', newUser._id);
      done(null, newUser);
    } catch (error) {
      console.error('Erro na autenticação Facebook:', error);
      done(error, null);
    }
  });
};

// Configurar Passport
const facebookStrategy = configureFacebookStrategy();
if (facebookStrategy) {
  passport.use(facebookStrategy);
}

// Serialização e deserialização de usuário
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
