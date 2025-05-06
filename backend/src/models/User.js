const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  // Fields from mockup/registration form
  restaurantName: { type: String },
  businessType: { type: String },
  address: { type: String },
  whatsapp: { type: String },
  menuLink: { type: String },
  // Subscription details (simplified)
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'trial'],
    default: 'inactive',
  },
  subscriptionEndDate: { type: Date },
  // Meta Ads Tokens (simplified - store securely in real app)
  metaAccessToken: { type: String },
  metaRefreshToken: { type: String }, // If applicable
  metaConnectionStatus: {
    type: String,
    enum: ['connected', 'disconnected'],
    default: 'disconnected',
  },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

