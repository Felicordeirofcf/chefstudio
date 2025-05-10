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

// ✅ Mongo URI segura
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://<username>:<password>@cluster0.hebh3d1.mongodb.net/chefia_studio_db?retryWrites=true&w=majority&appName=Cluster0";

// BASE_URL dinâmica
const BASE_URL = process.env.BASE_URL || (process.env.NODE_ENV === "production"
  ? "https://chefstudio-production.up.railway.app"
  : `http://localhost:${PORT}`);

// -------------------- 🔗 MongoDB --------------------
// A conexão com MongoDB agora será verificada
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("🟢 MongoDB conectado com sucesso"))
  .catch(err => {
    console.error("🟡 Erro ao conectar com o MongoDB:", err);
    process.exit(1); // Finaliza a aplicação em caso de erro na conexão
  });

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
    security: [{ bearerAuth: [] }], // Garantindo que a autenticação esteja configurada para todas as rotas
    servers: [{ url: BASE_URL }]
  },
  apis: ["./routes/*.js"] // Garantir que as rotas de documentação estão no lugar correto
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// -------------------- 🌐 CORS --------------------
const allowedOrigins = [
  "http://localhost:5173", 
  "https://chefstudio.vercel.app",
  "https://chefstudio-production.up.railway.app"
];

app.use(cors({
  origin: allowedOrigins,
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

// -------------------- ✅ Endpoint de verificação --------------------
app.get("/", (req, res) => {
  res.send("🚀 API online. Acesse <a href='/api-docs'>/api-docs</a> para a documentação.");
});

app.get("/api", (req, res) => {
  res.json({ message: "✅ API ChefiaStudio rodando!" });
});

// -------------------- ❌ 404 --------------------
app.use((req, res) => {
  res.status(404).json({ message: "Rota não encontrada" });
});

// -------------------- ❌ Erro interno --------------------
app.use((err, req, res, next) => {
  console.error("❌ Erro interno:", err.stack);
  res.status(500).json({ message: "Erro interno no servidor" });
});

// -------------------- 🚀 Inicialização --------------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend rodando em ${BASE_URL}`);
  console.log(`📘 Swagger disponível em ${BASE_URL}/api-docs`);
});
