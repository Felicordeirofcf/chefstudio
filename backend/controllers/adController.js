// controllers/adController.js

// Simulação: lista todas as campanhas do usuário
exports.getAllCampaigns = (req, res) => {
    res.json([
      { id: 1, name: "Campanha Hamburguer", status: "active" },
      { id: 2, name: "Campanha Pizza", status: "paused" }
    ]);
  };
  
  // Simulação: cria uma nova campanha
  exports.createCampaign = (req, res) => {
    const { name, objective } = req.body;
    res.status(201).json({
      message: "Campanha criada com sucesso (simulada)",
      data: { id: 3, name, objective, status: "draft" }
    });
  };
  
  // Simulação: retorna uma campanha por ID
  exports.getCampaignById = (req, res) => {
    const { id } = req.params;
    res.json({ id, name: "Campanha Exemplo", status: "active" });
  };
  
  // Simulação: atualiza o status de uma campanha
  exports.updateCampaignStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    res.json({
      message: `Status da campanha ${id} atualizado para ${status} (simulado)`
    });
  };
  
  // Simulação: retorna métricas de uma campanha
  exports.getCampaignMetrics = (req, res) => {
    const { id } = req.params;
    res.json({
      id,
      clicks: 120,
      impressions: 1500,
      ctr: "8%",
      spent: "R$ 45,00"
    });
  };
  
  // Simulação: salva configurações de localização
  exports.saveLocationSettings = (req, res) => {
    const { latitude, longitude, radius } = req.body;
    res.status(201).json({
      message: "Localização salva (simulada)",
      data: { latitude, longitude, radius }
    });
  };
  
  // Simulação: retorna configurações de localização
  exports.getLocationSettings = (req, res) => {
    res.json({
      latitude: -23.5505,
      longitude: -46.6333,
      radius: 5
    });
  };
  