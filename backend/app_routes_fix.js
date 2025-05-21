// Correção para o arquivo backend/index.js ou app.js (arquivo principal do Express)

// Adicione este código no arquivo principal do Express, onde as rotas são montadas
// Certifique-se de que este código esteja presente e não comentado

// Importar as rotas de autenticação
const authRoutes = require('./routes/auth');

// Montar as rotas de autenticação no caminho /api/auth
app.use('/api/auth', authRoutes);

// Não remova ou altere outras rotas existentes
