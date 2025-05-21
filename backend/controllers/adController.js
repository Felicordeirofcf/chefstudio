// Implementação atualizada do controlador de anúncios para usar credenciais salvas
// Arquivo: backend/controllers/adController.js

const User = require("../models/user");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

// Obter todas as campanhas do usuário
exports.getAllCampaigns = async (req, res) => {
  try {
    // Buscar o usuário no banco de dados para obter o token de acesso
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Verificar se o usuário está conectado ao Meta
    if (!user.metaAccessToken || user.metaConnectionStatus !== "connected") {
      return res.status(400).json({ message: "Usuário não está conectado ao Meta Ads" });
    }

    // Obter o ID da conta de anúncios (do query param ou do usuário)
    const adAccountId = req.query.adAccountId || user.adsAccountId;
    if (!adAccountId) {
      return res.status(400).json({ message: "ID da conta de anúncios não encontrado" });
    }

    // Fazer requisição para a API do Facebook
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/act_${adAccountId}/campaigns`,
      {
        params: {
          access_token: user.metaAccessToken,
          fields: "id,name,objective,status,created_time,updated_time,daily_budget,lifetime_budget"
        }
      }
    );

    // Verificar se há erro na resposta
    if (response.data.error) {
      return res.status(400).json({ 
        message: "Erro ao buscar campanhas", 
        error: response.data.error 
      });
    }

    res.status(200).json(response.data.data);
  } catch (err) {
    console.error("❌ Erro ao listar campanhas:", err);
    res.status(500).json({ 
      message: "Erro interno ao listar campanhas",
      error: err.message,
      details: err.response?.data
    });
  }
};

// Criar nova campanha
exports.createCampaign = async (req, res) => {
  try {
    // Buscar o usuário no banco de dados para obter o token de acesso
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Verificar se o usuário está conectado ao Meta
    if (!user.metaAccessToken || user.metaConnectionStatus !== "connected") {
      return res.status(400).json({ message: "Usuário não está conectado ao Meta Ads" });
    }

    // Obter o ID da conta de anúncios (do body ou do usuário)
    const adAccountId = req.body.adAccountId || user.adsAccountId;
    if (!adAccountId) {
      return res.status(400).json({ message: "ID da conta de anúncios não encontrado" });
    }

    // Extrair dados da campanha do corpo da requisição
    const { 
      name, 
      objective = "LINK_CLICKS", 
      status = "PAUSED",
      budget,
      adText,
      radius,
      targetLocation
    } = req.body;

    // Validar dados obrigatórios
    if (!name) {
      return res.status(400).json({ message: "Nome da campanha é obrigatório" });
    }

    // Preparar dados para envio à API do Facebook
    const campaignData = {
      name,
      objective,
      status,
      special_ad_categories: '[]',
      access_token: user.metaAccessToken
    };

    // Adicionar orçamento se fornecido
    if (budget) {
      if (budget.type === 'daily') {
        campaignData.daily_budget = Math.round(parseFloat(budget.amount) * 100); // Converter para centavos
      } else if (budget.type === 'lifetime') {
        campaignData.lifetime_budget = Math.round(parseFloat(budget.amount) * 100); // Converter para centavos
      }
    }

    // Criar campanha
    const campaignResponse = await axios.post(
      `https://graph.facebook.com/v19.0/act_${adAccountId}/campaigns`,
      campaignData
    );

    // Verificar se há erro na resposta
    if (campaignResponse.data.error) {
      return res.status(400).json({ 
        message: "Erro ao criar campanha", 
        error: campaignResponse.data.error 
      });
    }

    const campaignId = campaignResponse.data.id;

    // Criar conjunto de anúncios (Ad Set) se tiver informações de localização
    if (targetLocation && targetLocation.latitude && targetLocation.longitude && radius) {
      // Preparar dados do conjunto de anúncios
      const adSetData = {
        name: `${name} - Ad Set`,
        campaign_id: campaignId,
        optimization_goal: "LINK_CLICKS",
        billing_event: "IMPRESSIONS",
        bid_amount: 500, // 5 USD em centavos
        targeting: {
          geo_locations: {
            custom_locations: [
              {
                latitude: targetLocation.latitude,
                longitude: targetLocation.longitude,
                radius: parseInt(radius),
                distance_unit: "kilometer"
              }
            ]
          }
        },
        status: "PAUSED",
        access_token: user.metaAccessToken
      };

      // Adicionar orçamento ao conjunto de anúncios
      if (budget) {
        if (budget.type === 'daily') {
          adSetData.daily_budget = Math.round(parseFloat(budget.amount) * 100);
        } else if (budget.type === 'lifetime') {
          adSetData.lifetime_budget = Math.round(parseFloat(budget.amount) * 100);
        }
      }

      // Criar conjunto de anúncios
      const adSetResponse = await axios.post(
        `https://graph.facebook.com/v19.0/act_${adAccountId}/adsets`,
        adSetData
      );

      // Verificar se há erro na resposta
      if (adSetResponse.data.error) {
        return res.status(400).json({ 
          message: "Erro ao criar conjunto de anúncios", 
          error: adSetResponse.data.error 
        });
      }

      const adSetId = adSetResponse.data.id;

      // Criar anúncio se tiver texto
      if (adText) {
        // Preparar dados do anúncio
        const adData = {
          name: `${name} - Ad`,
          adset_id: adSetId,
          creative: {
            title: name,
            body: adText,
            link_url: req.body.linkUrl || user.menuLink || "https://chefstudio.vercel.app"
          },
          status: "PAUSED",
          access_token: user.metaAccessToken
        };

        // Criar anúncio
        const adResponse = await axios.post(
          `https://graph.facebook.com/v19.0/act_${adAccountId}/ads`,
          adData
        );

        // Verificar se há erro na resposta
        if (adResponse.data.error) {
          return res.status(400).json({ 
            message: "Erro ao criar anúncio", 
            error: adResponse.data.error 
          });
        }

        // Retornar dados completos
        res.status(201).json({
          message: "Campanha criada com sucesso!",
          campaign: {
            id: campaignId,
            name,
            objective,
            status
          },
          adSet: {
            id: adSetId,
            name: `${name} - Ad Set`
          },
          ad: {
            id: adResponse.data.id,
            name: `${name} - Ad`
          }
        });
      } else {
        // Retornar dados sem anúncio
        res.status(201).json({
          message: "Campanha e conjunto de anúncios criados com sucesso!",
          campaign: {
            id: campaignId,
            name,
            objective,
            status
          },
          adSet: {
            id: adSetId,
            name: `${name} - Ad Set`
          }
        });
      }
    } else {
      // Retornar apenas dados da campanha
      res.status(201).json({
        message: "Campanha criada com sucesso!",
        campaign: {
          id: campaignId,
          name,
          objective,
          status
        }
      });
    }
  } catch (err) {
    console.error("❌ Erro ao criar campanha:", err);
    res.status(500).json({ 
      message: "Erro interno ao criar campanha",
      error: err.message,
      details: err.response?.data
    });
  }
};

