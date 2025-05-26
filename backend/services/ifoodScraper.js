const axios = require("axios");
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

/**
 * Baixa uma imagem de uma URL e salva localmente.
 * @param {string} url A URL da imagem.
 * @param {string} uploadsDir O diretório onde salvar a imagem.
 * @returns {Promise<string|null>} O caminho local relativo da imagem salva ou null se falhar.
 */
async function downloadImage(url, uploadsDir) {
  try {
    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      console.warn(`URL da imagem inválida ou ausente: ${url}. Pulando download.`);
      return null;
    }
    const response = await axios.get(url, { responseType: "stream" });
    const urlPath = new URL(url).pathname;
    const extension = path.extname(urlPath) || ".jpg";
    const fileName = `${uuidv4()}${extension}`;
    const filePath = path.join(uploadsDir, fileName);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve(`/uploads/${fileName}`));
      writer.on("error", (err) => {
        console.error("Erro ao salvar a imagem:", err);
        fs.unlink(filePath, () => {});
        resolve(null);
      });
    });
  } catch (error) {
    console.error(`Erro ao baixar a imagem da URL ${url}:`, error.message);
    return null;
  }
}

/**
 * Extrai dados de um produto a partir de uma URL do iFood usando Playwright e metadados.
 * @param {string} url A URL completa do produto no iFood.
 * @returns {Promise<object>} Um objeto com os dados extraídos ou lança um erro.
 */
async function scrapeIfoodProduct(url) {
  let browser = null;
  try {
    console.log(`Iniciando scraping com Playwright (metadados) para URL: ${url}`);
    browser = await chromium.launch();
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2000); // Espera adicional para garantir carregamento

    // --- Extração via Metadados (JSON-LD e Open Graph) --- 

    let extractedProductName = null;
    let extractedDescription = null;
    let extractedPrice = "Preço não encontrado";
    let extractedRestaurantName = null;
    let extractedImageUrl = null;

    // 1. Tentar JSON-LD
    const jsonLdContents = await page.locator("script[type=\"application/ld+json\"]").allTextContents();
    let restaurantJson = null;
    let productJson = null; // Pode não haver um JSON específico para o produto

    for (const content of jsonLdContents) {
      try {
        const parsedJson = JSON.parse(content);
        if (parsedJson["@type"] === "Restaurant") {
          restaurantJson = parsedJson;
          extractedRestaurantName = restaurantJson.name;
        }
        // Tentar encontrar dados do produto (pode estar em makesOffer ou outro tipo)
        // A estrutura exata pode variar, esta é uma tentativa genérica
        if (parsedJson.makesOffer) {
            // Heurística: Tentar encontrar a oferta correspondente ao título da página
            const pageTitle = await page.title();
            const potentialOffer = parsedJson.makesOffer.find(offer => 
                offer.itemOffered && pageTitle.includes(offer.itemOffered.name)
            );
            if (potentialOffer && potentialOffer.itemOffered) {
                productJson = potentialOffer.itemOffered;
                extractedProductName = productJson.name;
                extractedDescription = productJson.description;
                if (potentialOffer.priceSpecification && potentialOffer.priceSpecification.price) {
                    // Preço pode estar em formato range "13.99-13.99" ou simples "13.99"
                    const priceParts = potentialOffer.priceSpecification.price.split("-");
                    extractedPrice = priceParts[0]; // Pegar o primeiro valor
                }
            }
        }
      } catch (e) {
        console.warn("Erro ao parsear JSON-LD:", e.message);
      }
    }

    // 2. Usar Open Graph (og:) tags como fallback ou para complementar
    if (!extractedProductName) {
        extractedProductName = await page.locator("meta[property=\"og:title\"]").first().getAttribute("content");
        // O título OG pode incluir o nome do restaurante, tentar remover
        if (extractedProductName && extractedRestaurantName && extractedProductName.includes(extractedRestaurantName)) {
            extractedProductName = extractedProductName.split("|")[0].trim(); // Heurística comum
        }
    }
    if (!extractedDescription) {
        extractedDescription = await page.locator("meta[property=\"og:description\"]").first().getAttribute("content");
    }
    if (!extractedImageUrl) {
        // Pegar a imagem de maior resolução (og:image pode ter várias tags)
        const ogImages = await page.locator("meta[property=\"og:image\"]").all();
        if (ogImages.length > 0) {
             extractedImageUrl = await ogImages[ogImages.length - 1].getAttribute("content"); // Última geralmente é a maior
        }
    }
     if (!extractedRestaurantName && restaurantJson) {
         extractedRestaurantName = restaurantJson.name;
     }

    // 3. Tentar extrair o preço do DOM como último recurso se não veio do JSON-LD
    if (extractedPrice === "Preço não encontrado") {
        try {
            // Usar seletores que podem aparecer no modal ou na página principal
            const priceElements = await page.locator(".price__value, .dish-price, .dish-details__price").all();
            for (const element of priceElements) {
                const text = await element.textContent();
                if (text && text.includes("R$")) {
                    const priceMatch = text.match(/[\d,.]+/);
                    if (priceMatch) {
                        extractedPrice = priceMatch[0];
                        break;
                    }
                }
            }
        } catch (e) {
            console.warn("Não foi possível extrair o preço do DOM.");
        }
    }

    await browser.close();
    browser = null;

    console.log("Dados brutos extraídos (Metadados):", { extractedProductName, extractedDescription, extractedPrice, extractedImageUrl, extractedRestaurantName });

    // Validar dados essenciais
    if (!extractedProductName || extractedPrice === "Preço não encontrado" || !extractedImageUrl || !extractedRestaurantName) {
      throw new Error("Não foi possível extrair todos os dados essenciais do produto via Metadados. A estrutura da página pode ter mudado significativamente.");
    }

    const uploadsDir = path.join(__dirname, "../uploads");
    const imagemLocal = await downloadImage(extractedImageUrl, uploadsDir);

    const productData = {
      nome: extractedProductName.trim(),
      descricao: extractedDescription ? extractedDescription.trim() : "Descrição não disponível",
      preco: extractedPrice,
      imagem: imagemLocal, // Caminho local ou null
      restaurante: extractedRestaurantName.trim(),
    };

    console.log("Dados extraídos e imagem processada com sucesso (Metadados):", productData);
    return productData;

  } catch (error) {
    console.error(`Erro durante o scraping com Playwright (Metadados) para URL ${url}:`, error);
    if (browser) {
      await browser.close();
    }
    throw new Error(`Falha no scraping do iFood com Playwright (Metadados): ${error.message}`);
  }
}

module.exports = { scrapeIfoodProduct };

