import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, money, fmtDate } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

export default function InvoiceView() {
  const { id } = useParams();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/invoices/${id}`).then(setInvoice).catch((e) => setError(e.message));
  }, [id]);

  const setStatus = async (status) => setInvoice(await api.patch(`/invoices/${id}/status`, { status }));

  if (error) return <div className="alert">{error}</div>;
  if (!invoice) return <p className="muted">Loading…</p>;

  const biz = user.business || {};

  return (
    <>
      <div className="page-head no-print">
        <h2>{invoice.number}</h2>
        <div className="actions">
          {invoice.status === 'draft' && <button className="btn" onClick={() => setStatus('sent')}>Mark as sent</button>}
          {invoice.status !== 'paid' && <button className="btn" onClick={() => setStatus('paid')}>Mark as paid</button>}
          <Link className="btn ghost" to={`/invoices/${id}/edit`}>Edit</Link>
          <button className="btn primary" onClick={() => window.print()}>Print / Save PDF</button>
        </div>
      </div>

      <article className="card invoice-doc">
        <header className="doc-head">
          <div>
            <h1>{biz.name || user.name}</h1>
            {biz.address && <p className="pre">{biz.address}</p>}
            {biz.phone && <p>Phone: {biz.phone}</p>}
            {biz.gstin && <p>GSTIN: {biz.gstin}</p>}
          </div>
          <div className="right">
            <h2 className="doc-title">INVOICE</h2>
            <p><strong>{invoice.number}</strong></p>
            <StatusBadge invoice={invoice} />
          </div>
        </header>

        <section className="doc-meta">
          <div>
            <small className="muted">BILL TO</small>
            <p><strong>{invoice.customer.name}</strong></p>
            {invoice.customer.email && <p>{invoice.customer.email}</p>}
            {invoice.customer.address && <p className="pre">{invoice.customer.address}</p>}
          </div>
          <div className="right">
            <p><small className="muted">Issue date</small><br />{fmtDate(invoice.issueDate)}</p>
            <p><small className="muted">Due date</small><br />{fmtDate(invoice.dueDate)}</p>
          </div>
        </section>

        <table>
          <thead>
            <tr><th>Description</th><th className="right">Qty</th><th className="right">Rate</th><th className="right">Amount</th></tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => (
              <tr key={i}>
                <td>{it.description}</td>
                <td className="right">{it.quantity}</td>
                <td className="right">{money(it.rate)}</td>
                <td className="right">{money(it.quantity * it.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals doc-totals">
          <div className="line"><span>Subtotal</span><span>{money(invoice.subtotal)}</span></div>
          {invoice.discount > 0 && <div className="line"><span>Discount</span><span>− {money(invoice.discount)}</span></div>}
          <div className="line"><span>Tax ({invoice.taxPercent}%)</span><span>{money(invoice.tax)}</span></div>
          <div className="line grand"><span>Total</span><span>{money(invoice.total)}</span></div>
        </div>

        {invoice.notes && (
          <section className="doc-notes">
            <small className="muted">NOTES</small>
            <p className="pre">{invoice.notes}</p>
          </section>
        )}
      </article>
    </>
  );
}
