const express = require("express");
const asyncHandler = require("express-async-handler");
const { protect } = require("../middleware/authMiddleware"); // Assuming auth middleware exists
const { generateAdCaption } = require("../services/openaiService");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: OpenAI
 *   description: Integração com a API da OpenAI
 */

/**
 * @swagger
 * /api/openai/gerar-legenda:
 *   post:
 *     summary: Gera uma legenda para anúncio usando IA
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
    
    // Verifica se a geração retornou um erro conhecido
    if (legenda.startsWith("Erro:")) {
        // Poderia logar o erro aqui também
        console.error("Erro retornado pelo serviço OpenAI:", legenda);
        // Decide qual status code retornar baseado no erro, ou um genérico 500
        if (legenda.includes("Chave da API OpenAI não configurada")) {
            res.status(500).json({ success: false, message: "Erro interno: Configuração da API OpenAI incompleta." });
        } else {
            res.status(500).json({ success: false, message: legenda }); // Retorna a mensagem de erro do serviço
        }
        return;
    }

    res.json({ success: true, legenda });

  } catch (error) {
    // Captura erros inesperados do serviço ou da chamada async
    console.error("Erro inesperado ao gerar legenda:", error);
    res.status(500);
    throw new Error("Falha ao gerar legenda via IA. Tente novamente mais tarde.");
  }
}));

module.exports = router;

