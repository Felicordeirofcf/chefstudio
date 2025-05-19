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

// Inicializar app
const app = express();

// Parsing de JSON com limites seguros
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Definir origens permitidas
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'https://chefstudio.vercel.app',
      'https://chefstudio-production.up.railway.app',
      'http://localhost:5173',
      'http://localhost:3000'
    ];

// Middleware principal de CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    console.warn(`🛑 Origem bloqueada por CORS: ${origin}`);
    return callback(new Error('Origem não permitida por CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Headers manuais de CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Inicializar autenticação
app.use(passport.initialize());

// Rotas da aplicação
app.use('/api/auth', authRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Swagger (Documentação da API)
let swaggerSpec;
try {
  const swaggerJson = fs.readFileSync(path.join(__dirname, 'swagger.json'), 'utf8');
  swaggerSpec = JSON.parse(swaggerJson);
} catch (err) {
  console.warn('⚠️ Arquivo swagger.json ausente ou inválido. Usando fallback.');
  swaggerSpec = {
    openapi: '3.0.0',
    info: {
      title: 'ChefStudio API',
      version: '1.0.0',
      description: 'Documentação indisponível'
    },
    paths: {}
  };
}
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rota principal
app.get('/', (req, res) => {
  res.json({
    message: 'ChefStudio API online',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    documentation: '/api-docs',
    allowedOrigins
  });
});

// Rota de teste de CORS
app.options('/api/cors-test', cors());
app.get('/api/cors-test', (req, res) => {
  res.json({
    success: true,
    message: 'CORS validado com sucesso',
    origin: req.headers.origin || 'undefined',
    allowedOrigins,
    headers: req.headers
  });
});

// Rota de teste MongoDB
app.get('/api/db-test', async (req, res) => {
  try {
    const status = mongoose.connection.readyState;
    const statusText = ['desconectado', 'conectado', 'conectando', 'desconectando'][status] || 'desconhecido';
    let dbSuccess = false;
    let dbError = null;

    if (status === 1) {
      try {
        await mongoose.connection.db.listCollections().toArray();
        dbSuccess = true;
      } catch (err) {
        dbError = err.message;
      }
    }

    res.json({
      status,
      statusText,
      dbSuccess,
      dbError,
      uri: process.env.MONGODB_URI?.replace(/\/\/([^:]+):([^@]+)@/, '//[USERNAME]:[PASSWORD]@') || 'não configurada'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Conexão com o MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Conectado ao MongoDB com sucesso');
    console.log('🔐 URI:', process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//[USERNAME]:[PASSWORD]@'));
  })
  .catch(err => {
    console.error('❌ Erro ao conectar ao MongoDB:', err.message);
  });

// Inicialização do servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📘 Swagger: http://localhost:${PORT}/api-docs`);
  console.log(`🔄 Teste CORS: http://localhost:${PORT}/api/cors-test`);
  console.log(`🧪 Teste MongoDB: http://localhost:${PORT}/api/db-test`);
});
