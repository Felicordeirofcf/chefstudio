const Campaign = require("../models/Campaign"); // Assuming model is defined

// Simulated in-memory storage for campaigns (replace with DB interaction later)
let simulatedCampaigns = [
    {
        _id: "sim_camp_1",
        name: "Campanha Hambúrguer Semanal",
        budget: 100,
        radius: 5,
        status: "active",
        owner: "sim_test_user_123",
        metrics: { impressions: 7500, clicks: 450, spend: 95.50, lastUpdated: new Date(Date.now() - 86400000) }, // Yesterday
        createdAt: new Date(Date.now() - 7 * 86400000) // A week ago
    },
    {
        _id: "sim_camp_2",
        name: "Promoção Pizza Fim de Semana",
        budget: 50,
        radius: 3,
        status: "paused",
        owner: "sim_test_user_123",
        metrics: { impressions: 3200, clicks: 180, spend: 48.20, lastUpdated: new Date(Date.now() - 2 * 86400000) }, // 2 days ago
        createdAt: new Date(Date.now() - 14 * 86400000) // Two weeks ago
    },
];

// Simulated location settings (replace with DB interaction later, maybe on User model)
let simulatedLocation = {
    lat: -23.5505, // Example coordinates (São Paulo)
    lng: -46.6333,
    radius: 5, // Default radius
    owner: "sim_test_user_123"
};

// @desc    Get all campaigns for the logged-in user (Simulated)
// @route   GET /api/ads
// @access  Private (Placeholder)
const getAllCampaigns = async (req, res) => {
    const ownerId = "sim_test_user_123"; // Get from token later
    console.log("Simulating fetching all campaigns for owner:", ownerId);

    // Simulate fetching campaigns for the user
    const userCampaigns = simulatedCampaigns.filter(camp => camp.owner === ownerId);
    res.json(userCampaigns);
};

// @desc    Create a new campaign (Simulated)
// @route   POST /api/ads
// @access  Private (Placeholder)
const createCampaign = async (req, res) => {
    const { budget, radius, name, description, menuItemId } = req.body;
    const ownerId = "sim_test_user_123"; // Get from token later

    console.log("Simulating creating campaign for owner:", ownerId);

    // Simulate basic validation
    if (!budget || !radius) {
        return res.status(400).json({ message: "Orçamento e raio são obrigatórios." });
    }

    // Simulate creating new campaign
    const newCampaign = {
        _id: `sim_camp_${Date.now()}`,
        name: name || `Campanha Inteligente - ${new Date().toLocaleDateString("pt-BR")}`,
        description,
        budget,
        radius,
        status: "active", // Start as active (simulation)
        menuItem: menuItemId, // Optional reference
        generatedCaption: "Legenda incrível gerada por IA! (simulado)", // Simulate AI caption
        metaCampaignId: `meta_sim_${Date.now()}`, // Simulate Meta ID
        metrics: { impressions: 0, clicks: 0, spend: 0, lastUpdated: new Date() },
        owner: ownerId,
        createdAt: new Date()
    };
    simulatedCampaigns.push(newCampaign);
    console.log("Simulated campaign created:", newCampaign);

    res.status(201).json(newCampaign);
};

// @desc    Get a specific campaign by ID (Simulated)
// @route   GET /api/ads/:id
// @access  Private (Placeholder)
const getCampaignById = async (req, res) => {
    const campaignId = req.params.id;
    const ownerId = "sim_test_user_123"; // Get from token later
    console.log(`Simulating fetching campaign ${campaignId} for owner ${ownerId}`);

    // Simulate finding the campaign
    const campaign = simulatedCampaigns.find(c => c._id === campaignId && c.owner === ownerId);

    if (campaign) {
        res.json(campaign);
    } else {
        res.status(404).json({ message: "Campanha não encontrada (simulado)." });
    }
};

// @desc    Update campaign status (e.g., pause, activate) (Simulated)
// @route   PUT /api/ads/:id/status
// @access  Private (Placeholder)
const updateCampaignStatus = async (req, res) => {
    const campaignId = req.params.id;
    const { status } = req.body;
    const ownerId = "sim_test_user_123"; // Get from token later
    console.log(`Simulating updating status of campaign ${campaignId} to '${status}' for owner ${ownerId}`);

    // Simulate finding and updating the campaign status
    const campaignIndex = simulatedCampaigns.findIndex(c => c._id === campaignId && c.owner === ownerId);

    if (campaignIndex !== -1) {
        // Validate status if needed
        const validStatuses = ["active", "paused", "inactive"];
        if (validStatuses.includes(status)) {
            simulatedCampaigns[campaignIndex].status = status;
            console.log("Simulated campaign status updated:", simulatedCampaigns[campaignIndex]);
            res.json(simulatedCampaigns[campaignIndex]);
        } else {
            res.status(400).json({ message: "Status inválido." });
        }
    } else {
        res.status(404).json({ message: "Campanha não encontrada (simulado)." });
    }
};

// @desc    Get campaign metrics (Simulated)
// @route   GET /api/ads/:id/metrics
// @access  Private (Placeholder)
const getCampaignMetrics = async (req, res) => {
    const campaignId = req.params.id;
    const ownerId = "sim_test_user_123"; // Get from token later
    console.log(`Simulating fetching metrics for campaign ${campaignId} for owner ${ownerId}`);

    // Simulate finding the campaign
    const campaign = simulatedCampaigns.find(c => c._id === campaignId && c.owner === ownerId);

    if (campaign) {
        // Simulate slightly updated metrics
        const updatedMetrics = {
            ...campaign.metrics,
            impressions: campaign.metrics.impressions + Math.floor(Math.random() * 100),
            clicks: campaign.metrics.clicks + Math.floor(Math.random() * 5),
            spend: campaign.metrics.spend + Math.random() * 10,
            lastUpdated: new Date()
        };
        // Update in memory store (for subsequent calls)
        campaign.metrics = updatedMetrics;
        res.json(updatedMetrics);
    } else {
        res.status(404).json({ message: "Campanha não encontrada (simulado)." });
    }
};

// @desc    Save location settings (Simulated)
// @route   POST /api/ads/location
// @access  Private (Placeholder)
const saveLocationSettings = async (req, res) => {
    const { lat, lng, radius } = req.body;
    const ownerId = "sim_test_user_123"; // Get from token later
    console.log(`Simulating saving location settings for owner ${ownerId}:`, req.body);

    // Simulate saving (update in-memory object)
    simulatedLocation = {
        ...simulatedLocation,
        lat: lat !== undefined ? lat : simulatedLocation.lat,
        lng: lng !== undefined ? lng : simulatedLocation.lng,
        radius: radius !== undefined ? radius : simulatedLocation.radius,
        owner: ownerId
    };

    res.json({ message: "Configurações de localização salvas (simulado).", location: simulatedLocation });
};

// @desc    Get location settings (Simulated)
// @route   GET /api/ads/location
// @access  Private (Placeholder)
const getLocationSettings = async (req, res) => {
    const ownerId = "sim_test_user_123"; // Get from token later
    console.log(`Simulating fetching location settings for owner ${ownerId}`);

    // Simulate fetching (return in-memory object if owner matches)
    if (simulatedLocation.owner === ownerId) {
        res.json(simulatedLocation);
    } else {
        // Should ideally return default or empty if no settings saved
        res.status(404).json({ message: "Configurações de localização não encontradas (simulado)." });
    }
};

module.exports = {
    getAllCampaigns,
    createCampaign,
    getCampaignById,
    updateCampaignStatus,
    getCampaignMetrics,
    saveLocationSettings,
    getLocationSettings,
};

