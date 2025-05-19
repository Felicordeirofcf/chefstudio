require('dotenv').config(); // ⚠️ Deve ser o primeiro a ser carregado

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('./middleware/passport');
const authRoutes = require('./routes/auth');
const adsRoutes = require('./routes/ads');
const notificationsRoutes = require('./routes/notifications');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');

// Inicializar app Express
const app = express();

// Middleware para parsing de JSON
app.use(express.json());

// CORS — lista de origens permitidas (local, vercel e railway)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://chefstudio.vercel.app',
  'https://chefstudio-production.up.railway.app'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // aceita requests sem origin (ex: curl, Swagger local)
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('A política CORS para este site não permite acesso da origem especificada.'), false);
  },
  credentials: true
}));

// Inicializar Passport
app.use(passport.initialize());

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Conectado ao MongoDB'))
  .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));

// Swagger UI (se existir swagger.json)
const swaggerFile = path.resolve(__dirname, 'swagger.json');
if (fs.existsSync(swaggerFile)) {
  const swaggerDocument = require(swaggerFile);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Rota de verificação de saúde
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Servir frontend em produção
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../frontend/dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// Iniciar servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
