const OpenAI = require('openai');
const dotenv = require('dotenv');

dotenv.config();

const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error('Erro: A variável de ambiente OPENAI_API_KEY não está definida.');
  // Em um cenário real, você pode querer lançar um erro ou ter um fallback
  // process.exit(1); // Descomente para parar a execução se a chave não estiver definida
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

/**
 * Gera uma legenda para um anúncio usando a API da OpenAI (GPT-4).
 * @param {string} productDescription - Descrição simples do produto.
 * @param {string} [imageContext] - (Opcional) Contexto adicional da imagem (pode ser uma descrição ou análise futura).
 * @returns {Promise<string>} - A legenda gerada.
 */
async function generateAdCaption(productDescription, imageContext = '') {
  if (!openaiApiKey) {
    return 'Erro: Chave da API OpenAI não configurada.';
  }

  try {
    // Adapte o prompt conforme necessário para o seu caso de uso específico.
    // Incluir contexto da imagem se disponível.
    const promptContent = `Crie uma legenda curta e atraente para um anúncio de restaurante no Facebook.
Produto: ${productDescription}
${imageContext ? `Contexto da Imagem: ${imageContext}\n` : ''}Foco: Atrair clientes para experimentar este item.
Estilo: Informal e convidativo.
Legenda:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4', // Usando o modelo gpt-4 conforme solicitado
      messages: [
        { role: 'system', content: 'Você é um assistente de marketing especializado em criar legendas para anúncios de restaurantes.' },
        { role: 'user', content: promptContent },
      ],
      temperature: 0.7, // Ajuste a criatividade
      max_tokens: 100, // Limite o tamanho da legenda
      n: 1,
    });

    // Verifica se a resposta contém a legenda esperada
    if (completion.choices && completion.choices.length > 0 && completion.choices[0].message) {
      return completion.choices[0].message.content.trim();
    } else {
      console.error('Resposta inesperada da API OpenAI:', completion);
      return 'Erro ao gerar legenda: resposta inválida da API.';
    }

  } catch (error) {
    console.error('Erro ao chamar a API da OpenAI:', error);
    // Retorna uma mensagem de erro mais detalhada se possível
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    return `Erro ao gerar legenda: ${errorMessage}`;
  }
}

module.exports = {
  generateAdCaption,
};

