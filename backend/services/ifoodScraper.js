const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid"); // Importar uuid para nomes únicos

/**
 * Baixa uma imagem de uma URL e salva localmente.
 * @param {string} url A URL da imagem.
 * @param {string} uploadsDir O diretório onde salvar a imagem.
 * @returns {Promise<string>} O caminho local relativo da imagem salva (ex: /uploads/nome_unico.jpg).
 */
async function downloadImage(url, uploadsDir) {
  try {
    const response = await axios.get(url, { responseType: "stream" });

    // Extrair extensão do arquivo da URL ou usar jpg como padrão
    const urlPath = new URL(url).pathname;
    const extension = path.extname(urlPath) || ".jpg";
    const fileName = `${uuidv4()}${extension}`; // Gerar nome único
    const filePath = path.join(uploadsDir, fileName);

    // Garantir que o diretório de uploads exista
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve(`/uploads/${fileName}`)); // Retorna o caminho relativo
      writer.on("error", (err) => {
        console.error("Erro ao salvar a imagem:", err);
        // Tentar remover arquivo parcial em caso de erro
        fs.unlink(filePath, () => {}); 
        reject(new Error("Erro ao salvar a imagem"));
      });
    });
  } catch (error) {
    console.error(`Erro ao baixar a imagem da URL ${url}:`, error.message);
    throw new Error(`Erro ao baixar a imagem: ${error.message}`);
  }
}

/**
 * Extrai dados de um produto a partir de uma URL do iFood, baixando a imagem.
 * @param {string} url A URL completa do produto no iFood.
 * @returns {Promise<object>} Um objeto com os dados extraídos (nome, descricao, preco, imagemLocal, restaurante) ou lança um erro.
 */
async function scrapeIfoodProduct(url) {
  try {
    console.log(`Iniciando scraping para URL: ${url}`);
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    const $ = cheerio.load(html);

    const productNameSelector = "h1[data-testid=\"product-name\"]";
    const productDescriptionSelector = "span[data-testid=\"product-description\"]";
    const productPriceSelector = "p[data-testid=\"product-price__value\"]";
    const productImageSelector = "img[data-testid=\"product-image\"]";
    const restaurantNameSelector = "a[data-testid=\"restaurant-header-name\"]";

    const nome = $(productNameSelector).first().text().trim();
    const descricao = $(productDescriptionSelector).first().text().trim();
    const precoText = $(productPriceSelector).first().text().trim();
    const precoMatch = precoText.match(/[\d,.]+/);
    const preco = precoMatch ? precoMatch[0] : "Preço não encontrado";

    const imagemUrl = $(productImageSelector).first().attr("src");
    const restaurante = $(restaurantNameSelector).first().text().trim();

    if (!nome || !preco || !imagemUrl || !restaurante) {
      console.error("Falha ao extrair dados essenciais do iFood. Seletores podem estar desatualizados.");
      throw new Error("Não foi possível extrair todos os dados do produto. Verifique a URL ou o layout da página pode ter mudado.");
    }

    // Definir diretório de uploads (ajuste o caminho conforme a estrutura do seu projeto)
    const uploadsDir = path.join(__dirname, "../uploads"); 

    // Baixar a imagem
    const imagemLocal = await downloadImage(imagemUrl, uploadsDir);

    const productData = {
      nome,
      descricao: descricao || "Descrição não disponível",
      preco,
      imagem: imagemLocal, // Usar o caminho local da imagem baixada
      restaurante,
    };

    console.log("Dados extraídos e imagem baixada com sucesso:", productData);
    return productData;

  } catch (error) {
    console.error(`Erro durante o scraping da URL ${url}:`, error.message);
    if (axios.isAxiosError(error) && !error.message.includes("baixar a imagem")) {
      console.error("Detalhes do erro Axios:", error.response?.status, error.response?.data);
      throw new Error(`Erro ao buscar a página do iFood: ${error.response?.statusText || error.message}`);
    } else {
      // Re-lançar outros erros (incluindo erros de download/salvamento da imagem ou extração)
      throw error;
    }
  }
}

module.exports = { scrapeIfoodProduct };

