const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Gera um token JWT válido por 7 dias
const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// --------- LOGIN ----------
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      }
    });
  } catch (err) {
    console.error("❌ Erro no login:", err);
    res.status(500).json({ message: "Erro ao autenticar usuário" });
  }
};

// --------- REGISTRO ----------
exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email já cadastrado" });
    }

    const newUser = new User({ name, email, password });
    await newUser.save();

    const token = generateToken(newUser._id);

    res.status(201).json({
      token,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email
      }
    });
  } catch (err) {
    console.error("❌ Erro ao registrar:", err);
    res.status(500).json({ message: "Erro ao registrar usuário" });
  }
};
