import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, money, toInputDate } from '../api.js';

const emptyItem = { description: '', quantity: 1, rate: 0 };

const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toInputDate(d);
};

export default function InvoiceForm() {
  const { id } = useParams(); // present when editing
  const navigate = useNavigate();
  const [form, setForm] = useState({
    number: '',
    customer: { name: '', email: '', address: '' },
    issueDate: toInputDate(new Date()),
    dueDate: addDays(15),
    items: [{ ...emptyItem }],
    taxPercent: 18,
    discount: 0,
    notes: '',
    status: 'draft',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Load existing invoice, or the next invoice number for a new one
  useEffect(() => {
    if (id) {
      api
        .get(`/invoices/${id}`)
        .then((inv) =>
          setForm({
            ...inv,
            issueDate: toInputDate(inv.issueDate),
            dueDate: toInputDate(inv.dueDate),
          })
        )
        .catch((e) => setError(e.message));
    } else {
      api.get('/invoices/next-number').then((r) => setForm((f) => ({ ...f, number: r.number })));
    }
  }, [id]);

  // Live totals preview (the server recalculates them on save)
  const totals = useMemo(() => {
    const subtotal = form.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0);
    const taxable = Math.max(subtotal - (Number(form.discount) || 0), 0);
    const tax = (taxable * (Number(form.taxPercent) || 0)) / 100;
    return { subtotal, tax, total: taxable + tax };
  }, [form.items, form.discount, form.taxPercent]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const setCustomer = (field, value) => setForm((f) => ({ ...f, customer: { ...f.customer, [field]: value } }));
  const setItem = (index, field, value) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === index ? { ...it, [field]: value } : it)) }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  const removeItem = (index) =>
    setForm((f) => ({ ...f, items: f.items.length > 1 ? f.items.filter((_, i) => i !== index) : f.items }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      number: form.number,
      customer: form.customer,
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      items: form.items.map((i) => ({ description: i.description, quantity: Number(i.quantity), rate: Number(i.rate) })),
      taxPercent: Number(form.taxPercent),
      discount: Number(form.discount),
      notes: form.notes,
      status: form.status,
    };
    try {
      const saved = id ? await api.put(`/invoices/${id}`, payload) : await api.post('/invoices', payload);
      navigate(`/invoices/${saved._id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="page-head">
        <h2>{id ? 'Edit invoice' : 'New invoice'}</h2>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="grid two">
        <section className="card">
          <h3>Customer</h3>
          <label>Name
            <input value={form.customer.name} onChange={(e) => setCustomer('name', e.target.value)} required />
          </label>
          <label>Email
            <input type="email" value={form.customer.email} onChange={(e) => setCustomer('email', e.target.value)} />
          </label>
          <label>Address
            <textarea rows={3} value={form.customer.address} onChange={(e) => setCustomer('address', e.target.value)} />
          </label>
        </section>

        <section className="card">
          <h3>Details</h3>
          <label>Invoice number
            <input value={form.number} onChange={(e) => set('number', e.target.value)} required />
          </label>
          <div className="row">
            <label>Issue date
              <input type="date" value={form.issueDate} onChange={(e) => set('issueDate', e.target.value)} required />
            </label>
            <label>Due date
              <input type="date" value={form.dueDate} min={form.issueDate} onChange={(e) => set('dueDate', e.target.value)} required />
            </label>
          </div>
          <label>Status
            <select value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
            </select>
          </label>
        </section>
      </div>

      <section className="card">
        <h3>Items</h3>
        <div className="items-head">
          <span>Description</span><span>Qty</span><span>Rate (₹)</span><span className="right">Amount</span><span />
        </div>
        {form.items.map((item, i) => (
          <div className="item-row" key={i}>
            <input placeholder="Item or service" value={item.description} onChange={(e) => setItem(i, 'description', e.target.value)} required />
            <input type="number" min="0" step="any" value={item.quantity} onChange={(e) => setItem(i, 'quantity', e.target.value)} required />
            <input type="number" min="0" step="any" value={item.rate} onChange={(e) => setItem(i, 'rate', e.target.value)} required />
            <span className="right">{money((Number(item.quantity) || 0) * (Number(item.rate) || 0))}</span>
            <button type="button" className="btn small danger" onClick={() => removeItem(i)} disabled={form.items.length === 1} aria-label="Remove item">✕</button>
          </div>
        ))}
        <button type="button" className="btn small" onClick={addItem}>+ Add item</button>
      </section>

      <div className="grid two">
        <section className="card">
          <h3>Notes</h3>
          <textarea rows={4} placeholder="Payment terms, bank details, thank-you note…" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </section>

        <section className="card totals">
          <div className="row">
            <label>Discount (₹)
              <input type="number" min="0" step="any" value={form.discount} onChange={(e) => set('discount', e.target.value)} />
            </label>
            <label>Tax / GST (%)
              <input type="number" min="0" max="100" step="any" value={form.taxPercent} onChange={(e) => set('taxPercent', e.target.value)} />
            </label>
          </div>
          <div className="line"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
          <div className="line"><span>Tax</span><span>{money(totals.tax)}</span></div>
          <div className="line grand"><span>Total</span><span>{money(totals.total)}</span></div>
        </section>
      </div>

      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={() => navigate(-1)}>Cancel</button>
        <button className="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save invoice'}</button>
      </div>
    </form>
  );
}
