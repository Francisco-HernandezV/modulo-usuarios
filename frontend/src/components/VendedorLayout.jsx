import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import "../styles/admin.css"; // Reutilizamos los estilos base de panel

const IconPOS      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 15h.01M12 15h.01M17 15h.01M7 11h.01M12 11h.01M17 11h.01"/></svg>;
const IconUsers    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconHistory  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg>;
const IconLogout   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;

const NAV_VENDEDOR = [
  { path: "/vendedor",           label: "Punto de Venta", icon: <IconPOS />,     section: "OPERACIÓN" },
  { path: "/vendedor/clientes",  label: "Clientes",       icon: <IconUsers />,   section: "CATÁLOGOS" },
  { path: "/vendedor/historial", label: "Mis Ventas",     icon: <IconHistory />, section: "REPORTES"  },
];

export default function VendedorLayout({ children, pageTitle }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="adm-layout">
      <aside className="adm-sidebar">
        <div className="adm-sidebar-logo">
          <span className="adm-logo-text">DAN ELEMENT</span>
          <span className="adm-logo-sub">Punto de Venta</span>
        </div>

        <nav className="adm-nav">
          {NAV_VENDEDOR.map(item => (
            <div key={item.path}>
              <Link to={item.path} className={`adm-nav-item ${location.pathname === item.path ? "active" : ""}`}>
                <span className="adm-nav-icon">{item.icon}</span>
                <span className="adm-nav-label">{item.label}</span>
              </Link>
            </div>
          ))}
        </nav>

        <div className="adm-sidebar-footer">
          <div className="adm-avatar" style={{ background: "var(--color-yellow)" }}>V</div>
          <div className="adm-avatar-info">
            <p className="adm-avatar-name">Vendedor</p>
            <p className="adm-avatar-role">Atención a Clientes</p>
          </div>
          <button onClick={handleLogout} className="adm-logout-btn" title="Cerrar Sesión" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <IconLogout />
          </button>
        </div>
      </aside>

      <div className="adm-main">
        <header className="adm-topbar">
          <h1 className="adm-page-title">{pageTitle}</h1>
          <div className="adm-topbar-right">
            <span className="adm-badge adm-badge-green">Terminal Activa</span>
          </div>
        </header>
        <main className="adm-content">{children}</main>
      </div>
    </div>
  );
}

VendedorLayout.propTypes = {
  children: PropTypes.node.isRequired,
  pageTitle: PropTypes.string.isRequired
};