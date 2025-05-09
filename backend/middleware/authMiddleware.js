const jwt = require("jsonwebtoken");
const User = require("../models/User");

// -------------------- 🔒 Middleware de autenticação --------------------

exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 🔍 Verifica se o header contém "Bearer <token>"
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token JWT ausente ou malformado no cabeçalho." });
    }

    // 📦 Extrai o token
    const token = authHeader.split(" ")[1];

    // 🧠 Verifica e decodifica o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔎 Busca o usuário no banco de dados
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Usuário associado ao token não foi encontrado." });
    }

    // ✅ Injeta o usuário na requisição
    req.user = user;
    next();
  } catch (err) {
    console.error("❌ Erro ao verificar token JWT:", err.message);
    return res.status(401).json({ message: "Token JWT inválido ou expirado." });
  }
};
