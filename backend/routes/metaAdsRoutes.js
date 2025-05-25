const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/authMiddleware');
const { createFromImage, createFromPost, getCampaigns, getMetrics, criarCampanha } = require('../controllers/metaAdsController');
const { publicarPostCriarAnuncio } = require('../controllers/metaPostController');

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limite de 10MB
  fileFilter: function (req, file, cb) {
    // Aceitar apenas imagens
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
    }
    cb(null, true);
  }
});

// Rota para criar anúncio a partir de imagem
router.post('/create-from-image', authenticateToken, upload.single('image'), createFromImage);

// Rota para criar anúncio a partir de publicação existente
router.post('/create-from-post', authenticateToken, createFromPost);

// Rota para publicar post e criar anúncio automaticamente
router.post('/publicar-post-criar-anuncio', authenticateToken, upload.single('image'), publicarPostCriarAnuncio);

// Rota para criar campanha
router.post('/campanhas', authenticateToken, criarCampanha);

// Rota para buscar campanhas
router.get('/campaigns', authenticateToken, getCampaigns);

// Rota para buscar métricas
router.get('/metrics', authenticateToken, getMetrics);

module.exports = router;
