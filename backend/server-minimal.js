// Versão minimalista do server.js usando apenas módulos nativos
// Não depende de pacotes externos como mongoose, express, etc.
const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

// Porta para o servidor
const PORT = process.env.PORT || 5000;

// Função para enviar resposta JSON
const sendJsonResponse = (res, statusCode, data) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

// Função para lidar com requisições CORS
const handleCors = (req, res) => {
  // Lista de origens permitidas
  const allowedOrigins = [
    'https://chefstudio.vercel.app',
    'https://chefstudio-production.up.railway.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ];
  
  const origin = req.headers.origin;
  
  // Verificar se a origem está na lista de permitidas
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Permitir qualquer origem em desenvolvimento
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  // Configurações adicionais de CORS
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Responder imediatamente a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }
  
  return false;
};

// Criar o servidor HTTP
const server = http.createServer((req, res) => {
  // Lidar com CORS
  if (handleCors(req, res)) {
    return;
  }
  
  // Parsear a URL
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // Rota de healthcheck
  if (pathname === '/api/health') {
    sendJsonResponse(res, 200, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
    return;
  }
  
  // Rota básica da API
  if (pathname === '/api') {
    sendJsonResponse(res, 200, {
      message: 'API ChefStudio está rodando',
      version: '1.0.0'
    });
    return;
  }
  
  // Rota de status de conexão Meta (simulada)
  if (pathname === '/api/meta/connection-status') {
    sendJsonResponse(res, 200, {
      connected: true,
      status: 'connected',
      adAccounts: []
    });
    return;
  }
  
  // Rota de métricas Meta (simulada)
  if (pathname.startsWith('/api/meta/metrics')) {
    sendJsonResponse(res, 200, {
      impressions: 1000,
      clicks: 50,
      ctr: 5.0,
      spend: 100.0,
      reach: 800,
      frequency: 1.25
    });
    return;
  }
  
  // Rota de campanhas Meta (simulada)
  if (pathname === '/api/meta/campaigns') {
    sendJsonResponse(res, 200, [
      {
        id: 'campaign123',
        name: 'Campanha Teste',
        status: 'ACTIVE',
        budget: 100.0,
        impressions: 1000,
        clicks: 50
      }
    ]);
    return;
  }
  
  // Rota para criar campanha (simulada)
  if (pathname === '/api/meta/create-ad-from-post' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        sendJsonResponse(res, 200, {
          success: true,
          campaign: {
            id: 'new_campaign_' + Date.now(),
            name: data.name || 'Nova Campanha',
            status: 'ACTIVE',
            budget: data.budget || 100.0
          }
        });
      } catch (error) {
        sendJsonResponse(res, 400, {
          success: false,
          message: 'Dados inválidos',
          error: error.message
        });
      }
    });
    
    return;
  }
  
  // Rota não encontrada
  sendJsonResponse(res, 404, {
    message: 'Rota não encontrada: ' + pathname
  });
});

// Iniciar o servidor
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promessa rejeitada não tratada:', reason);
});
