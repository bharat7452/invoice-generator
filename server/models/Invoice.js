const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    number: { type: String, required: true },
    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, default: '', trim: true },
      address: { type: String, default: '' },
    },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    items: {
      type: [itemSchema],
      validate: [(v) => v.length > 0, 'At least one item is required'],
    },
    taxPercent: { type: Number, default: 0, min: 0, max: 100 },
    discount: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'sent', 'paid'], default: 'draft' },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// A user's invoice numbers must be unique for that user.
invoiceSchema.index({ owner: 1, number: 1 }, { unique: true });

// Totals are always calculated on the server so they can't be tampered with.
invoiceSchema.pre('validate', function (next) {
  const round = (n) => Math.round(n * 100) / 100;
  this.subtotal = round(this.items.reduce((s, i) => s + i.quantity * i.rate, 0));
  const taxable = Math.max(this.subtotal - (this.discount || 0), 0);
  this.tax = round((taxable * (this.taxPercent || 0)) / 100);
  this.total = round(taxable + this.tax);
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
