import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <header className="topbar no-print">
        <div className="brand">InvoiceEasy</div>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/invoices">Invoices</NavLink>
          <NavLink to="/settings">Business</NavLink>
        </nav>
        <div className="user">
          <span className="muted">{user.name}</span>
          <button className="btn small ghost" onClick={handleLogout}>Log out</button>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
