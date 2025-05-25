const { scrapeIfoodProduct } = require("../services/ifoodScraper");

/**
 * Controller para lidar com o scraping de produtos do iFood.
 */
exports.scrapeProduct = async (req, res) => {
  const { url } = req.body;

  // Validação básica da URL
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return res.status(400).json({ message: "URL inválida fornecida." });
  }

  // Validar se parece uma URL do iFood (verificação simples)
  if (!url.includes("ifood.com.br")) {
      return res.status(400).json({ message: "A URL fornecida não parece ser do iFood." });
  }

  try {
    console.log(`Recebida requisição para scraping da URL: ${url}`);
    const productData = await scrapeIfoodProduct(url);
    console.log(`Scraping bem-sucedido para URL: ${url}`);
    res.status(200).json(productData);
  } catch (error) {
    console.error(`Erro no controller ao processar scraping para ${url}:`, error.message);
    // Determinar o status code baseado no tipo de erro
    let statusCode = 500;
    if (error.message.includes("inválida") || error.message.includes("não parece ser do iFood")) {
        statusCode = 400; // Bad Request
    } else if (error.message.includes("Não foi possível extrair")) {
        statusCode = 404; // Not Found (ou dados não encontrados na página)
    } else if (error.message.includes("Erro ao buscar a página")) {
        statusCode = 502; // Bad Gateway (problema ao acessar o iFood)
    }
    
    res.status(statusCode).json({ message: error.message || "Erro interno ao tentar extrair dados do iFood." });
  }
};

