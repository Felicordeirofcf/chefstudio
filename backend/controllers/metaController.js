const fetch = require('node-fetch');
const qs = require('querystring');
const User = require('../models/User');

// ----------- SIMULAÇÕES -----------

exports.connectMetaAccount = (req, res) => {
  res.json({ message: "Conexão simulada com Meta Ads." });
};

exports.getMetaConnectionStatus = (req, res) => {
  res.json({ connected: false, message: "Simulação de status de conexão com Meta Ads." });
};

exports.generateAdCaption = (req, res) => {
  const { productName } = req.body;
  const caption = `Experimente agora o incrível ${productName}! #oferta #delivery`;
  res.json({ caption });
};

// ----------- LOGIN COM FACEBOOK (REAL) -----------

exports.loginWithFacebook = (req, res) => {
  const redirect_uri = process.env.REDIRECT_URI;
  const appId = process.env.FB_APP_ID;
  const scope = 'ads_management,business_management,pages_show_list';

  const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirect_uri}&scope=${scope}`;
  res.redirect(url);
};

exports.facebookCallback = async (req, res) => {
  const { code } = req.query;
  const redirect_uri = process.env.REDIRECT_URI;

  try {
    const params = qs.stringify({
      client_id: process.env.FB_APP_ID,
      redirect_uri,
      client_secret: process.env.FB_APP_SECRET,
      code,
    });

    const response = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${params}`);
    const data = await response.json();

    if (!data.access_token) {
      console.error("❌ Falha ao obter access_token:", data);
      return res.status(400).json({ message: "Erro ao obter token do Facebook", error: data });
    }

    const accessToken = data.access_token;

    const meRes = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}`);
    const meData = await meRes.json();

    if (!req.user) {
      return res.status(401).json({ message: 'Usuário não autenticado (JWT ausente)' });
    }

    req.user.metaAccessToken = accessToken;
    req.user.metaUserId = meData.id;
    req.user.metaConnectionStatus = 'connected';
    await req.user.save();

    console.log("✅ Token salvo no MongoDB para:", req.user.email);
    res.redirect("https://chefastudio.vercel.app/dashboard");
  } catch (err) {
    console.error("❌ Erro ao autenticar com Facebook:", err);
    res.status(500).send("Erro no login com Facebook");
  }
};

// ----------- CONTAS DE ANÚNCIO -----------

exports.getAdAccounts = async (req, res) => {
  try {
    const token = req.user.metaAccessToken;
    if (!token) return res.status(400).json({ message: 'Conta Meta Ads ainda não conectada.' });

    const response = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?access_token=${token}`);
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ message: 'Erro ao obter contas de anúncio', error: data.error });
    }

    res.json({ adAccounts: data.data });
  } catch (err) {
    console.error("❌ Erro ao buscar contas de anúncio:", err);
    res.status(500).json({ message: 'Erro interno ao buscar contas' });
  }
};

// ----------- CAMPANHA -----------

exports.createMetaCampaign = async (req, res) => {
  const { adAccountId, name, objective = "LINK_CLICKS", status = "PAUSED" } = req.body;

  try {
    const token = req.user.metaAccessToken;
    if (!token) return res.status(400).json({ message: 'Token Meta não encontrado. Faça login com Facebook.' });

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

// ----------- CONJUNTO (AD SET) -----------

exports.createAdSet = async (req, res) => {
  const {
    adAccountId,
    campaignId,
    name,
    daily_budget,
    optimization_goal = "LINK_CLICKS",
    billing_event = "IMPRESSIONS",
    start_time,
    end_time,
    geo_locations
  } = req.body;

  try {
    const token = req.user.metaAccessToken;
    if (!token) return res.status(400).json({ message: 'Token Meta não encontrado. Faça login com Facebook.' });

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

// ----------- CRIAR AD CREATIVE + AD (Anúncio real) -----------

exports.createAdCreative = async (req, res) => {
  const {
    adAccountId,
    adSetId,
    name,
    pageId,
    message,
    link,
    image_url
  } = req.body;

  try {
    const token = req.user.metaAccessToken;
    if (!token) return res.status(400).json({ message: 'Token Meta não encontrado.' });

    // 1. Criar o ad creative
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
    if (creativeData.error) return res.status(400).json({ message: "Erro ao criar ad creative", error: creativeData.error });

    const creativeId = creativeData.id;

    // 2. Criar o anúncio (ad)
    const adRes = await fetch(`https://graph.facebook.com/v19.0/act_${adAccountId}/ads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        adset_id: adSetId,
        creative: { creative_id: creativeId },
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