// Obter campanha por ID
exports.getCampaignById = async (req, res) => {
  try {
    // Buscar o usuário no banco de dados para obter o token de acesso
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Verificar se o usuário está conectado ao Meta
    if (!user.metaAccessToken || user.metaConnectionStatus !== "connected") {
      return res.status(400).json({ message: "Usuário não está conectado ao Meta Ads" });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "ID da campanha é obrigatório" });
    }

    // Fazer requisição para a API do Facebook
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/${id}`,
      {
        params: {
          access_token: user.metaAccessToken,
          fields: "id,name,objective,status,created_time,updated_time,daily_budget,lifetime_budget"
        }
      }
    );

    // Verificar se há erro na resposta
    if (response.data.error) {
      return res.status(400).json({ 
        message: "Erro ao buscar campanha", 
        error: response.data.error 
      });
    }

    res.status(200).json(response.data);
  } catch (err) {
    console.error("❌ Erro ao buscar campanha:", err);
    res.status(500).json({ 
      message: "Erro interno ao buscar campanha",
      error: err.message,
      details: err.response?.data
    });
  }
};

// Atualizar status da campanha
exports.updateCampaignStatus = async (req, res) => {
  try {
    // Buscar o usuário no banco de dados para obter o token de acesso
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Verificar se o usuário está conectado ao Meta
    if (!user.metaAccessToken || user.metaConnectionStatus !== "connected") {
      return res.status(400).json({ message: "Usuário não está conectado ao Meta Ads" });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      return res.status(400).json({ message: "ID da campanha e status são obrigatórios" });
    }

    // Validar status
    const validStatus = ["ACTIVE", "PAUSED", "DELETED", "ARCHIVED"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ 
        message: "Status inválido", 
        validStatus 
      });
    }

    // Fazer requisição para a API do Facebook
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${id}`,
      {
        status,
        access_token: user.metaAccessToken
      }
    );

    // Verificar se há erro na resposta
    if (response.data.error) {
      return res.status(400).json({ 
        message: "Erro ao atualizar status", 
        error: response.data.error 
      });
    }

    res.status(200).json({ 
      message: `Status atualizado para ${status}`, 
      result: response.data 
    });
  } catch (err) {
    console.error("❌ Erro ao atualizar status:", err);
    res.status(500).json({ 
      message: "Erro interno ao atualizar status",
      error: err.message,
      details: err.response?.data
    });
  }
};

