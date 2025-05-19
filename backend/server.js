const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const passport = require('./middleware/passport');
const authRoutes = require('./routes/auth');
const adsRoutes = require('./routes/ads');
const notificationsRoutes = require('./routes/notifications');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
dotenv.config();

// Inicializar app Express
const app = express();

// Middleware para parsing de JSON
app.use(express.json());

// Configurar CORS com múltiplas origens válidas
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://chefstudio.vercel.app',
  'https://chefstudio-production.up.railway.app',
];

// Middleware de CORS com log para debug
app.use(cors({
  origin: function (origin, callback) {
    console.log('🌐 Origem da requisição:', origin);

    if (!origin) return callback(null, true); // permitir chamadas sem origin
    if (allowedOrigins.includes(origin)) return callback(null, true);

    const msg = 'A política CORS para este site não permite acesso da origem especificada.';
    return callback(new Error(msg), false);
  },
  credentials: true,
}));

// Inicializar Passport
app.use(passport.initialize());

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Conectado ao MongoDB'))
  .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));

// Configurar Swagger (se swagger.json existir)
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
