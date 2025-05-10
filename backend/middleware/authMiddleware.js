const jwt = require("jsonwebtoken");
const User = require("../models/User");

// -------------------- 🔒 Middleware de autenticação --------------------

exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 🔍 Verifica se o header contém "Bearer <token>"
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Token JWT ausente ou malformado no cabeçalho Authorization.",
      });
    }

    // 📦 Extrai o token
    const token = authHeader.split(" ")[1];

    // 🧠 Verifica e decodifica o token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        message: "Token inválido ou expirado.",
        error: error.message,
      });
    }

    // 🔎 Busca o usuário no banco de dados
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "Usuário associado ao token não encontrado no banco de dados.",
      });
    }

    // ✅ Injeta o usuário na requisição para uso futuro
    req.user = user;
    next();
  } catch (err) {
    console.error("❌ Erro ao verificar token JWT:", err);
    return res.status(500).json({
      message: "Erro interno na autenticação.",
      error: err.message,
    });
  }
};
