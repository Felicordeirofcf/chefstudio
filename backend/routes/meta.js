const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// Rota básica para Meta/Facebook
router.get('/test', (req, res) => {
  res.status(200).json({ 
    message: 'API Meta está funcionando',
    timestamp: new Date()
  });
});

// Rota de callback para autenticação Facebook
router.get('/callback', (req, res) => {
  res.status(200).json({ 
    message: 'Callback do Facebook recebido',
    query: req.query
  });
});

// Rota para conectar conta do Facebook
router.get('/connect', (req, res) => {
  const redirectUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FB_APP_ID}&redirect_uri=${process.env.FACEBOOK_REDIRECT_URI}&scope=ads_management,ads_read,public_profile,email`;
  
  res.status(200).json({ 
    message: 'URL para conectar conta do Facebook',
    redirectUrl
  });
});

module.exports = router;
