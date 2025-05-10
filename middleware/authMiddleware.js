const jwt = require("jsonwebtoken");
const User = require("../models/User");

// -------------------- 🔒 Middleware de autenticação --------------------

exports.protect = async (req, res, next) => {
  try {
    // Verifica se o cabeçalho Authorization está presente
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Token JWT ausente ou malformado no cabeçalho Authorization.",
      });
    }

    // Extrai o token
    const token = authHeader.split(" ")[1];

    // Verifica e decodifica o token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        message: "Token inválido ou expirado.",
        error: error.message,
      });
    }

    // Verifica se o usuário existe no banco de dados
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({
        message: "Usuário associado ao token não encontrado no banco de dados.",
      });
    }

    // Injeta o usuário na requisição para uso nas próximas etapas
    req.user = user;

    // Passa para a próxima função de middleware ou rota
    next();
  } catch (err) {
    console.error("❌ Erro ao verificar token JWT:", err);
    return res.status(500).json({
      message: "Erro interno na autenticação.",
      error: err.message,
    });
  }
};
