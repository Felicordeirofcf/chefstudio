const express = require("express");
const asyncHandler = require("express-async-handler");
const multer = require("multer"); // Importar multer
const { protect } = require("../middleware/authMiddleware");
// Importar as funções do serviço OpenAI (a nova será adicionada depois)
const { generateAdCaption, generateDescriptionAndCaptionFromImage } = require("../services/openaiService"); 

const router = express.Router();

// Configurar multer para upload de imagem em memória
const storage = multer.memoryStorage(); // Armazena o arquivo na memória como um Buffer
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limite de 10MB para a imagem
  fileFilter: (req, file, cb) => {
    // Aceitar apenas tipos de imagem comuns
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo inválido. Apenas imagens são permitidas."), false);
    }
  }
});

/**
 * @swagger
 * tags:
 *   name: OpenAI
 *   description: Integração com a API da OpenAI
 */

// Rota existente para gerar legenda a partir de texto
/**
 * @swagger
 * /api/openai/gerar-legenda:
 *   post:
 *     summary: Gera uma legenda para anúncio usando IA (baseado em texto)
 *     tags: [OpenAI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - descricao
 *             properties:
 *               descricao:
 *                 type: string
 *                 description: Descrição simples do produto para gerar a legenda.
 *                 example: "Hambúrguer artesanal suculento com queijo cheddar e bacon crocante"
 *               contextoImagem:
 *                 type: string
 *                 description: "(Opcional) Contexto adicional da imagem."
 *                 example: "Foto de close-up do hambúrguer em um prato"
 *     responses:
 *       200:
 *         description: Legenda gerada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 legenda:
 *                   type: string
 *                   example: "🍔 Bacon, cheddar e suculência te esperam! Prove nosso hambúrguer artesanal hoje mesmo!"
 *       400:
 *         description: "Requisição inválida (ex: descrição faltando)"
 *       401:
 *         description: Não autorizado (token inválido ou ausente)
 *       500:
 *         description: Erro interno do servidor ou erro na API da OpenAI
 */
router.post("/gerar-legenda", protect, asyncHandler(async (req, res) => {
  const { descricao, contextoImagem } = req.body;
  if (!descricao) {
    res.status(400);
    throw new Error("O campo 'descricao' é obrigatório.");
  }
  try {
    const legenda = await generateAdCaption(descricao, contextoImagem);
    if (legenda.startsWith("Erro:")) {
      console.error("Erro retornado pelo serviço OpenAI (gerar-legenda):", legenda);
      res.status(500).json({ success: false, message: legenda });
      return;
    }
    res.json({ success: true, legenda });
  } catch (error) {
    console.error("Erro inesperado ao gerar legenda:", error);
    res.status(500);
    throw new Error("Falha ao gerar legenda via IA. Tente novamente mais tarde.");
  }
}));

// Nova rota para descrever imagem e gerar legenda
/**
 * @swagger
 * /api/openai/describe-image:
 *   post:
 *     summary: Gera descrição e legenda para anúncio a partir de uma imagem usando IA (GPT-4 Vision)
 *     tags: [OpenAI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo de imagem para análise.
 *     responses:
 *       200:
 *         description: Descrição e legenda geradas com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 descricao:
 *                   type: string
 *                   example: "Yakissoba de legumes com vegetais coloridos em um bowl branco."
 *                 legenda:
 *                   type: string
 *                   example: "🥢 Delicie-se com nosso Yakisoba fresquinho! Peça já o seu! #yakisoba #comidaoriental"
 *       400:
 *         description: "Requisição inválida (ex: imagem faltando ou tipo de arquivo inválido)."
 *       401:
 *         description: "Não autorizado (token inválido ou ausente)."
 *       429:
 *         description: "Quota da API OpenAI excedida."
 *       500:
 *         description: "Erro interno do servidor ou erro na API da OpenAI (ex: modelo indisponível, chave inválida)."
 */
router.post(
  "/describe-image", 
  protect, // Restored authentication middleware
  upload.single("image"), // Middleware multer para processar o upload da imagem
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400);
      throw new Error("Nenhuma imagem foi enviada.");
    }

    try {
      // Chamar a nova função do serviço OpenAI (a ser criada)
      const result = await generateDescriptionAndCaptionFromImage(req.file.buffer);
      
      // Verificar se o serviço retornou um erro conhecido (ex: quota, modelo inválido)
      if (result.error) {
          console.error("Erro retornado pelo serviço OpenAI (describe-image):", result.message);
          // Mapear o código de erro da OpenAI para status HTTP se possível
          const statusCode = result.statusCode || 500;
          res.status(statusCode).json({ success: false, message: result.message });
          return;
      }

      res.json({ 
        success: true, 
        descricao: result.descricao, 
        legenda: result.legenda 
      });

    } catch (error) {
      // Captura erros inesperados (ex: falha na comunicação com a API)
      console.error("Erro inesperado ao descrever imagem:", error);
      res.status(500);
      // Evitar expor detalhes internos no erro genérico
      throw new Error("Falha ao analisar a imagem via IA. Tente novamente mais tarde."); 
    }
  })
);

module.exports = router;

