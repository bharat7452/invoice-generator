import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

// Business details shown at the top of every invoice.
export default function Settings() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [biz, setBiz] = useState({ name: '', address: '', phone: '', gstin: '', ...user.business });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const update = (e) => setBiz({ ...biz, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      setUser(await api.put('/auth/profile', { name, business: biz }));
      setMsg('Saved.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="card narrow" onSubmit={submit}>
      <h2>Business details</h2>
      <p className="muted">These appear on every invoice you create.</p>
      <label>Your name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>Business name
        <input name="name" value={biz.name} onChange={update} />
      </label>
      <label>Address
        <textarea name="address" rows={3} value={biz.address} onChange={update} />
      </label>
      <div className="row">
        <label>Phone
          <input name="phone" value={biz.phone} onChange={update} />
        </label>
        <label>GSTIN
          <input name="gstin" value={biz.gstin} onChange={update} />
        </label>
      </div>
      {error && <div className="alert">{error}</div>}
      {msg && <div className="alert ok">{msg}</div>}
      <button className="btn primary">Save</button>
    </form>
  );
}
