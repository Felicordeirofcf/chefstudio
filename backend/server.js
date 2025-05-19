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

// Middleware para logging de requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Log do corpo da requisição para rotas de autenticação
  if (req.path.startsWith('/api/auth') && req.method !== 'GET') {
    const sanitizedBody = { ...req.body };
    // Remover dados sensíveis dos logs
    if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
    if (sanitizedBody.refreshToken) sanitizedBody.refreshToken = '[REDACTED]';
    console.log('Request Body:', JSON.stringify(sanitizedBody));
  }
  
  // Capturar e logar a resposta
  const originalSend = res.send;
  res.send = function(body) {
    // Log da resposta para rotas de autenticação
    if (req.path.startsWith('/api/auth')) {
      let responseBody;
      try {
        responseBody = JSON.parse(body);
        // Remover dados sensíveis dos logs
        if (responseBody.token) responseBody.token = '[REDACTED]';
        if (responseBody.refreshToken) responseBody.refreshToken = '[REDACTED]';
        console.log(`Response (${res.statusCode}):`, JSON.stringify(responseBody));
      } catch (e) {
        console.log(`Response (${res.statusCode}): [Non-JSON response]`);
      }
    }
    
    originalSend.call(this, body);
    return this;
  };
  
  next();
});

// Inicializar Passport
app.use(passport.initialize());

// Conectar ao MongoDB com opções de conexão melhoradas
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000, // Timeout após 5 segundos
  socketTimeoutMS: 45000, // Tempo limite para operações de socket
  family: 4 // Forçar IPv4
})
.then(() => {
  console.log('Conectado ao MongoDB com sucesso');
  console.log('URI do MongoDB:', process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//[USERNAME]:[PASSWORD]@'));
})
.catch(err => {
  console.error('Erro ao conectar ao MongoDB:', err);
  console.error('Detalhes do erro de conexão:', {
    message: err.message,
    name: err.name,
    code: err.code,
    stack: err.stack
  });
  
  // Tentar novamente com opções diferentes se falhar
  console.log('Tentando conexão alternativa ao MongoDB...');
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('Conectado ao MongoDB com opções alternativas'))
  .catch(err => console.error('Falha na segunda tentativa de conexão ao MongoDB:', err));
});

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
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    mongodb: mongoose.connection.readyState === 1 ? 'conectado' : 'desconectado',
    environment: process.env.NODE_ENV || 'development'
  });
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

// Rota para testar a conexão com o MongoDB
app.get('/api/db-test', async (req, res) => {
  try {
    const status = mongoose.connection.readyState;
    let statusText;
    
    switch (status) {
      case 0: statusText = 'desconectado'; break;
      case 1: statusText = 'conectado'; break;
      case 2: statusText = 'conectando'; break;
      case 3: statusText = 'desconectando'; break;
      default: statusText = 'desconhecido';
    }
    
    // Testar operação real no banco
    let dbOperationSuccess = false;
    let dbOperationError = null;
    
    if (status === 1) {
      try {
        // Tentar uma operação simples no banco
        const result = await mongoose.connection.db.admin().ping();
        dbOperationSuccess = result.ok === 1;
      } catch (error) {
        dbOperationSuccess = false;
        dbOperationError = {
          message: error.message,
          name: error.name,
          code: error.code
        };
      }
    }
    
    res.json({
      status: statusText,
      readyState: status,
      dbOperationSuccess,
      dbOperationError,
      connectionOptions: mongoose.connection.config || 'Não disponível',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      status: 'erro',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  console.error('Detalhes do erro:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
    code: err.code
  });
  
  res.status(500).json({
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'production' ? 'Detalhes omitidos em produção' : err.message
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
  console.log(`Rota de teste CORS: http://localhost:${PORT}/api/cors-test`);
  console.log(`Rota de teste de banco de dados: http://localhost:${PORT}/api/db-test`);
  console.log(`Rota de teste de autenticação: http://localhost:${PORT}/api/auth/test`);
});
