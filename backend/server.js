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

// Configurar CORS - versão mais permissiva para resolver problemas com Swagger UI e requisições internas
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://localhost:3000', 'https://chefstudio.vercel.app'];

// Adicionar o próprio domínio do backend às origens permitidas
const backendUrl = process.env.BASE_URL || 'https://chefstudio-production.up.railway.app';
if (!allowedOrigins.includes(backendUrl)) {
  allowedOrigins.push(backendUrl);
}

// Configuração CORS mais permissiva para todos os ambientes
app.use(cors({
  origin: function(origin, callback) {
    // Permitir requisições sem origin (como apps mobile, Postman, Swagger UI ou requisições internas)
    if (!origin) return callback(null, true);
    
    // Verificar se a origem está na lista de permitidas
    // Remover barras finais para comparação mais flexível
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    
    // Verificar se a origem é o próprio backend
    if (normalizedOrigin.includes('railway.app') || normalizedOrigin.includes('localhost')) {
      return callback(null, true);
    }
    
    const originAllowed = allowedOrigins.some(allowed => {
      const normalizedAllowed = allowed.endsWith('/') ? allowed.slice(0, -1) : allowed;
      return normalizedOrigin === normalizedAllowed;
    });
    
    if (!originAllowed) {
      console.warn(`CORS bloqueou acesso de origem: ${origin}`);
      console.warn(`Origens permitidas: ${allowedOrigins.join(', ')}`);
      // Em vez de bloquear com erro, vamos permitir em modo de desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      const msg = 'A política CORS para este site não permite acesso da origem especificada.';
      return callback(new Error(msg), false);
    }
    
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Adicionar middleware para debug de CORS em produção
app.use((req, res, next) => {
  console.log('Origem da requisição:', req.headers.origin || 'undefined (provavelmente Swagger UI ou requisição interna)');
  next();
});

// Inicializar Passport
app.use(passport.initialize());

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado ao MongoDB'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Configurar Swagger
const swaggerFile = path.resolve(__dirname, 'swagger.json');
let swaggerDocument = null;

if (fs.existsSync(swaggerFile)) {
  swaggerDocument = require(swaggerFile);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

// Rota raiz para redirecionar para a documentação Swagger ou exibir mensagem de boas-vindas
app.get('/', (req, res) => {
  if (swaggerDocument) {
    res.redirect('/api-docs');
  } else {
    res.status(200).json({
      message: 'Bem-vindo à API do ChefStudio',
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth',
        ads: '/api/ads',
        notifications: '/api/notifications',
        health: '/api/health',
        docs: '/api-docs'
      },
      status: 'online',
      timestamp: new Date()
    });
  }
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Rota de verificação de saúde
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Rota para verificar configuração CORS
app.options('/api/cors-test', cors());
app.get('/api/cors-test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'CORS está configurado corretamente',
    requestOrigin: req.headers.origin || 'undefined (provavelmente Swagger UI ou requisição interna)',
    allowedOrigins: allowedOrigins,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Servir frontend em produção
if (process.env.NODE_ENV === 'production') {
  // Verificar se a pasta dist existe
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
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS permitido para: ${allowedOrigins.join(', ')}`);
  console.log(`Documentação Swagger disponível em: http://localhost:${PORT}/api-docs`);
  console.log(`Rota de teste CORS: http://localhost:${PORT}/api-cors-test`);
});
