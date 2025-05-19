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

// Configuração CORS universal - aceita qualquer origem para garantir funcionamento
app.use(cors({
  origin: true, // Permite qualquer origem
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Adicionar middleware para debug de CORS em produção
app.use((req, res, next) => {
  console.log('Origem da requisição:', req.headers.origin || 'undefined (provavelmente Swagger UI ou requisição interna)');
  console.log('Método:', req.method);
  console.log('Caminho:', req.path);
  console.log('Headers:', JSON.stringify(req.headers));
  
  // Adicionar headers CORS manualmente para garantir
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Responder imediatamente a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
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
    headers: req.headers,
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
  console.log(`CORS configurado para aceitar qualquer origem`);
  console.log(`Documentação Swagger disponível em: http://localhost:${PORT}/api-docs`);
  console.log(`Rota de teste CORS: http://localhost:${PORT}/api-cors-test`);
});
