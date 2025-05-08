const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware de autenticação via JWT
exports.protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Verifica se o header contém "Bearer <token>"
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token JWT ausente ou malformado no cabeçalho" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Valida e decodifica o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Busca o usuário no banco de dados
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Usuário associado ao token não encontrado" });
    }

    // Injeta o usuário na requisição para uso nas rotas protegidas
    req.user = user;
    next();
  } catch (err) {
    console.error("❌ Erro ao verificar token JWT:", err.message);
    res.status(401).json({ message: "Token JWT inválido ou expirado" });
  }
};
