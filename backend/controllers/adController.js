const fetch = require("node-fetch");
const User = require("../models/User");

// ----------- CAMPANHAS REAL META ADS -----------

exports.getAllCampaigns = async (req, res) => {
  try {
    const token = req.user.metaAccessToken;
    const adAccountId = req.query.adAccountId; // passado como query param

    if (!token || !adAccountId) {
      return res.status(400).json({ message: "Token ou adAccountId ausente." });
    }

    const response = await fetch(`https://graph.facebook.com/v19.0/act_${adAccountId}/campaigns?access_token=${token}`);
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ message: "Erro ao buscar campanhas", error: data.error });
    }

    res.status(200).json(data.data);
  } catch (err) {
    console.error("❌ Erro ao listar campanhas:", err);
    res.status(500).json({ message: "Erro interno ao listar campanhas" });
  }
};

exports.createCampaign = async (req, res) => {
  const { adAccountId, name, objective = "LINK_CLICKS", status = "PAUSED" } = req.body;

  try {
    const token = req.user.metaAccessToken;
    if (!token || !adAccountId || !name) {
      return res.status(400).json({ message: "Token, adAccountId e nome são obrigatórios." });
    }

    const response = await fetch(`https://graph.facebook.com/v19.0/act_${adAccountId}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        objective,
        status,
        access_token: token
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ message: "Erro ao criar campanha", error: data.error });
    }

    res.status(201).json({ message: "Campanha criada com sucesso!", campaign: data });
  } catch (err) {
    console.error("❌ Erro ao criar campanha:", err);
    res.status(500).json({ message: "Erro interno ao criar campanha" });
  }
};

exports.getCampaignById = async (req, res) => {
  const { id } = req.params;

  try {
    const token = req.user.metaAccessToken;
    if (!token) return res.status(400).json({ message: "Token não encontrado." });

    const response = await fetch(`https://graph.facebook.com/v19.0/${id}?access_token=${token}`);
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ message: "Erro ao buscar campanha", error: data.error });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("❌ Erro ao buscar campanha:", err);
    res.status(500).json({ message: "Erro interno ao buscar campanha" });
  }
};

exports.updateCampaignStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const token = req.user.metaAccessToken;
    if (!token || !status) {
      return res.status(400).json({ message: "Token e status são obrigatórios." });
    }

    const response = await fetch(`https://graph.facebook.com/v19.0/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        access_token: token
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ message: "Erro ao atualizar status", error: data.error });
    }

    res.status(200).json({ message: `Status atualizado para ${status}`, result: data });
  } catch (err) {
    console.error("❌ Erro ao atualizar status:", err);
    res.status(500).json({ message: "Erro interno ao atualizar status" });
  }
};

exports.getCampaignMetrics = async (req, res) => {
  const { id } = req.params;

  try {
    const token = req.user.metaAccessToken;
    if (!token) return res.status(400).json({ message: "Token não encontrado." });

    const response = await fetch(`https://graph.facebook.com/v19.0/${id}/insights?access_token=${token}`);
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ message: "Erro ao obter métricas", error: data.error });
    }

    res.status(200).json(data.data);
  } catch (err) {
    console.error("❌ Erro ao obter métricas:", err);
    res.status(500).json({ message: "Erro interno ao obter métricas" });
  }
};

// ----------- LOCALIZAÇÃO REAL -----------

exports.saveLocationSettings = async (req, res) => {
  const { latitude, longitude, radius } = req.body;

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    typeof radius !== "number"
  ) {
    return res.status(400).json({ message: "Latitude, longitude e raio devem ser números." });
  }

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Usuário não autenticado." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    // Salvar configurações de localização no perfil do usuário
    user.locationSettings = {
      latitude,
      longitude,
      radius
    };
    
    await user.save();

    res.status(201).json({
      message: "Localização salva com sucesso",
      data: user.locationSettings
    });
  } catch (err) {
    console.error("❌ Erro ao salvar configurações de localização:", err.message);
    res.status(500).json({ message: "Erro ao salvar configurações de localização" });
  }
};

exports.getLocationSettings = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Usuário não autenticado." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    // Se o usuário não tiver configurações de localização, retornar valores padrão
    const locationSettings = user.locationSettings || {
      latitude: -23.5505,  // São Paulo como padrão
      longitude: -46.6333,
      radius: 5
    };

    res.json(locationSettings);
  } catch (err) {
    console.error("❌ Erro ao obter configurações de localização:", err.message);
    res.status(500).json({ message: "Erro ao obter configurações de localização" });
  }
};
