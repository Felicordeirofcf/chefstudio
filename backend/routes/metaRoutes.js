const express = require('express');
const router = express.Router();
const { getMetaLoginUrl } = require("../controllers/metaController");

router.get("/meta/login", getMetaLoginUrl);

// Outras rotas...

module.exports = router;
