const { scrapeIfoodProduct } = require("../services/ifoodScraper");

/**
 * Controller para lidar com o scraping de produtos do iFood.
 * Renomeado de scrapeProduct para extrairDadosIfood para consistência.
 */
exports.extrairDadosIfood = async (req, res) => { // <<< RENOMEADO AQUI
  const { url } = req.body;

  // Validação básica da URL
  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    return res.status(400).json({ message: "URL inválida fornecida." });
  }

  // Validar se parece uma URL do iFood (verificação simples)
  if (!url.includes("ifood.com.br")) {
    return res.status(400).json({ message: "A URL fornecida não parece ser do iFood." });
  }

  try {
    console.log(`Recebida requisição para extração da URL: ${url}`);
    // Chama o serviço que agora baixa a imagem e retorna o caminho local
    const productData = await scrapeIfoodProduct(url);
    console.log(`Extração bem-sucedida para URL: ${url}`);
    // Retorna os dados com o caminho da imagem local
    res.status(200).json(productData);
  } catch (error) {
    console.error(`Erro no controller ao processar extração para ${url}:`, error.message);
    // Determinar o status code baseado no tipo de erro
    let statusCode = 500;
    if (error.message.includes("inválida") || error.message.includes("não parece ser do iFood")) {
      statusCode = 400; // Bad Request
    } else if (error.message.includes("Não foi possível extrair")) {
      statusCode = 404; // Not Found (ou dados não encontrados na página)
    } else if (error.message.includes("Erro ao buscar a página")) {
      statusCode = 502; // Bad Gateway (problema ao acessar o iFood)
    } else if (error.message.includes("Erro ao baixar a imagem") || error.message.includes("Erro ao salvar a imagem")) {
      statusCode = 500; // Internal Server Error para problemas com a imagem
    }

    res.status(statusCode).json({ message: error.message || "Erro interno ao tentar extrair dados do iFood." });
  }
};

// Função scrapeIfood agora usa a lógica real de scraping
exports.scrapeIfood = async (req, res) => {
  const { url } = req.body;

  // Validação básica da URL
  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    return res.status(400).json({ message: "URL inválida fornecida." });
  }

  // Validar se parece uma URL do iFood (verificação simples)
  if (!url.includes("ifood.com.br")) {
    return res.status(400).json({ message: "A URL fornecida não parece ser do iFood." });
  }

  try {
    console.log(`Recebida requisição para /scrape com URL: ${url}`);
    // Chama o serviço que agora baixa a imagem e retorna o caminho local
    const productData = await scrapeIfoodProduct(url);
    console.log(`Scraping bem-sucedido para URL: ${url}`);
    // Retorna os dados com o caminho da imagem local
    res.status(200).json(productData);
  } catch (error) {
    console.error(`Erro no controller /scrape ao processar URL ${url}:`, error.message);
    // Determinar o status code baseado no tipo de erro (similar à outra função)
    let statusCode = 500;
    if (error.message.includes("inválida") || error.message.includes("não parece ser do iFood")) {
      statusCode = 400;
    } else if (error.message.includes("Não foi possível extrair")) {
      statusCode = 404;
    } else if (error.message.includes("Erro ao buscar a página")) {
      statusCode = 502;
    } else if (error.message.includes("Erro ao baixar a imagem") || error.message.includes("Erro ao salvar a imagem")) {
      statusCode = 500;
    }
    res.status(statusCode).json({ message: error.message || "Erro interno ao tentar fazer scraping do iFood." });
  }
};

