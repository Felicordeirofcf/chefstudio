const fetch = require("node-fetch");
const qs = require("querystring");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ----------- SIMULAÇÕES -----------

exports.connectMetaAccount = (req, res) => {
  res.json({ message: "Conexão simulada com Meta Ads." });
};

exports.getMetaConnectionStatus = (req, res) => {
  res.json({ connected: false, message: "Simulação de status de conexão com Meta Ads." });
};

exports.generateAdCaption = (req, res) => {
  const { productName } = req.body;
  if (!productName) return res.status(400).json({ message: "Nome do produto é obrigatório." });

  const caption = `Experimente agora o incrível ${productName}! #oferta #delivery`;
  res.json({ caption });
};

// ----------- LOGIN REAL COM FACEBOOK -----------

exports.loginWithFacebook = (req, res) => {
  const appId = process.env.FB_APP_ID;
  const redirectUri = process.env.REDIRECT_URI;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token JWT ausente ou malformado no cabeçalho" });
  }

  const scope = "ads_management,business_management,pages_show_list";

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&state=${token}`;

  return res.redirect(authUrl);
};

exports.facebookCallback = async (req, res) => {
  const { code, state } = req.query;
  const redirect_uri = process.env.REDIRECT_URI;

  if (!code || !state) {
    return res.status(400).json({ message: "Código ou token ausente no callback" });
  }

  try {
    const params = qs.stringify({
      client_id: process.env.FB_APP_ID,
      redirect_uri,
      client_secret: process.env.FB_APP_SECRET,
      code,
    });

    const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${params}`);
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return res.status(400).json({ message: "Erro ao obter token do Facebook", error: tokenData });
    }

    const meRes = await fetch(`https://graph.facebook.com/me?access_token=${tokenData.access_token}`);
    const meData = await meRes.json();

    // Usa o token recebido no state (JWT do usuário logado)
    const jwt = state;

    const jwtDecoded = require("jsonwebtoken").verify(jwt, process.env.JWT_SECRET);
    const userId = jwtDecoded.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

    user.metaAccessToken = tokenData.access_token;
    user.metaUserId = meData.id;
    user.metaConnectionStatus = "connected";
    await user.save();

    console.log("✅ Token Meta salvo para:", user.email);
    return res.redirect("https://chefastudio.vercel.app/dashboard");

  } catch (err) {
    console.error("❌ Erro no callback do Facebook:", err);
    return res.status(500).send("Erro ao conectar com o Facebook");
  }
};

// ----------- CONTAS DE ANÚNCIO -----------

exports.getAdAccounts = async (req, res) => {
  try {
    const token = req.user.metaAccessToken;
    if (!token) return res.status(400).json({ message: "Token Meta não encontrado. Conecte-se ao Facebook." });

    const response = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?access_token=${token}`);
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ message: "Erro ao obter contas de anúncio", error: data.error });
    }

    res.json({ adAccounts: data.data });
  } catch (err) {
    console.error("❌ Erro ao buscar contas:", err);
    res.status(500).json({ message: "Erro interno ao buscar contas" });
  }
};

// ----------- CAMPANHA -----------

exports.createMetaCampaign = async (req, res) => {
  const { adAccountId, name, objective = "LINK_CLICKS", status = "PAUSED" } = req.body;

  if (!adAccountId || !name) {
    return res.status(400).json({ message: "adAccountId e name são obrigatórios." });
  }

  try {
    const token = req.user.metaAccessToken;
    if (!token) return res.status(400).json({ message: "Token Meta não encontrado." });

    const response = await fetch(`https://graph.facebook.com/v19.0/act_${adAccountId}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, objective, status, access_token: token })
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ message: "Erro ao criar campanha", error: data.error });

    res.status(201).json({ message: "Campanha criada com sucesso!", campaign: data });
  } catch (err) {
    console.error("❌ Erro ao criar campanha:", err);
    res.status(500).json({ message: "Erro interno ao criar campanha" });
  }
};

// ----------- AD SET -----------

exports.createAdSet = async (req, res) => {
  const {
    adAccountId, campaignId, name, daily_budget,
    start_time, end_time, optimization_goal = "LINK_CLICKS",
    billing_event = "IMPRESSIONS", geo_locations
  } = req.body;

  if (!adAccountId || !campaignId || !name || !daily_budget || !start_time || !end_time) {
    return res.status(400).json({ message: "Campos obrigatórios ausentes para o Ad Set." });
  }

  try {
    const token = req.user.metaAccessToken;
    if (!token) return res.status(400).json({ message: "Token Meta não encontrado." });

    const payload = {
      name,
      campaign_id: campaignId,
      daily_budget,
      billing_event,
      optimization_goal,
      start_time,
      end_time,
      targeting: {
        geo_locations: geo_locations || { countries: ["BR"] },
        age_min: 18,
        age_max: 65
      },
      status: "PAUSED",
      access_token: token
    };

    const response = await fetch(`https://graph.facebook.com/v19.0/act_${adAccountId}/adsets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ message: "Erro ao criar Ad Set", error: data.error });

    res.status(201).json({ message: "Ad Set criado com sucesso!", adset: data });
  } catch (err) {
    console.error("❌ Erro ao criar Ad Set:", err);
    res.status(500).json({ message: "Erro interno ao criar Ad Set" });
  }
};

// ----------- AD CREATIVE + ANÚNCIO -----------

exports.createAdCreative = async (req, res) => {
  const { adAccountId, adSetId, name, pageId, message, link, image_url } = req.body;

  if (!adAccountId || !adSetId || !name || !pageId || !message || !link || !image_url) {
    return res.status(400).json({ message: "Todos os campos são obrigatórios para criar o anúncio." });
  }

  try {
    const token = req.user.metaAccessToken;
    if (!token) return res.status(400).json({ message: "Token Meta não encontrado." });

    const creativeRes = await fetch(`https://graph.facebook.com/v19.0/act_${adAccountId}/adcreatives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        object_story_spec: {
          page_id: pageId,
          link_data: {
            message,
            link,
            image_url,
            call_to_action: {
              type: "LEARN_MORE",
              value: { link }
            }
          }
        },
        access_token: token
      })
    });

    const creativeData = await creativeRes.json();
    if (creativeData.error) return res.status(400).json({ message: "Erro ao criar Ad Creative", error: creativeData.error });

    const adRes = await fetch(`https://graph.facebook.com/v19.0/act_${adAccountId}/ads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        adset_id: adSetId,
        creative: { creative_id: creativeData.id },
        status: "PAUSED",
        access_token: token
      })
    });

    const adData = await adRes.json();
    if (adData.error) return res.status(400).json({ message: "Erro ao criar anúncio", error: adData.error });

    res.status(201).json({ message: "Anúncio criado com sucesso!", ad: adData });
  } catch (err) {
    console.error("❌ Erro ao criar anúncio:", err);
    res.status(500).json({ message: "Erro interno ao criar anúncio" });
  }
};
