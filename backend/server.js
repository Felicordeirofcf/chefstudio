require("dotenv").config(); // Carrega variáveis do .env

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const swaggerUi = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");

// Rotas
const authRoutes = require("./routes/authRoutes");
const adRoutes = require("./routes/adRoutes");
const metaRoutes = require("./routes/metaRoutes");
const menuRoutes = require("./routes/menuRoutes");

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/chefia_studio_db";
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// -------------------- 🔗 MongoDB --------------------

mongoose.connect(MONGO_URI)
  .then(() => console.log("🟢 MongoDB conectado com sucesso"))
  .catch(err => console.error("🟡 Erro ao conectar com o MongoDB:", err));

// -------------------- 📘 Swagger --------------------

const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "ChefiaStudio API",
      version: "1.0.0",
      description: "Documentação interativa da API ChefiaStudio"
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    security: [{ bearerAuth: [] }],
    servers: [{ url: BASE_URL }]
  },
  apis: ["./routes/*.js"]
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// -------------------- 🌐 CORS --------------------

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://chefstudio.vercel.app"
  ],
  credentials: true
}));

// -------------------- 🔧 Middlewares --------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------------------- 🚀 Rotas da API --------------------

app.use("/api/auth", authRoutes);
app.use("/api/ads", adRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/menu", menuRoutes);

// -------------------- ✅ Endpoints de verificação --------------------

app.get("/", (req, res) => {
  res.send("🚀 API online. Acesse <a href='/api-docs'>/api-docs</a> para a documentação.");
});

app.get("/api", (req, res) => {
  res.json({ message: "✅ API ChefiaStudio rodando!" });
});

// -------------------- ❌ Tratamento de 404 --------------------

app.use((req, res) => {
  res.status(404).json({ message: "Rota não encontrada" });
});

// -------------------- ❌ Erro interno genérico --------------------

app.use((err, req, res, next) => {
  console.error("❌ Erro interno:", err.stack);
  res.status(500).json({ message: "Erro interno no servidor" });
});

// -------------------- 🚀 Inicialização --------------------

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend rodando em ${BASE_URL}`);
  console.log(`📘 Swagger disponível em ${BASE_URL}/api-docs`);
});
