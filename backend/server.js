// Versão completa do server.js com todas as rotas e Swagger
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('./middleware/corsMiddleware');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Importar todas as rotas necessárias
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/user');
const metaRoutes = require('./routes/metaRoutes');
const menuRoutes = require('./routes/menu');
const healthRoutes = require('./routes/healthRoutes');
const profileRoutes = require("./routes/profile");
const metaAdsRoutes = require("./routes/metaAdsRoutes"); // Rota adicionada para Meta Ads

// Configurar variáveis de ambiente
dotenv.config();

// Configuração do Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ChefStudio API',
      version: '1.0.0',
      description: 'API para o ChefStudio - Plataforma de Marketing Digital',
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
  apis: ['./routes/*.js'], // Caminho para os arquivos com anotações JSDoc
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Inicializar Express
const app = express();

// Middleware para parsing de JSON e URL encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Aplicar middleware CORS personalizado
app.use(cors);

// Configurar Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rotas de API - incluindo todas as necessárias
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/health', healthRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/meta-ads", metaAdsRoutes); // Montando as rotas de Meta Ads

// Rota básica para verificar se o servidor está funcionando
app.get('/api', (req, res) => {
  res.json({ message: 'API ChefStudio está rodando' });
});

// Servir arquivos estáticos em produção
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/build', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('API está rodando...');
  });
}

// Middleware para tratamento de erros
app.use(notFound);
app.use(errorHandler);

// Conectar ao MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test')
  .then(() => {
    console.log('Conectado ao MongoDB (database: test)');
  })
  .catch((error) => {
    console.error('Erro ao conectar ao MongoDB:', error.message);
  });

// Definir porta
const PORT = process.env.PORT || 5000;

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;
