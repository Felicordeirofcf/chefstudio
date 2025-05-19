const { authMiddleware } = require('../middleware/auth');
const express = require('express');
const router = express.Router();

// Rota para obter campanhas de anúncios do usuário
router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log('Obtendo campanhas de anúncios do usuário:', req.user.userId);
    
    // Simulação de campanhas para teste
    const campaigns = [
      {
        id: '1',
        name: 'Campanha de Teste',
        status: 'ACTIVE',
        budget: 100.00,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date()
      }
    ];
    
    res.status(200).json({ campaigns });
  } catch (error) {
    console.error('Erro ao obter campanhas de anúncios:', error);
    res.status(500).json({ 
      message: 'Erro ao obter campanhas de anúncios',
      error: error.message
    });
  }
});

// Criar nova campanha de anúncios
router.post('/', authMiddleware, async (req, res) => {
  try {
    console.log('Criando nova campanha de anúncios');
    console.log('Dados recebidos:', JSON.stringify(req.body));
    
    // Validação de campos obrigatórios
    const { name, budget, startDate, endDate } = req.body;
    if (!name || !budget) {
      console.log('Erro de validação: campos obrigatórios ausentes');
      return res.status(400).json({ 
        message: 'Nome e orçamento são obrigatórios',
        details: {
          name: name ? 'válido' : 'ausente ou inválido',
          budget: budget ? 'válido' : 'ausente ou inválido'
        }
      });
    }
    
    // Simulação de criação para teste
    const campaign = {
      id: Date.now().toString(),
      name,
      status: 'ACTIVE',
      budget: parseFloat(budget),
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date()
    };
    
    res.status(201).json({ 
      message: 'Campanha criada com sucesso',
      campaign
    });
  } catch (error) {
    console.error('Erro ao criar campanha de anúncios:', error);
    res.status(500).json({ 
      message: 'Erro ao criar campanha de anúncios',
      error: error.message
    });
  }
});

// Obter detalhes de uma campanha específica
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Obtendo detalhes da campanha:', id);
    
    // Simulação de campanha para teste
    const campaign = {
      id,
      name: 'Campanha de Teste',
      status: 'ACTIVE',
      budget: 100.00,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      metrics: {
        impressions: 1000,
        clicks: 50,
        conversions: 5,
        ctr: 5.0,
        cpc: 2.0
      }
    };
    
    res.status(200).json({ campaign });
  } catch (error) {
    console.error('Erro ao obter detalhes da campanha:', error);
    res.status(500).json({ 
      message: 'Erro ao obter detalhes da campanha',
      error: error.message
    });
  }
});

// Rota de teste para verificar se a autenticação está funcionando
router.get('/test', (req, res) => {
  console.log('Rota de teste de anúncios acessada');
  res.status(200).json({ 
    message: 'Rota de teste de anúncios funcionando corretamente',
    timestamp: new Date()
  });
});

module.exports = router;
