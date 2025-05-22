// Middleware para configuração de CORS
const cors = require('cors');

// Lista de origens permitidas
const allowedOrigins = [
  'https://chefstudio.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
];

// Configuração do CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origem (como apps mobile ou curl)
    if (!origin) return callback(null, true);
    
    // Verificar se a origem está na lista de permitidas
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`Requisição CORS bloqueada de origem: ${origin}`);
      callback(new Error('Não permitido pela política de CORS'));
    }
  },
  credentials: true, // Permitir cookies em requisições cross-origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Exportar middleware configurado
module.exports = cors(corsOptions);
