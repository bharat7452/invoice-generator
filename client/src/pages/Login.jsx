import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', businessName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <h1>InvoiceEasy</h1>
        <p className="muted">Simple invoicing for small businesses</p>

        {mode === 'register' && (
          <>
            <label>Your name
              <input name="name" value={form.name} onChange={update} required />
            </label>
            <label>Business name
              <input name="businessName" value={form.businessName} onChange={update} placeholder="Optional" />
            </label>
          </>
        )}
        <label>Email
          <input type="email" name="email" value={form.email} onChange={update} required />
        </label>
        <label>Password
          <input type="password" name="password" value={form.password} onChange={update} minLength={6} required />
        </label>

        {error && <div className="alert">{error}</div>}

        <button className="btn primary" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
        <p className="muted center">
          {mode === 'login' ? "Don't have an account? " : 'Already registered? '}
          <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </form>
    </div>
  );
}
