// Versão simplificada do server.js que funciona apenas com as rotas essenciais
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('./middleware/corsMiddleware');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Importar apenas as rotas que são essenciais para a integração Meta
// Comentando as rotas que não foram incluídas no pacote
// const authRoutes = require('./routes/authRoutes');
// const userRoutes = require('./routes/userRoutes');
const metaRoutes = require('./routes/metaRoutes');
// const menuRoutes = require('./routes/menuRoutes');
const healthRoutes = require('./routes/healthRoutes');

// Configurar variáveis de ambiente
dotenv.config();

// Inicializar Express
const app = express();

// Middleware para parsing de JSON e URL encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Aplicar middleware CORS personalizado
app.use(cors);

// Rotas de API - apenas as essenciais
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
app.use('/api/meta', metaRoutes);
// app.use('/api/menu', menuRoutes);
app.use('/api/health', healthRoutes);

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
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Conectado ao MongoDB');
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
