const OpenAI = require("openai");
const dotenv = require("dotenv");

dotenv.config();

const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error("Erro: A variável de ambiente OPENAI_API_KEY não está definida.");
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

/**
 * Gera uma legenda para um anúncio usando a API da OpenAI (baseado em texto).
 * @param {string} productDescription - Descrição simples do produto.
 * @param {string} [imageContext] - (Opcional) Contexto adicional da imagem.
 * @returns {Promise<string>} - A legenda gerada ou uma mensagem de erro.
 */
async function generateAdCaption(productDescription, imageContext = "") {
  if (!openaiApiKey) {
    return "Erro: Chave da API OpenAI não configurada.";
  }
  try {
    const promptContent = `Crie uma legenda curta e atraente para um anúncio de restaurante no Facebook.\nProduto: ${productDescription}\n${imageContext ? `Contexto da Imagem: ${imageContext}\n` : ""}Foco: Atrair clientes para experimentar este item.\nEstilo: Informal e convidativo.\nLegenda:`;
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Você é um assistente de marketing especializado em criar legendas para anúncios de restaurantes." },
        { role: "user", content: promptContent },
      ],
      temperature: 0.7,
      max_tokens: 100,
      n: 1,
    });
    if (completion.choices && completion.choices.length > 0 && completion.choices[0].message) {
      return completion.choices[0].message.content.trim();
    } else {
      console.error("Resposta inesperada da API OpenAI (generateAdCaption):", completion);
      return "Erro ao gerar legenda: resposta inválida da API.";
    }
  } catch (error) {
    console.error("Erro ao chamar a API da OpenAI (generateAdCaption):", error);
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    // Retornar erro específico para o controller tratar
    return `Erro ao gerar legenda: ${errorMessage}`;
  }
}

/**
 * Gera descrição e legenda para um anúncio a partir de uma imagem usando GPT-4 Vision/Omni.
 * @param {Buffer} imageBuffer - Buffer da imagem enviada.
 * @returns {Promise<{descricao: string, legenda: string}|{error: boolean, message: string, statusCode?: number}>} - Objeto com descrição/legenda ou objeto de erro.
 */
async function generateDescriptionAndCaptionFromImage(imageBuffer) {
  if (!openaiApiKey) {
    return { error: true, message: "Erro: Chave da API OpenAI não configurada.", statusCode: 500 };
  }

  try {
    const base64Image = imageBuffer.toString("base64");
    // Detectar tipo de imagem seria ideal, mas vamos assumir jpeg/png por enquanto
    const dataUrl = `data:image/jpeg;base64,${base64Image}`; 

    const modelToUse = "gpt-3.5-turbo"; // Alterado conforme solicitado, VAI QUEBRAR A FUNCIONALIDADE DE VISÃO

    // Corrigido: Usar template literals (backticks) para a string multi-linha do prompt
    const promptText = `Analise esta imagem de um prato de comida. Forneça:
1. Uma descrição curta e objetiva do prato.
2. Uma legenda curta, informal, criativa e persuasiva para um anúncio no Facebook ou Instagram, focando em atrair clientes para experimentar o prato. Inclua emojis relevantes.

Responda APENAS no seguinte formato JSON, sem nenhum texto adicional antes ou depois:
{
  "descricao": "Sua descrição aqui",
  "legenda": "Sua legenda aqui"
}`; 

    const response = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptText }, // Usar a variável com a string corrigida
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
      // Adicionar response_format para garantir JSON, se o modelo suportar
      // response_format: { type: "json_object" }, // Descomentar se usar modelos que suportam JSON mode
    });

    if (response.choices && response.choices.length > 0 && response.choices[0].message && response.choices[0].message.content) {
      const content = response.choices[0].message.content;
      console.log("Raw OpenAI Vision Response:", content);
      try {
        // Tentar extrair o JSON da resposta (pode vir com markdown ```json ... ```)
        const jsonMatch = content.match(/\{\s*"descricao":.*?\}/s);
        if (jsonMatch) {
            const parsedResult = JSON.parse(jsonMatch[0]);
            if (parsedResult.descricao && parsedResult.legenda) {
              return { 
                descricao: parsedResult.descricao, 
                legenda: parsedResult.legenda 
              };
            } else {
                 console.error("JSON retornado pela API não contém os campos esperados:", parsedResult);
                 return { error: true, message: "Erro ao processar resposta da IA: formato inesperado.", statusCode: 500 };
            }
        } else {
             console.error("Não foi possível encontrar um JSON válido na resposta da API:", content);
             return { error: true, message: "Erro ao processar resposta da IA: formato inválido.", statusCode: 500 };
        }
      } catch (parseError) {
        console.error("Erro ao fazer parse do JSON da resposta da API:", parseError, "Conteúdo:", content);
        return { error: true, message: "Erro ao processar resposta da IA.", statusCode: 500 };
      }
    } else {
      console.error("Resposta inesperada da API OpenAI (Vision):", response);
      return { error: true, message: "Erro ao gerar descrição/legenda: resposta inválida da API.", statusCode: 500 };
    }

  } catch (error) {
    console.error("Erro ao chamar a API da OpenAI (Vision):", error);
    let errorMessage = "Erro interno ao processar imagem com IA.";
    let statusCode = 500;

    if (error instanceof OpenAI.APIError) {
        statusCode = error.status || 500;
        errorMessage = error.message; // Mensagem de erro da API
        if (error.status === 429) {
            errorMessage = "Quota da API OpenAI excedida. Verifique seu plano.";
        } else if (error.status === 404 || (error.message && error.message.includes("does not exist"))) {
             errorMessage = `O modelo ${modelToUse} não existe ou sua chave não tem acesso a ele.`;
        } else if (error.status === 400 && error.message && error.message.includes("invalid image")){
             errorMessage = "A imagem enviada é inválida ou não suportada.";
        }
    } else if (error.message) {
        errorMessage = error.message;
    }

    return { error: true, message: errorMessage, statusCode: statusCode };
  }
}

module.exports = {
  generateAdCaption,
  generateDescriptionAndCaptionFromImage, // Exportar a nova função
};

