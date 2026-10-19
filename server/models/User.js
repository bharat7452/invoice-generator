const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    business: {
      name: { type: String, default: '' },
      address: { type: String, default: '' },
      phone: { type: String, default: '' },
      gstin: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
