import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import {
  BookOpen, CreditCard, LayoutDashboard, LogOut, Menu, ShoppingCart, Truck, X
} from "lucide-react";
import { adminFetch, clearToken, getToken } from "./api";

const LINKS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/delivery", label: "Delivery", icon: Truck },
  { to: "/admin/payments", label: "Payments", icon: CreditCard }
];

// Wraps every admin page: checks the JWT with the server, shows the sidebar.
export default function AdminLayout() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const logout = () => {
    clearToken();
    navigate("/admin", { replace: true });
  };

  useEffect(() => {
    if (!getToken()) return;
    adminFetch("/api/admin/me")
      .then(data => setAdmin(data.admin))
      .catch(() => logout())
      .finally(() => setChecking(false));

    // Any API call that gets a 401 fires this event
    window.addEventListener("admin-auth-expired", logout);
    return () => window.removeEventListener("admin-auth-expired", logout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!getToken()) return <Navigate to="/admin" replace />;

  if (checking) {
    return <div className="admin-loading-screen">Checking your session…</div>;
  }

  return (
    <div className="admin-shell">
      <aside className={menuOpen ? "admin-sidebar open" : "admin-sidebar"}>
        <div className="admin-brand">
          <span className="brand-icon"><BookOpen size={19} /></span>
          <span>JS <span className="brand-accent">Book Store</span></span>
        </div>
        <span className="admin-sidebar-label">ADMIN</span>

        <nav className="admin-nav" onClick={() => setMenuOpen(false)}>
          {LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? "admin-nav-link active" : "admin-nav-link")}
            >
              <Icon size={18} /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          {admin && <p className="admin-signed-in">Signed in as <b>{admin.username}</b></p>}
          <button className="admin-nav-link admin-logout" onClick={logout}>
            <LogOut size={18} /> <span>Logout</span>
          </button>
        </div>
      </aside>

      {menuOpen && <div className="admin-scrim" onClick={() => setMenuOpen(false)} />}

      <div className="admin-content">
        <header className="admin-topbar">
          <button
            className="admin-icon-button admin-menu-toggle"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="admin-topbar-title">Order Management</span>
        </header>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// Shared page heading
export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="admin-page-head">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </div>
  );
}
