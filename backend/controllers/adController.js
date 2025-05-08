// controllers/adController.js

// ----------- CAMPANHAS -----------

exports.getAllCampaigns = (req, res) => {
  res.json([
    { id: 1, name: "Campanha Hamburguer", status: "active" },
    { id: 2, name: "Campanha Pizza", status: "paused" }
  ]);
};

exports.createCampaign = (req, res) => {
  const { name, objective } = req.body;

  if (!name || !objective) {
    return res.status(400).json({ message: "Nome e objetivo são obrigatórios." });
  }

  res.status(201).json({
    message: "Campanha criada com sucesso (simulada)",
    data: {
      id: Math.floor(Math.random() * 1000),
      name,
      objective,
      status: "draft"
    }
  });
};

exports.getCampaignById = (req, res) => {
  const { id } = req.params;
  res.json({
    id,
    name: "Campanha Exemplo",
    status: "active"
  });
};

exports.updateCampaignStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: "Status é obrigatório." });
  }

  res.json({
    message: `Status da campanha ${id} atualizado para '${status}' (simulado)`,
    updated: { id, status }
  });
};

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

// ----------- LOCALIZAÇÃO -----------

exports.saveLocationSettings = (req, res) => {
  const { latitude, longitude, radius } = req.body;

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    typeof radius !== "number"
  ) {
    return res.status(400).json({ message: "Latitude, longitude e raio devem ser números." });
  }

  res.status(201).json({
    message: "Localização salva com sucesso (simulada)",
    data: { latitude, longitude, radius }
  });
};

exports.getLocationSettings = (req, res) => {
  res.json({
    latitude: -23.5505,
    longitude: -46.6333,
    radius: 5
  });
};
