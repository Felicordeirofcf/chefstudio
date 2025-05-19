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

// Configuração CORS apenas para origem permitida (Vercel)
const allowedOrigins = ['https://chefstudio.vercel.app'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Middleware extra para headers CORS (com base em origem permitida)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Middleware para logging de requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  if (req.path.startsWith('/api/auth') && req.method !== 'GET') {
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
    if (sanitizedBody.refreshToken) sanitizedBody.refreshToken = '[REDACTED]';
    console.log('Request Body:', JSON.stringify(sanitizedBody));
  }

  const originalSend = res.send;
  res.send = function (body) {
    if (req.path.startsWith('/api/auth')) {
      let responseBody;
      try {
        responseBody = JSON.parse(body);
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

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
})
.then(() => {
  console.log('Conectado ao MongoDB com sucesso');
  console.log('URI do MongoDB:', process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//[USERNAME]:[PASSWORD]@'));
})
.catch(err => {
  console.error('Erro ao conectar ao MongoDB:', err);
  console.error('Detalhes:', {
    message: err.message,
    name: err.name,
    code: err.code,
    stack: err.stack
  });

  console.log('Tentando conexão alternativa ao MongoDB...');
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('Conectado ao MongoDB com opções alternativas'))
  .catch(err => console.error('Falha na segunda tentativa:', err));
});

// Swagger
const swaggerFile = path.resolve(__dirname, 'swagger.json');
let swaggerDocument = null;

if (fs.existsSync(swaggerFile)) {
  swaggerDocument = require(swaggerFile);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

// Rota raiz
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

// Rotas principais
app.use('/api/auth', authRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Rota de saúde
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    mongodb: mongoose.connection.readyState === 1 ? 'conectado' : 'desconectado',
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
        const result = await mongoose.connection.db.admin().ping();
        dbOperationSuccess = result.ok === 1;
      } catch (error) {
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

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'production' ? 'Detalhes omitidos em produção' : err.message
  });
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
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Documentação Swagger disponível em: http://localhost:${PORT}/api-docs`);
});
