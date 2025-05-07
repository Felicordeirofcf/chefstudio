require("dotenv").config(); // Carrega variáveis do arquivo .env

const express = require("express");
const cors = require("cors");
const bcrypt = require('bcryptjs');
// const mongoose = require("mongoose"); // Descomente quando quiser conectar ao MongoDB

// Importa rotas
const authRoutes = require("./routes/authRoutes");
const menuRoutes = require("./routes/menuRoutes");
const adRoutes = require("./routes/adRoutes");
const metaRoutes = require("./routes/metaRoutes");


const app = express();
const PORT = process.env.PORT || 3001;

// --- Conexão com MongoDB (comentada) ---
// Descomente para ativar conexão com banco
/*
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/chefia_studio_db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB conectado com sucesso"))
.catch(err => console.error("❌ Erro ao conectar com MongoDB:", err));
*/
console.log("🟡 MongoDB não conectado (modo simulado)");

// --- Middleware ---
const allowedOrigins = [
  'http://localhost:5173',
  'https://bvzvwkhj.manus.space'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('❌ Origin not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Rotas da API ---
app.get("/api", (req, res) => {
  res.json({ message: "✅ ChefiaStudio Backend API ativa" });
});

app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/ads", adRoutes);
app.use("/api/meta", metaRoutes);

// --- Middleware de Erro ---
app.use((err, req, res, next) => {
  console.error("❌ Erro:", err.stack);
  res.status(500).send("Erro interno no servidor");
});

// --- Inicialização do servidor ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