// Obter métricas da campanha
exports.getCampaignMetrics = async (req, res) => {
  try {
    // Buscar o usuário no banco de dados para obter o token de acesso
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Verificar se o usuário está conectado ao Meta
    if (!user.metaAccessToken || user.metaConnectionStatus !== "connected") {
      return res.status(400).json({ message: "Usuário não está conectado ao Meta Ads" });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "ID da campanha é obrigatório" });
    }

    // Fazer requisição para a API do Facebook
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/${id}/insights`,
      {
        params: {
          access_token: user.metaAccessToken,
          fields: "impressions,clicks,spend,ctr,reach,frequency,cost_per_inline_link_click",
          date_preset: "last_30_days"
        }
      }
    );

    // Verificar se há erro na resposta
    if (response.data.error) {
      return res.status(400).json({ 
        message: "Erro ao obter métricas", 
        error: response.data.error 
      });
    }

    res.status(200).json(response.data.data);
  } catch (err) {
    console.error("❌ Erro ao obter métricas:", err);
    res.status(500).json({ 
      message: "Erro interno ao obter métricas",
      error: err.message,
      details: err.response?.data
    });
  }
};

// Upload de mídia para campanha
exports.uploadCampaignMedia = async (req, res) => {
  try {
    // Verificar se há arquivo na requisição
    if (!req.file) {
      return res.status(400).json({ message: "Nenhum arquivo enviado" });
    }

    // Buscar o usuário no banco de dados para obter o token de acesso
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Verificar se o usuário está conectado ao Meta
    if (!user.metaAccessToken || user.metaConnectionStatus !== "connected") {
      return res.status(400).json({ message: "Usuário não está conectado ao Meta Ads" });
    }

    // Obter o ID da conta de anúncios
    const adAccountId = req.body.adAccountId || user.adsAccountId;
    if (!adAccountId) {
      return res.status(400).json({ message: "ID da conta de anúncios não encontrado" });
    }

    // Obter o ID da campanha
    const { campaignId } = req.body;
    if (!campaignId) {
      return res.status(400).json({ message: "ID da campanha é obrigatório" });
    }

    // Preparar FormData para upload
    const formData = new FormData();
    formData.append("access_token", user.metaAccessToken);
    formData.append("file", fs.createReadStream(req.file.path));

    // Fazer upload da imagem para a API do Facebook
    const uploadResponse = await axios.post(
      `https://graph.facebook.com/v19.0/act_${adAccountId}/adimages`,
      formData,
      {
        headers: {
          ...formData.getHeaders()
        }
      }
    );

    // Verificar se há erro na resposta
    if (uploadResponse.data.error) {
      return res.status(400).json({ 
        message: "Erro ao fazer upload da imagem", 
        error: uploadResponse.data.error 
      });
    }

    // Obter hash da imagem
    const imageHashes = uploadResponse.data.images;
    const imageHash = Object.keys(imageHashes)[0];
    
    if (!imageHash) {
      return res.status(400).json({ message: "Erro ao obter hash da imagem" });
    }

    // Retornar dados da imagem
    res.status(200).json({
      message: "Upload de imagem realizado com sucesso",
      image: {
        hash: imageHash,
        url: imageHashes[imageHash].url,
        width: imageHashes[imageHash].width,
        height: imageHashes[imageHash].height
      },
      campaignId
    });

    // Limpar arquivo temporário
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Erro ao remover arquivo temporário:", err);
    });
  } catch (err) {
    console.error("❌ Erro ao fazer upload de mídia:", err);
    res.status(500).json({ 
      message: "Erro interno ao fazer upload de mídia",
      error: err.message,
      details: err.response?.data
    });

    // Limpar arquivo temporário em caso de erro
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Erro ao remover arquivo temporário:", err);
      });
    }
  }
};

// Salvar configurações de localização
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
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: "Usuário não autenticado." });
    }

    const user = await User.findById(req.user.userId);
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

// Obter configurações de localização
exports.getLocationSettings = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: "Usuário não autenticado." });
    }

    const user = await User.findById(req.user.userId);
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
