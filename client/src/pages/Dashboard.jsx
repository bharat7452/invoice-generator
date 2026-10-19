import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money, fmtDate } from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/invoices/stats'), api.get('/invoices?limit=5')])
      .then(([s, r]) => {
        setStats(s);
        setRecent(r);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alert">{error}</div>;
  if (!stats) return <p className="muted">Loading…</p>;

  const outstanding = stats.sent.amount + stats.draft.amount;
  const maxMonth = Math.max(1, ...stats.monthlyRevenue.map((m) => m.amount));

  return (
    <>
      <div className="page-head">
        <h2>Dashboard</h2>
        <Link to="/invoices/new" className="btn primary">+ New invoice</Link>
      </div>

      <div className="grid stats">
        <div className="card stat">
          <span className="muted">Paid</span>
          <strong className="green">{money(stats.paid.amount)}</strong>
          <small>{stats.paid.count} invoices</small>
        </div>
        <div className="card stat">
          <span className="muted">Outstanding</span>
          <strong>{money(outstanding)}</strong>
          <small>{stats.sent.count + stats.draft.count} invoices</small>
        </div>
        <div className="card stat">
          <span className="muted">Overdue</span>
          <strong className="red">{money(stats.overdue.amount)}</strong>
          <small>{stats.overdue.count} invoices</small>
        </div>
      </div>

      <div className="grid two">
        <section className="card">
          <h3>Paid revenue (last 6 months)</h3>
          {stats.monthlyRevenue.length === 0 ? (
            <p className="muted">No paid invoices yet.</p>
          ) : (
            <div className="bars">
              {stats.monthlyRevenue.map((m) => (
                <div key={`${m.year}-${m.month}`} className="bar-col" title={money(m.amount)}>
                  <div className="bar" style={{ height: `${(m.amount / maxMonth) * 100}%` }} />
                  <span>{MONTHS[m.month - 1]}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h3>Recent invoices</h3>
          {recent.length === 0 ? (
            <p className="muted">Nothing here yet. <Link to="/invoices/new">Create your first invoice</Link>.</p>
          ) : (
            <table>
              <tbody>
                {recent.map((inv) => (
                  <tr key={inv._id}>
                    <td><Link to={`/invoices/${inv._id}`}>{inv.number}</Link></td>
                    <td>{inv.customer.name}</td>
                    <td className="right">{money(inv.total)}</td>
                    <td><StatusBadge invoice={inv} /></td>
                    <td className="muted">{fmtDate(inv.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
