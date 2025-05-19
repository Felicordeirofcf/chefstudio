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

// Middleware para parsing de JSON com limite aumentado
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuração CORS para permitir qualquer origem
app.use(cors({
  origin: '*', // Permite qualquer origem
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware para garantir headers CORS em todas as respostas
app.use((req, res, next) => {
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

// Definir rotas
app.use('/api/auth', authRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Carregar e configurar Swagger
let swaggerSpec;
try {
  const swaggerJson = fs.readFileSync(path.join(__dirname, 'swagger.json'), 'utf8');
  swaggerSpec = JSON.parse(swaggerJson);
} catch (err) {
  console.warn('Arquivo swagger.json não encontrado ou inválido. Documentação API não estará disponível.');
  swaggerSpec = {
    openapi: '3.0.0',
    info: {
      title: 'ChefStudio API',
      version: '1.0.0',
      description: 'API para o ChefStudio - Documentação não disponível'
    },
    paths: {}
  };
}

// Rota para documentação Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'ChefStudio API está funcionando!',
    version: '1.0.0',
    documentation: '/api-docs',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Teste CORS
app.options('/api/cors-test', cors());
app.get('/api/cors-test', (req, res) => {
  res.json({
    success: true,
    message: 'CORS está configurado corretamente',
    requestOrigin: req.headers.origin || 'undefined',
    headers: req.headers,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Teste MongoDB
app.get('/api/db-test', async (req, res) => {
  try {
    const status = mongoose.connection.readyState;
    let statusText = ['desconectado', 'conectado', 'conectando', 'desconectando'][status] || 'desconhecido';
    let dbOperationSuccess = false;
    let dbOperationError = null;
    
    if (status === 1) {
      try {
        // Tentar uma operação simples no banco de dados
        const collections = await mongoose.connection.db.listCollections().toArray();
        dbOperationSuccess = true;
      } catch (err) {
        dbOperationError = err.message;
      }
    }
    
    res.json({
      status,
      statusText,
      dbOperationSuccess,
      dbOperationError,
      mongodbUri: process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//[USERNAME]:[PASSWORD]@') : 'não configurado'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Conectado ao MongoDB com sucesso');
    console.log('URI do MongoDB:', process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//[USERNAME]:[PASSWORD]@'));
  })
  .catch(err => {
    console.error('Erro ao conectar ao MongoDB:', err);
  });

// Iniciar servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS configurado para aceitar qualquer origem`);
  console.log(`Documentação Swagger disponível em: http://localhost:${PORT}/api-docs`);
  console.log(`Rota de teste CORS: http://localhost:${PORT}/api/cors-test`);
  console.log(`Rota de teste de banco de dados: http://localhost:${PORT}/api/db-test`);
  console.log(`Rota de teste de autenticação: http://localhost:${PORT}/api/auth/test`);
});
