const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  price: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
  },
  imageUrl: {
    type: String, // In real app, this might point to S3 or similar
    default: "https://via.placeholder.com/150x100.png?text=Item+Sem+Imagem", // Placeholder
  },
  // Reference to the user who owns this item
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("MenuItem", menuItemSchema);

