const MenuItem = require("../models/MenuItem"); // Assuming model is defined

// Simulated in-memory storage for menu items (replace with DB interaction later)
let simulatedMenu = [
    { _id: "sim_menu_1", name: "Hambúrguer Clássico", price: 25.50, category: "Hambúrgueres", owner: "sim_test_user_123", imageUrl: "https://via.placeholder.com/150x100.png?text=Hambúrguer" },
    { _id: "sim_menu_2", name: "Batata Frita", price: 12.00, category: "Acompanhamentos", owner: "sim_test_user_123", imageUrl: "https://via.placeholder.com/150x100.png?text=Batata+Frita" },
    { _id: "sim_menu_3", name: "Refrigerante Lata", price: 5.00, category: "Bebidas", owner: "sim_test_user_123", imageUrl: "https://via.placeholder.com/150x100.png?text=Refrigerante" },
];

// @desc    Get all menu items for the logged-in user (Simulated)
// @route   GET /api/menu
// @access  Private (Placeholder)
const getAllMenuItems = async (req, res) => {
    // In real app, get owner ID from req.user (set by protect middleware)
    const ownerId = "sim_test_user_123"; 
    console.log("Simulating fetching all menu items for owner:", ownerId);

    // Simulate fetching items for the user
    const userMenu = simulatedMenu.filter(item => item.owner === ownerId);
    
    res.json(userMenu);
};

// @desc    Add a new menu item (Simulated)
// @route   POST /api/menu
// @access  Private (Placeholder)
const addMenuItem = async (req, res) => {
    const { name, description, price, category, imageUrl } = req.body;
    const ownerId = "sim_test_user_123"; // Get from token later

    console.log("Simulating adding menu item for owner:", ownerId);

    // Simulate basic validation
    if (!name || !price) {
        return res.status(400).json({ message: "Nome e preço são obrigatórios." });
    }

    // Simulate creating new item
    const newItem = {
        _id: `sim_menu_${Date.now()}`,
        name,
        description,
        price,
        category,
        imageUrl: imageUrl || "https://via.placeholder.com/150x100.png?text=Novo+Item",
        owner: ownerId,
    };
    simulatedMenu.push(newItem);
    console.log("Simulated item added:", newItem);

    res.status(201).json(newItem);
};

// @desc    Get a specific menu item by ID (Simulated)
// @route   GET /api/menu/:id
// @access  Private (Placeholder)
const getMenuItemById = async (req, res) => {
    const itemId = req.params.id;
    const ownerId = "sim_test_user_123"; // Get from token later
    console.log(`Simulating fetching menu item ${itemId} for owner ${ownerId}`);

    // Simulate finding the item
    const item = simulatedMenu.find(i => i._id === itemId && i.owner === ownerId);

    if (item) {
        res.json(item);
    } else {
        res.status(404).json({ message: "Item do cardápio não encontrado (simulado)." });
    }
};

// @desc    Update a menu item (Simulated)
// @route   PUT /api/menu/:id
// @access  Private (Placeholder)
const updateMenuItem = async (req, res) => {
    const itemId = req.params.id;
    const ownerId = "sim_test_user_123"; // Get from token later
    const updates = req.body;
    console.log(`Simulating updating menu item ${itemId} for owner ${ownerId} with data:`, updates);

    // Simulate finding and updating the item
    const itemIndex = simulatedMenu.findIndex(i => i._id === itemId && i.owner === ownerId);

    if (itemIndex !== -1) {
        simulatedMenu[itemIndex] = { ...simulatedMenu[itemIndex], ...updates };
        console.log("Simulated item updated:", simulatedMenu[itemIndex]);
        res.json(simulatedMenu[itemIndex]);
    } else {
        res.status(404).json({ message: "Item do cardápio não encontrado (simulado)." });
    }
};

// @desc    Delete a menu item (Simulated)
// @route   DELETE /api/menu/:id
// @access  Private (Placeholder)
const deleteMenuItem = async (req, res) => {
    const itemId = req.params.id;
    const ownerId = "sim_test_user_123"; // Get from token later
    console.log(`Simulating deleting menu item ${itemId} for owner ${ownerId}`);

    // Simulate finding and deleting the item
    const initialLength = simulatedMenu.length;
    simulatedMenu = simulatedMenu.filter(i => !(i._id === itemId && i.owner === ownerId));

    if (simulatedMenu.length < initialLength) {
        console.log("Simulated item deleted.");
        res.json({ message: "Item do cardápio removido com sucesso (simulado)." });
    } else {
        res.status(404).json({ message: "Item do cardápio não encontrado (simulado)." });
    }
};

module.exports = {
    getAllMenuItems,
    addMenuItem,
    getMenuItemById,
    updateMenuItem,
    deleteMenuItem,
};

