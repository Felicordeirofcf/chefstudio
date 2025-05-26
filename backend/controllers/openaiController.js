const { OpenAI } = require('openai');

// Inicializar o cliente OpenAI com a chave da API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Gera uma legenda persuasiva para um post usando o modelo GPT-4 da OpenAI
 * @param {string} descricao - Descrição do produto fornecida pelo cliente
 * @returns {Promise<string>} - Legenda gerada pela IA
 */
const gerarLegenda = async (descricao) => {
  try {
    console.log('Gerando legenda para descrição:', descricao);
    
    // Montar o prompt dinâmico conforme sugerido
    const prompt = `Gere uma legenda curta e persuasiva para um post promovendo o seguinte produto:

"${descricao}"

A legenda deve ser atrativa, usar emojis e hashtags, e incentivar o cliente a visitar o local ou pedir o produto. Seja criativo e comercial.`;

    // Fazer a chamada para a API da OpenAI usando o modelo GPT-4
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Usando o modelo GPT-4 conforme solicitado
      messages: [
        {
          role: "system",
          content: "Você é um especialista em marketing digital que cria legendas persuasivas e atrativas para posts de redes sociais de restaurantes e estabelecimentos comerciais."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7, // Balanceamento entre criatividade e consistência
      max_tokens: 200, // Limitar o tamanho da resposta para garantir legendas concisas
    });

    // Extrair a legenda gerada da resposta
    const legenda = response.choices[0].message.content.trim();
    console.log('Legenda gerada com sucesso:', legenda);
    
    return legenda;
  } catch (error) {
    console.error('Erro ao gerar legenda com OpenAI:', error);
    throw new Error(`Falha ao gerar legenda: ${error.message}`);
  }
};

/**
 * Controller para gerar legenda via API
 */
const gerarLegendaController = async (req, res) => {
  try {
    const { descricao } = req.body;
    
    // Validar se a descrição foi fornecida
    if (!descricao) {
      return res.status(400).json({ 
        success: false, 
        message: 'A descrição do produto é obrigatória' 
      });
    }
    
    // Gerar a legenda usando o serviço
    const legenda = await gerarLegenda(descricao);
    
    // Retornar a legenda gerada
    res.status(200).json({
      success: true,
      legenda
    });
  } catch (error) {
    console.error('Erro no controller de geração de legenda:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar legenda',
      error: error.message
    });
  }
};

module.exports = {
  gerarLegenda,
  gerarLegendaController
};
