import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money, fmtDate } from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Re-fetch when filters change (debounced for the search box)
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams({ sort });
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      setLoading(true);
      api
        .get('/invoices?' + params)
        .then(setInvoices)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q, status, sort]);

  const remove = async (inv) => {
    if (!window.confirm(`Delete ${inv.number}? This cannot be undone.`)) return;
    try {
      await api.del(`/invoices/${inv._id}`);
      setInvoices((list) => list.filter((i) => i._id !== inv._id));
    } catch (e) {
      setError(e.message);
    }
  };

  const markPaid = async (inv) => {
    const updated = await api.patch(`/invoices/${inv._id}/status`, { status: 'paid' });
    setInvoices((list) => list.map((i) => (i._id === inv._id ? updated : i)));
  };

  return (
    <>
      <div className="page-head">
        <h2>Invoices</h2>
        <Link to="/invoices/new" className="btn primary">+ New invoice</Link>
      </div>

      <div className="filters">
        <input placeholder="Search by number or customer…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="-createdAt">Newest first</option>
          <option value="createdAt">Oldest first</option>
          <option value="-total">Highest amount</option>
          <option value="total">Lowest amount</option>
          <option value="dueDate">Due soonest</option>
        </select>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="card table-wrap">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : invoices.length === 0 ? (
          <p className="muted">No invoices found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Number</th><th>Customer</th><th>Issued</th><th>Due</th>
                <th className="right">Total</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id}>
                  <td><Link to={`/invoices/${inv._id}`}>{inv.number}</Link></td>
                  <td>{inv.customer.name}</td>
                  <td>{fmtDate(inv.issueDate)}</td>
                  <td>{fmtDate(inv.dueDate)}</td>
                  <td className="right">{money(inv.total)}</td>
                  <td><StatusBadge invoice={inv} /></td>
                  <td className="actions">
                    {inv.status !== 'paid' && <button className="btn small" onClick={() => markPaid(inv)}>Mark paid</button>}
                    <Link className="btn small ghost" to={`/invoices/${inv._id}/edit`}>Edit</Link>
                    <button className="btn small danger" onClick={() => remove(inv)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
