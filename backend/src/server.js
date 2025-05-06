require("dotenv").config(); // Load environment variables from .env file
const express = require("express");
const cors = require("cors");
// const mongoose = require("mongoose"); // Connection will be set up later

// Import routes (will be created next)
const authRoutes = require("./routes/authRoutes");
const menuRoutes = require("./routes/menuRoutes");
const adRoutes = require("./routes/adRoutes");
const metaRoutes = require("./routes/metaRoutes");

const app = express();
const PORT = process.env.PORT || 3001; // Use port from env or default to 3001

// --- Database Connection (Placeholder) ---
/*
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/chefia_studio_db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected successfully."))
.catch(err => console.error("MongoDB connection error:", err));
*/
console.log("MongoDB connection setup is commented out for now (simulation mode).");

// --- Middleware ---
const allowedOrigins = [
  'http://localhost:5173',
  'https://bvzvwkhj.manus.space'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// --- API Routes ---
app.get("/api", (req, res) => {
  res.json({ message: "Welcome to ChefiaStudio Backend API (Simulated)" });
});

app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/ads", adRoutes);
app.use("/api/meta", metaRoutes);

// --- Error Handling Middleware (Basic) ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
