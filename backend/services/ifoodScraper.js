const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Extrai dados de um produto a partir de uma URL do iFood.
 * @param {string} url A URL completa do produto no iFood.
 * @returns {Promise<object>} Um objeto com os dados extraídos (nome, descricao, preco, imagem, restaurante) ou lança um erro.
 */
async function scrapeIfoodProduct(url) {
  try {
    console.log(`Iniciando scraping para URL: ${url}`);
    const { data: html } = await axios.get(url, {
      headers: {
        // Simular um navegador comum para evitar bloqueios simples
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });
    const $ = cheerio.load(html);

    // --- Seletores (Estes podem precisar de ajuste se o iFood mudar o layout) ---
    const productNameSelector = 'h1[data-testid="product-name"]'; // Seletor comum para nome do produto
    const productDescriptionSelector = 'span[data-testid="product-description"]'; // Seletor comum para descrição
    const productPriceSelector = 'p[data-testid="product-price__value"]'; // Seletor comum para preço
    const productImageSelector = 'img[data-testid="product-image"]'; // Seletor comum para imagem
    const restaurantNameSelector = 'a[data-testid="restaurant-header-name"]'; // Seletor comum para nome do restaurante
    // ---------------------------------------------------------------------------

    const nome = $(productNameSelector).first().text().trim();
    const descricao = $(productDescriptionSelector).first().text().trim();
    const precoText = $(productPriceSelector).first().text().trim();
    // Extrair apenas o valor numérico do preço (ex: "R$ 13,99" -> "13,99")
    const precoMatch = precoText.match(/[\d,.]+/);
    const preco = precoMatch ? precoMatch[0] : 'Preço não encontrado';

    const imagem = $(productImageSelector).first().attr('src');
    const restaurante = $(restaurantNameSelector).first().text().trim();

    // Validar se os dados essenciais foram encontrados
    if (!nome || !preco || !imagem || !restaurante) {
      console.error('Falha ao extrair dados essenciais do iFood. Seletores podem estar desatualizados.');
      // Logar o HTML para depuração (opcional, pode ser muito grande)
      // console.log('HTML recebido:', html);
      throw new Error('Não foi possível extrair todos os dados do produto. Verifique a URL ou o layout da página pode ter mudado.');
    }

    const productData = {
      nome,
      descricao: descricao || 'Descrição não disponível',
      preco,
      imagem,
      restaurante,
    };

    console.log('Dados extraídos com sucesso:', productData);
    return productData;

  } catch (error) {
    console.error(`Erro durante o scraping da URL ${url}:`, error.message);
    if (axios.isAxiosError(error)) {
      console.error('Detalhes do erro Axios:', error.response?.status, error.response?.data);
      throw new Error(`Erro ao buscar a página do iFood: ${error.response?.statusText || error.message}`);
    } else if (error.message.includes('Não foi possível extrair')) {
      throw error; // Re-lançar o erro específico de extração
    } else {
      throw new Error(`Erro inesperado durante o scraping: ${error.message}`);
    }
  }
}

module.exports = { scrapeIfoodProduct };

