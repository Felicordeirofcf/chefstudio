const { scrapeIfoodProduct } = require("../services/ifoodScraper");

// Define a URL base da API (pode vir de .env em um cenário ideal)
const API_BASE_URL = process.env.API_BASE_URL || "https://chefstudio-production.up.railway.app";

/**
 * Função auxiliar para montar a URL completa da imagem.
 * @param {object} productData Dados do produto contendo a imagem relativa.
 * @returns {object} Dados do produto com a URL da imagem absoluta (se aplicável).
 */
const formatProductDataResponse = (productData) => {
  if (productData && productData.imagem && typeof productData.imagem === 'string' && productData.imagem.startsWith('/uploads/')) {
    return {
      ...productData,
      imagem: `${API_BASE_URL}${productData.imagem}`
    };
  }
  return productData; // Retorna os dados originais se a imagem não precisar de formatação
};

/**
 * Controller para lidar com o scraping de produtos do iFood.
 * (Mantendo a função renomeada que pode estar em uso)
 */
exports.extrairDadosIfood = async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string" || !url.startsWith("http") || !url.includes("ifood.com.br")) {
    return res.status(400).json({ message: "URL inválida ou não pertence ao iFood." });
  }

  try {
    console.log(`Recebida requisição para extração da URL: ${url}`);
    const productDataRaw = await scrapeIfoodProduct(url);
    console.log(`Extração bem-sucedida para URL: ${url}`);
    // Formata a URL da imagem antes de enviar
    const productDataFormatted = formatProductDataResponse(productDataRaw);
    res.status(200).json(productDataFormatted);
  } catch (error) {
    console.error(`Erro no controller ao processar extração para ${url}:`, error.message);
    let statusCode = 500;
    if (error.message.includes("inválida") || error.message.includes("não parece ser do iFood")) {
      statusCode = 400;
    } else if (error.message.includes("Não foi possível extrair")) {
      statusCode = 404;
    } else if (error.message.includes("Erro ao buscar a página") || error.message.includes("Falha no scraping")) {
      statusCode = 502;
    }
    res.status(statusCode).json({ message: error.message || "Erro interno ao tentar extrair dados do iFood." });
  }
};

/**
 * Controller para a rota /scrape (mantendo por compatibilidade ou uso específico).
 */
exports.scrapeIfood = async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string" || !url.startsWith("http") || !url.includes("ifood.com.br")) {
    return res.status(400).json({ message: "URL inválida ou não pertence ao iFood." });
  }

  try {
    console.log(`Recebida requisição para /scrape com URL: ${url}`);
    const productDataRaw = await scrapeIfoodProduct(url);
    console.log(`Scraping bem-sucedido para URL: ${url}`);
    // Formata a URL da imagem antes de enviar
    const productDataFormatted = formatProductDataResponse(productDataRaw);
    res.status(200).json(productDataFormatted);
  } catch (error) {
    console.error(`Erro no controller /scrape ao processar URL ${url}:`, error.message);
    let statusCode = 500;
    if (error.message.includes("inválida") || error.message.includes("não parece ser do iFood")) {
      statusCode = 400;
    } else if (error.message.includes("Não foi possível extrair")) {
      statusCode = 404;
    } else if (error.message.includes("Erro ao buscar a página") || error.message.includes("Falha no scraping")) {
      statusCode = 502;
    }
    res.status(statusCode).json({ message: error.message || "Erro interno ao tentar fazer scraping do iFood." });
  }
};

