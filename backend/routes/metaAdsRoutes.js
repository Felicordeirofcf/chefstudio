const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const metaController = require("../controllers/metaController");
const multer = require('multer');

// Configuração do Multer para upload de imagem (salvar em memória ou temporário)
// Ajuste conforme necessário (ex: salvar em disco com nome único)
const storage = multer.diskStorage({ // Salvar em disco temporariamente
    destination: function (req, file, cb) {
        cb(null, '/tmp/') // Diretório temporário
    },
    filename: function (req, file, cb) {
        // Usar um nome único para evitar conflitos
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + require('path').extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

/**
 * @swagger
 * tags:
 *   name: Meta Ads
 *   description: Endpoints para gerenciamento de campanhas e anúncios no Meta Ads
 */

/**
 * @swagger
 * /api/meta-ads/create-recommended-traffic-campaign:
 *   post:
 *     summary: Cria uma campanha de tráfego recomendada no Meta Ads
 *     tags: [Meta Ads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               campaignName:
 *                 type: string
 *                 description: Nome da campanha.
 *               pageId:
 *                 type: string
 *                 description: ID da página do Facebook selecionada.
 *               weeklyBudget:
 *                 type: number
 *                 description: Orçamento semanal em R$.
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Data de início (YYYY-MM-DD).
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Data de término (opcional, YYYY-MM-DD).
 *               location:
 *                 type: string
 *                 description: Objeto JSON stringificado { latitude, longitude, radius }.
 *               adType:
 *                 type: string
 *                 enum: [image, post]
 *                 description: Tipo de anúncio ('image' ou 'post').
 *               adTitle:
 *                 type: string
 *                 description: Título do anúncio (opcional).
 *               adDescription:
 *                 type: string
 *                 description: Descrição/texto principal do anúncio.
 *               imageFile:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo de imagem (obrigatório se adType='image').
 *               postUrl:
 *                 type: string
 *                 description: URL da publicação (obrigatório se adType='post').
 *               callToAction:
 *                 type: string
 *                 description: Tipo de CTA (ex: 'LEARN_MORE', 'SHOP_NOW').
 *               menuUrl:
 *                 type: string
 *                 description: Link de destino (URL do cardápio).
 *     responses:
 *       201:
 *         description: Campanha criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 campaignId:
 *                   type: string
 *                 adSetId:
 *                   type: string
 *                 adId:
 *                   type: string
 *       400:
 *         description: Parâmetros inválidos ou ausentes
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
// Usar upload.single('imageFile') para lidar com o upload da imagem
router.post("/create-recommended-traffic-campaign", protect, upload.single('imageFile'), metaController.createRecommendedTrafficCampaign);

/**
 * @swagger
 * /api/meta-ads/create-from-image:
 *   post:
 *     summary: Cria um anúncio a partir de uma imagem
 *     tags: [Meta Ads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Imagem para o anúncio
 *               adAccountId:
 *                 type: string
 *                 description: ID da conta de anúncios
 *               pageId:
 *                 type: string
 *                 description: ID da página do Facebook
 *               campaignName:
 *                 type: string
 *                 description: Nome da campanha
 *               weeklyBudget:
 *                 type: number
 *                 description: Orçamento semanal em R$
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Data de início (YYYY-MM-DD)
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Data de término (opcional, YYYY-MM-DD)
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   radius:
 *                     type: number
 *               adDescription:
 *                 type: string
 *                 description: Descrição/texto principal do anúncio
 *               adTitle:
 *                 type: string
 *                 description: Título do anúncio (opcional)
 *               callToAction:
 *                 type: string
 *                 description: Tipo de CTA (ex: 'LEARN_MORE', 'SHOP_NOW')
 *               menuUrl:
 *                 type: string
 *                 description: Link de destino (URL do cardápio)
 *     responses:
 *       201:
 *         description: Anúncio criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 campaignId:
 *                   type: string
 *                 adSetId:
 *                   type: string
 *                 adId:
 *                   type: string
 *       400:
 *         description: Parâmetros inválidos ou ausentes
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.post("/create-from-image", protect, upload.single('image'), async (req, res) => {
    try {
        const { 
            adAccountId, 
            pageId, 
            campaignName, 
            weeklyBudget, 
            startDate, 
            endDate, 
            adDescription, 
            adTitle, 
            callToAction, 
            menuUrl 
        } = req.body;
        
        // Verificar campos obrigatórios
        if (!req.file) {
            return res.status(400).json({ message: 'Imagem é obrigatória' });
        }
        
        if (!adAccountId || !pageId || !campaignName || !weeklyBudget || !startDate || !adDescription) {
            return res.status(400).json({ message: 'Campos obrigatórios não preenchidos' });
        }
        
        // Obter informações de localização
        let location = { latitude: -23.5505, longitude: -46.6333, radius: 10 }; // Padrão: São Paulo com raio de 10km
        
        if (req.body.location) {
            try {
                if (typeof req.body.location === 'string') {
                    location = JSON.parse(req.body.location);
                } else if (req.body['location[latitude]'] && req.body['location[longitude]'] && req.body['location[radius]']) {
                    location = {
                        latitude: parseFloat(req.body['location[latitude]']),
                        longitude: parseFloat(req.body['location[longitude]']),
                        radius: parseInt(req.body['location[radius]'])
                    };
                }
            } catch (error) {
                console.error('Erro ao processar localização:', error);
            }
        }
        
        // Em um ambiente real, aqui seria feita a chamada para a API do Facebook
        // para fazer upload da imagem e criar o anúncio
        
        // Simulação de criação de anúncio
        const adDetails = {
            name: campaignName,
            adAccountId: adAccountId,
            pageId: pageId,
            weeklyBudget: parseFloat(weeklyBudget),
            dailyBudget: parseFloat(weeklyBudget) / 7, // Convertendo orçamento semanal para diário
            startDate: startDate,
            endDate: endDate || null,
            location: location,
            adDescription: adDescription,
            adTitle: adTitle || null,
            callToAction: callToAction || 'LEARN_MORE',
            menuUrl: menuUrl || null,
            status: 'PAUSED',
            imageUrl: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`,
            campaignId: `23848${Math.floor(Math.random() * 10000000)}`,
            adSetId: `23848${Math.floor(Math.random() * 10000000)}`,
            adId: `23848${Math.floor(Math.random() * 10000000)}`
        };
        
        // Em um ambiente real, salvaríamos o anúncio no banco de dados
        
        res.status(201).json({
            success: true,
            message: 'Anúncio criado com sucesso',
            campaignId: adDetails.campaignId,
            adSetId: adDetails.adSetId,
            adId: adDetails.adId,
            adDetails
        });
    } catch (error) {
        console.error('Erro ao criar anúncio a partir de imagem:', error);
        res.status(500).json({ 
            message: 'Erro ao criar anúncio',
            error: error.message
        });
    }
});

module.exports = router;
