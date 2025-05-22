const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');

// @desc    Registrar um novo usuário
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, restaurantName, businessType } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Por favor, preencha todos os campos obrigatórios');
  }

  // Verificar se o usuário já existe
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('Usuário já cadastrado com este e-mail');
  }

  // Criar hash da senha
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Criar usuário
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    restaurantName,
    businessType,
    metaConnectionStatus: 'disconnected'
  });

  if (user) {
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      restaurantName: user.restaurantName,
      businessType: user.businessType,
      metaConnectionStatus: user.metaConnectionStatus,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Dados de usuário inválidos');
  }
});

// @desc    Autenticar usuário / login
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Verificar email e senha
  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      restaurantName: user.restaurantName,
      businessType: user.businessType,
      metaUserId: user.metaId || '',
      metaConnectionStatus: user.metaConnectionStatus || 'disconnected',
      plan: user.plan || 'free',
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('Email ou senha inválidos');
  }
});

// @desc    Atualizar status de conexão Meta
// @route   POST /api/auth/meta-connect
// @access  Private
const updateMetaConnection = asyncHandler(async (req, res) => {
  const { userId, connected } = req.body;

  if (!userId) {
    res.status(400);
    throw new Error('ID do usuário é obrigatório');
  }

  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('Usuário não encontrado');
  }

  user.metaConnectionStatus = connected ? 'connected' : 'disconnected';
  await user.save();

  res.json({
    success: true,
    metaConnectionStatus: user.metaConnectionStatus
  });
});

// Gerar JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = {
  registerUser,
  loginUser,
  updateMetaConnection
};
