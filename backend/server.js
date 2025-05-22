// Atualização do server.js para incluir as novas rotas
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const dotenv = require('dotenv');
const path = require('path');

// Carregar variáveis de ambiente
dotenv.config();

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 5000;

// Configuração do CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['https://chefstudio.vercel.app', 'http://localhost:5173', 'http://localhost:3000', '*'];

app.use(cors({
  origin: function(origin, callback) {
    // Permitir requisições sem origin (como apps mobile ou curl)
    if (!origin) return callback(null, true);
    
    // Verificar se a origem está na lista de permitidos
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Middleware para JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos da pasta uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuração do Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ChefStudio API',
      version: '1.0.0',
      description: 'API para o ChefStudio - Plataforma de Marketing Digital para Restaurantes',
    },
    servers: [
      {
        url: process.env.BASE_URL || 'https://chefstudio-production.up.railway.app',
        description: 'Servidor de Produção',
      },
      {
        url: 'http://localhost:5000',
        description: 'Servidor de Desenvolvimento',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chefstudio')
  .then(() => console.log('Conectado ao MongoDB'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Rotas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/meta', require('./routes/meta'));
app.use('/api/meta-ads', require('./routes/meta-ads'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/notifications', require('./routes/notifications'));

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'API do ChefStudio funcionando!' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;
