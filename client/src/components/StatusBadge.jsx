import { isOverdue } from '../api.js';

export default function StatusBadge({ invoice }) {
  const overdue = isOverdue(invoice);
  const label = overdue ? 'overdue' : invoice.status;
  return <span className={`badge ${label}`}>{label}</span>;
}
