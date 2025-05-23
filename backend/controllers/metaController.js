const getMetaLoginUrl = (req, res) => {
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI;

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=ads_management,pages_manage_ads`;
  res.json({ authUrl });
};

module.exports = { getMetaLoginUrl };
