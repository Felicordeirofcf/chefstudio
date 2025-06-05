const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/user");

// Função para gerar token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// Login de usuário
exports.loginUser = async (req, res) => {
  try {
    console.log("📝 Tentativa de login:", { email: req.body.email });

    const { email, password } = req.body;

    // Validação básica
    if (!email || !password) {
      console.log("❌ Login falhou: Email ou senha não fornecidos");
      return res.status(400).json({ message: "Email e senha são obrigatórios" });
    }

    // Buscar usuário pelo email
    const user = await User.findOne({ email });

    if (!user) {
      console.log("❌ Login falhou: Usuário não encontrado");
      return res.status(401).json({ message: "Email ou senha incorretos" });
    }

    // Verificar senha
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      console.log("❌ Login falhou: Senha incorreta");
      return res.status(401).json({ message: "Email ou senha incorretos" });
    }

    // Gerar token JWT
    const token = generateToken(user._id);

    console.log("✅ Login bem-sucedido:", { userId: user._id });

    // Retornar dados do usuário e token (usando campos meta* padronizados)
    res.json({
      token,
      _id: user._id,
      name: user.name,
      email: user.email,
      // Retorna os campos meta* do modelo, que são a fonte da verdade
      metaUserId: user.metaUserId,
      metaConnectionStatus: user.metaConnectionStatus || "disconnected",
    });
  } catch (err) {
    console.error("❌ Erro ao fazer login:", err);
    res.status(500).json({ message: "Erro ao fazer login" });
  }
};

// Registro de novo usuário
exports.registerUser = async (req, res) => {
  try {
    console.log("📝 Tentativa de registro:", { email: req.body.email, name: req.body.name });

    const { name, email, password } = req.body;

    // Validação básica
    if (!name || !email || !password) {
      console.log("❌ Registro falhou: Campos obrigatórios ausentes");
      return res.status(400).json({ message: "Nome, email e senha são obrigatórios" });
    }

    // Verificar se o email já existe
    const userExists = await User.findOne({ email });

    if (userExists) {
      console.log("❌ Registro falhou: Email já cadastrado");
      return res.status(400).json({ message: "Email já cadastrado" });
    }

    // Criptografando a senha antes de salvar
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar novo usuário
    const newUser = new User({
      name,
      email,
      password: hashedPassword
      // metaConnectionStatus já tem default "disconnected" no modelo
    });

    // Salvar usuário no banco de dados
    await newUser.save();

    // Gerar token JWT
    const token = generateToken(newUser._id);

    console.log("✅ Registro bem-sucedido:", { userId: newUser._id });

    // Retornar dados do usuário e token (usando campos meta* padronizados)
    res.status(201).json({
      token,
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      // Retorna os campos meta* do modelo (serão null/disconnected inicialmente)
      metaUserId: newUser.metaUserId,
      metaConnectionStatus: newUser.metaConnectionStatus || "disconnected",
    });
  } catch (err) {
    console.error("❌ Erro ao registrar:", err);
    if (err.name === "ValidationError") {
      const errors = {};
      for (const field in err.errors) {
        errors[field] = err.errors[field].message;
      }
      return res.status(400).json({ message: "Erro de validação", errors });
    }
    if (err.code === 11000) {
      return res.status(400).json({ message: "Email já cadastrado" });
    }
    res.status(500).json({ message: "Erro ao registrar usuário" });
  }
};

// Perfil do usuário autenticado
exports.getProfile = async (req, res) => {
  try {
    // req.user é populado pelo middleware protect
    const user = req.user;
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

    // Retorna os dados do usuário, incluindo os campos meta* padronizados
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      metaUserId: user.metaUserId,
      metaConnectionStatus: user.metaConnectionStatus || "disconnected",
      plan: user.plan || null,
      // Incluir outros campos relevantes se necessário
      establishmentName: user.establishmentName,
      businessType: user.businessType,
      whatsapp: user.whatsapp,
      menuLink: user.menuLink,
      address: user.address,
      cep: user.cep,
    });
  } catch (err) {
    console.error("❌ Erro ao buscar perfil:", err);
    res.status(500).json({ message: "Erro ao buscar perfil do usuário" });
  }
};

// REMOVIDO: facebookCallback - Lógica movida para metaController.js
// REMOVIDO: facebookLogout - Lógica movida para metaController.js

