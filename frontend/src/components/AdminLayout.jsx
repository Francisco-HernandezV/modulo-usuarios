import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import "../styles/admin.css";

const IconGrid     = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const IconTag      = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
const IconUsers    = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconBox      = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const IconHome     = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IconChevron  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const IconLogout   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const IconMenu     = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const IconDatabase = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>;
const IconMonitor  = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>; // <-- NUEVO ÍCONO
const IconBadge = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="M9 12h.01M15 12h.01M12 12h.01"/></svg>;
const IconPOS = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 15h.01M12 15h.01M17 15h.01M7 11h.01M12 11h.01M17 11h.01"/></svg>;

const NAV_ITEMS = [
  { path: "/admin",             label: "Dashboard",          icon: <IconHome />,     section: "GENERAL"   },
  { path: "/pos",               label: "Caja / POS",      icon: <IconPOS />,   section: "GENERAL" }, // 🔥 NUEVO
  // ... resto de items
  // 🔥 CORRECCIÓN: Se actualizó la etiqueta y la ruta a catalogos
  { path: "/admin/catalogos",   label: "Catálogos Base",     icon: <IconTag />,      section: "CATÁLOGOS" }, 
  { path: "/admin/productos",   label: "Catálogo Productos", icon: <IconGrid />,     section: "CATÁLOGOS" },
  { path: "/admin/clientes",    label: "Gestión Clientes",   icon: <IconUsers />,    section: "CATÁLOGOS" },
  { path: "/admin/inventario",  label: "Inventario",         icon: <IconBox />,      section: "CATÁLOGOS" },
  { path: "/admin/respaldos",   label: "Respaldos DB",       icon: <IconDatabase />, section: "SISTEMA"   },
  { path: "/admin/monitor",     label: "Monitor DB",         icon: <IconMonitor />,  section: "SISTEMA"   },
  { path: "/admin/empleados", label: "Gestión Empleados", icon: <IconBadge />, section: "SISTEMA" } 
];

export default function AdminLayout({ children, pageTitle, breadcrumb }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const sections = [...new Set(NAV_ITEMS.map(i => i.section))];

  return (
    <div className={`adm-layout ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
      <aside className="adm-sidebar">
        <div className="adm-sidebar-logo">
          <span className="adm-logo-text">DAN ELEMENT</span>
          <span className="adm-logo-sub">Panel Administrativo</span>
        </div>

        <nav className="adm-nav">
          {sections.map(section => (
            <div key={section}>
              <p className="adm-nav-section">{section}</p>
              {NAV_ITEMS.filter(i => i.section === section).map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`adm-nav-item ${location.pathname === item.path ? "active" : ""}`}
                >
                  <span className="adm-nav-icon">{item.icon}</span>
                  <span className="adm-nav-label">{item.label}</span>
                  {location.pathname === item.path && (
                    <span className="adm-nav-indicator" />
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="adm-sidebar-footer">
          <div className="adm-avatar">A</div>
          <div className="adm-avatar-info">
            <p className="adm-avatar-name">Admin</p>
            <p className="adm-avatar-role">Administrador</p>
          </div>
          <Link to="/" className="adm-logout-btn" title="Ir a la tienda">
            <IconLogout />
          </Link>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────── */}
      <div className="adm-main">
        <header className="adm-topbar">
          <div className="adm-topbar-left">
            <button
              className="adm-menu-btn"
              onClick={() => setSidebarOpen(v => !v)}
              aria-label="Toggle sidebar"
            >
              <IconMenu />
            </button>
            <div className="adm-topbar-titles">
              <h1 className="adm-page-title">{pageTitle}</h1>
              {breadcrumb && (
                <div className="adm-breadcrumb">
                  <Link to="/admin">Inicio</Link>
                  <IconChevron />
                  <span>{breadcrumb}</span>
                </div>
              )}
            </div>
          </div>
          <div className="adm-topbar-right">
            <Link to="/" className="adm-btn adm-btn-ghost" style={{ fontSize: "12px" }}>
              ← Ver tienda
            </Link>
          </div>
        </header>

        <main className="adm-content">
          {children}
        </main>
      </div>
    </div>
  );
}
AdminLayout.propTypes = {
  children: PropTypes.node.isRequired,
  pageTitle: PropTypes.string.isRequired,
  breadcrumb: PropTypes.string
};