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

// Armazenamento em memória para campanhas criadas (simulação)
// Em um ambiente de produção, isso seria substituído por um banco de dados
const campaignsStore = {
    // Mapeamento de adAccountId para array de campanhas
    // Exemplo: { 'act_123456789': [campaign1, campaign2, ...] }
};

// Adicionar algumas campanhas de exemplo para cada conta
const addExampleCampaigns = (adAccountId) => {
    if (!campaignsStore[adAccountId]) {
        campaignsStore[adAccountId] = [
            {
                id: '23848123456789',
                campaignId: '23848123456789',
                name: 'Campanha de Verão',
                status: 'ACTIVE',
                weeklyBudget: 350.00,
                dailyBudget: 50.00,
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                adAccountId: adAccountId,
                metrics: {
                    reach: 1234,
                    impressions: 5678,
                    clicks: 89,
                    spend: 123.45
                }
            },
            {
                id: '23848987654321',
                campaignId: '23848987654321',
                name: 'Promoção de Fim de Semana',
                status: 'PAUSED',
                weeklyBudget: 210.00,
                dailyBudget: 30.00,
                startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                endDate: null,
                adAccountId: adAccountId,
                metrics: {
                    reach: 567,
                    impressions: 2345,
                    clicks: 45,
                    spend: 67.89
                }
            }
        ];
    }
};

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
        
        // Gerar IDs únicos para a campanha, ad set e ad
        const campaignId = `23848${Math.floor(Math.random() * 10000000)}`;
        const adSetId = `23848${Math.floor(Math.random() * 10000000)}`;
        const adId = `23848${Math.floor(Math.random() * 10000000)}`;
        
        // Simulação de criação de anúncio
        const adDetails = {
            id: campaignId, // Usar o mesmo ID para facilitar a listagem
            campaignId: campaignId,
            name: campaignName,
            adAccountId: adAccountId,
            pageId: pageId,
            weeklyBudget: parseFloat(weeklyBudget),
            dailyBudget: parseFloat(weeklyBudget) / 7, // Convertendo orçamento semanal para diário
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
            location: location,
            adDescription: adDescription,
            adTitle: adTitle || null,
            callToAction: callToAction || 'LEARN_MORE',
            menuUrl: menuUrl || null,
            status: 'ACTIVE', // Definir como ACTIVE para aparecer na listagem
            imageUrl: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`,
            adSetId: adSetId,
            adId: adId,
            createdAt: new Date(),
            type: 'image'
        };
        
        // Armazenar a campanha em memória
        if (!campaignsStore[adAccountId]) {
            campaignsStore[adAccountId] = [];
        }
        
        // Adicionar a nova campanha no início da lista
        campaignsStore[adAccountId].unshift(adDetails);
        
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

/**
 * @swagger
 * /api/meta-ads/create-from-post:
 *   post:
 *     summary: Cria um anúncio a partir de uma publicação existente
 *     tags: [Meta Ads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postUrl
 *             properties:
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
 *               postUrl:
 *                 type: string
 *                 description: URL da publicação do Facebook
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
router.post("/create-from-post", protect, async (req, res) => {
    try {
        const { 
            adAccountId, 
            pageId, 
            campaignName, 
            weeklyBudget, 
            startDate, 
            endDate, 
            postUrl,
            callToAction, 
            menuUrl 
        } = req.body;
        
        // Verificar campos obrigatórios
        if (!postUrl) {
            return res.status(400).json({ message: 'URL da publicação é obrigatória' });
        }
        
        if (!adAccountId || !pageId || !campaignName || !weeklyBudget || !startDate) {
            return res.status(400).json({ message: 'Campos obrigatórios não preenchidos' });
        }
        
        // Obter informações de localização
        let location = { latitude: -23.5505, longitude: -46.6333, radius: 10 }; // Padrão: São Paulo com raio de 10km
        
        if (req.body.location) {
            try {
                location = req.body.location;
            } catch (error) {
                console.error('Erro ao processar localização:', error);
            }
        }
        
        // Extrair ID da publicação da URL
        let postId = null;
        
        // Tentar extrair o ID da publicação da URL
        if (postUrl.includes('fbid=')) {
            const fbidMatch = postUrl.match(/fbid=(\d+)/);
            if (fbidMatch && fbidMatch[1]) {
                postId = fbidMatch[1];
            }
        } else if (postUrl.includes('/posts/')) {
            const postsMatch = postUrl.match(/\/posts\/(\d+)/);
            if (postsMatch && postsMatch[1]) {
                postId = postsMatch[1];
            }
        }
        
        if (!postId) {
            return res.status(400).json({ 
                message: 'Não foi possível extrair o ID da publicação da URL fornecida',
                postUrl
            });
        }
        
        // Em um ambiente real, aqui seria feita a chamada para a API do Facebook
        // para criar o anúncio a partir da publicação
        
        // Gerar IDs únicos para a campanha, ad set e ad
        const campaignId = `23848${Math.floor(Math.random() * 10000000)}`;
        const adSetId = `23848${Math.floor(Math.random() * 10000000)}`;
        const adId = `23848${Math.floor(Math.random() * 10000000)}`;
        
        // Simulação de criação de anúncio
        const adDetails = {
            id: campaignId, // Usar o mesmo ID para facilitar a listagem
            campaignId: campaignId,
            name: campaignName,
            adAccountId: adAccountId,
            pageId: pageId,
            weeklyBudget: parseFloat(weeklyBudget),
            dailyBudget: parseFloat(weeklyBudget) / 7, // Convertendo orçamento semanal para diário
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
            location: location,
            callToAction: callToAction || 'LEARN_MORE',
            menuUrl: menuUrl || null,
            status: 'ACTIVE', // Definir como ACTIVE para aparecer na listagem
            postId: postId,
            postUrl: postUrl,
            adSetId: adSetId,
            adId: adId,
            createdAt: new Date(),
            type: 'post'
        };
        
        // Armazenar a campanha em memória
        if (!campaignsStore[adAccountId]) {
            campaignsStore[adAccountId] = [];
        }
        
        // Adicionar a nova campanha no início da lista
        campaignsStore[adAccountId].unshift(adDetails);
        
        res.status(201).json({
            success: true,
            message: 'Anúncio criado com sucesso a partir da publicação',
            campaignId: adDetails.campaignId,
            adSetId: adDetails.adSetId,
            adId: adDetails.adId,
            adDetails
        });
    } catch (error) {
        console.error('Erro ao criar anúncio a partir de publicação:', error);
        res.status(500).json({ 
            message: 'Erro ao criar anúncio',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/meta-ads/campaigns:
 *   get:
 *     summary: Obtém as campanhas do usuário
 *     tags: [Meta Ads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: adAccountId
 *         schema:
 *           type: string
 *         description: ID da conta de anúncios para filtrar campanhas
 *     responses:
 *       200:
 *         description: Campanhas obtidas com sucesso
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get("/campaigns", protect, async (req, res) => {
    try {
        const { adAccountId } = req.query;
        
        if (!adAccountId) {
            return res.status(400).json({ message: 'ID da conta de anúncios é obrigatório' });
        }
        
        // Adicionar campanhas de exemplo se não houver nenhuma para esta conta
        if (!campaignsStore[adAccountId]) {
            addExampleCampaigns(adAccountId);
        }
        
        // Retornar as campanhas armazenadas para esta conta
        res.json({
            success: true,
            campaigns: campaignsStore[adAccountId] || []
        });
    } catch (error) {
        console.error('Erro ao obter campanhas:', error);
        res.status(500).json({ 
            message: 'Erro ao obter campanhas',
            error: error.message
        });
    }
});

module.exports = router;
