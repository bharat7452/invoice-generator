const express = require('express');
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const ALLOWED = ['number', 'customer', 'issueDate', 'dueDate', 'items', 'taxPercent', 'discount', 'notes', 'status'];
const pick = (body) => Object.fromEntries(ALLOWED.filter((k) => k in body).map((k) => [k, body[k]]));

// Next invoice number like INV-0001
async function nextNumber(owner) {
  const count = await Invoice.countDocuments({ owner });
  let n = count + 1;
  // skip over numbers already used (in case of deletions)
  while (await Invoice.exists({ owner, number: `INV-${String(n).padStart(4, '0')}` })) n++;
  return `INV-${String(n).padStart(4, '0')}`;
}

// Dashboard stats using the aggregation pipeline
router.get('/stats', async (req, res) => {
  const owner = new mongoose.Types.ObjectId(req.session.userId);
  const now = new Date();
  const [byStatus, overdue, monthly] = await Promise.all([
    Invoice.aggregate([
      { $match: { owner } },
      { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$total' } } },
    ]),
    Invoice.aggregate([
      { $match: { owner, status: { $ne: 'paid' }, dueDate: { $lt: now } } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$total' } } },
    ]),
    Invoice.aggregate([
      { $match: { owner, status: 'paid' } },
      {
        $group: {
          _id: { y: { $year: '$issueDate' }, m: { $month: '$issueDate' } },
          amount: { $sum: '$total' },
        },
      },
      { $sort: { '_id.y': -1, '_id.m': -1 } },
      { $limit: 6 },
    ]),
  ]);
  const stats = { draft: { count: 0, amount: 0 }, sent: { count: 0, amount: 0 }, paid: { count: 0, amount: 0 } };
  byStatus.forEach((s) => (stats[s._id] = { count: s.count, amount: s.amount }));
  res.json({
    ...stats,
    overdue: overdue[0] ? { count: overdue[0].count, amount: overdue[0].amount } : { count: 0, amount: 0 },
    monthlyRevenue: monthly.reverse().map((m) => ({ year: m._id.y, month: m._id.m, amount: m.amount })),
  });
});

// List with search, status filter, sort and pagination
router.get('/', async (req, res) => {
  const { status, q, sort = '-createdAt', page = 1, limit = 50 } = req.query;
  const filter = { owner: req.session.userId };
  if (['draft', 'sent', 'paid'].includes(status)) filter.status = status;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ number: rx }, { 'customer.name': rx }];
  }
  const allowedSort = ['createdAt', '-createdAt', 'total', '-total', 'dueDate', '-dueDate'];
  const invoices = await Invoice.find(filter)
    .sort(allowedSort.includes(sort) ? sort : '-createdAt')
    .skip((Number(page) - 1) * Number(limit))
    .limit(Math.min(Number(limit), 100));
  res.json(invoices);
});

router.get('/next-number', async (req, res) => {
  res.json({ number: await nextNumber(req.session.userId) });
});

router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Invoice not found' });
  const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.session.userId });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json(invoice);
});

router.post('/', async (req, res) => {
  try {
    const data = pick(req.body);
    if (!data.number) data.number = await nextNumber(req.session.userId);
    const invoice = await Invoice.create({ ...data, owner: req.session.userId });
    res.status(201).json(invoice);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Invoice number already exists' });
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Invoice not found' });
    const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.session.userId });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    invoice.set(pick(req.body));
    await invoice.save(); // runs the total recalculation
    res.json(invoice);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Invoice number already exists' });
    res.status(400).json({ error: err.message });
  }
});

// Quick status change (draft -> sent -> paid)
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['draft', 'sent', 'paid'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Invoice not found' });
  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.id, owner: req.session.userId },
    { status },
    { new: true }
  );
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json(invoice);
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Invoice not found' });
  const result = await Invoice.deleteOne({ _id: req.params.id, owner: req.session.userId });
  if (!result.deletedCount) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ ok: true });
});

module.exports = router;
