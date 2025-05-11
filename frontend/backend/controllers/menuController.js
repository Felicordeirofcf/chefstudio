const MenuItem = require("../models/MenuItem");
const mongoose = require("mongoose");

// @desc    Get all menu items
// @route   GET /api/menu
// @access  Public (temporarily, until auth is fully enforced)
const getAllMenuItems = async (req, res) => {
  try {
    const menuItems = await MenuItem.find({}); // Fetches all items for now
    res.json(menuItems);
  } catch (error) {
    console.error("Erro ao buscar itens do cardápio:", error);
    res.status(500).json({ message: "Erro interno do servidor ao buscar itens do cardápio." });
  }
};

// @desc    Add a new menu item
// @route   POST /api/menu
// @access  Private (once protect middleware is active)
const addMenuItem = async (req, res) => {
  const { name, description, price, category, imageUrl } = req.body;
  const ownerId = req.user?.id || null;

  if (!name || price === undefined) {
    return res.status(400).json({ message: "Nome e preço são obrigatórios." });
  }

  try {
    const newItem = new MenuItem({
      name,
      description,
      price,
      category,
      imageUrl,
      // ownerId, // Descomente quando o 'protect' estiver ativo e ownerId for obrigatório
    });
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (error) {
    console.error("Erro ao adicionar item ao cardápio:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: "Erro de validação", errors: error.errors });
    }
    res.status(500).json({ message: "Erro interno do servidor ao adicionar item ao cardápio." });
  }
};

// @desc    Get a menu item by ID
// @route   GET /api/menu/:id
// @access  Public (temporarily)
const getMenuItemById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID de item inválido." });
    }
    const menuItem = await MenuItem.findById(req.params.id);
    if (menuItem) {
      res.json(menuItem);
    } else {
      res.status(404).json({ message: "Item do cardápio não encontrado." });
    }
  } catch (error) {
    console.error("Erro ao buscar item do cardápio por ID:", error);
    res.status(500).json({ message: "Erro interno do servidor ao buscar item do cardápio." });
  }
};

// @desc    Update a menu item
// @route   PUT /api/menu/:id
// @access  Private (once protect middleware is active)
const updateMenuItem = async (req, res) => {
  const { name, description, price, category, imageUrl } = req.body;
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID de item inválido." });
    }
    const menuItem = await MenuItem.findById(req.params.id);

    if (menuItem) {
      // Adicionar verificação de proprietário aqui se necessário, quando auth estiver completo
      // if (menuItem.ownerId && menuItem.ownerId.toString() !== req.user.id) {
      //   return res.status(401).json({ message: "Não autorizado a atualizar este item." });
      // }

      menuItem.name = name || menuItem.name;
      menuItem.description = description || menuItem.description;
      menuItem.price = price !== undefined ? price : menuItem.price;
      menuItem.category = category || menuItem.category;
      menuItem.imageUrl = imageUrl || menuItem.imageUrl;

      const updatedItem = await menuItem.save();
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "Item do cardápio não encontrado para atualização." });
    }
  } catch (error) {
    console.error("Erro ao atualizar item do cardápio:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: "Erro de validação", errors: error.errors });
    }
    res.status(500).json({ message: "Erro interno do servidor ao atualizar item do cardápio." });
  }
};

// @desc    Delete a menu item
// @route   DELETE /api/menu/:id
// @access  Private (once protect middleware is active)
const deleteMenuItem = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID de item inválido." });
    }
    const menuItem = await MenuItem.findById(req.params.id);

    if (menuItem) {
      // Adicionar verificação de proprietário aqui se necessário
      // if (menuItem.ownerId && menuItem.ownerId.toString() !== req.user.id) {
      //   return res.status(401).json({ message: "Não autorizado a deletar este item." });
      // }
      await menuItem.deleteOne(); // Usar deleteOne() ou remove() dependendo da versão do Mongoose
      res.json({ message: "Item do cardápio removido com sucesso." });
    } else {
      res.status(404).json({ message: "Item do cardápio não encontrado para remoção." });
    }
  } catch (error) {
    console.error("Erro ao remover item do cardápio:", error);
    res.status(500).json({ message: "Erro interno do servidor ao remover item do cardápio." });
  }
};

module.exports = { 
  getAllMenuItems, 
  addMenuItem, 
  getMenuItemById, 
  updateMenuItem, 
  deleteMenuItem 
};

