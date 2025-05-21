// Código para adicionar ao arquivo principal do Express (app.js ou index.js)
// Certifique-se de que este código esteja presente e não comentado

// Importar as rotas de menu
const menuRoutes = require('./routes/menu');

// Montar as rotas de menu no caminho /api/menu
app.use('/api/menu', menuRoutes);

// Não remova ou altere outras rotas existentes
