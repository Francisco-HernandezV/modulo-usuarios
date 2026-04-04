import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Link } from "react-router-dom";
import api from "../../services/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalProductos:  0,
    totalClientes:   0,
    totalCategorias: 0,
    stockBajo:       0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [prods, clientes, cats, inv] = await Promise.all([
          api.get("/admin/productos"),
          api.get("/admin/clientes"),
          api.get("/admin/categorias"), // 🔥 CORRECCIÓN: Antes decía "/admin/catalogos"
          api.get("/admin/inventario"),
        ]);
        const stockBajoCount = (inv.data || []).filter(i => i.stock <= 5).length;
        setStats({
          totalProductos:  (prods.data    || []).length,
          totalClientes:   (clientes.data || []).length,
          totalCategorias: (cats.data     || []).length,
          stockBajo: stockBajoCount,
        });
      } catch (error) {
        console.error("Error al obtener estadísticas del dashboard:", error);
        setStats({ totalProductos: 0, totalClientes: 0, totalCategorias: 0, stockBajo: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const STATS = [
    { label: "Productos",  value: stats.totalProductos,  icon: "👗", color: "blue",    to: "/admin/productos"  },
    { label: "Clientes",   value: stats.totalClientes,   icon: "👥", color: "green",   to: "/admin/clientes"   },
    { label: "Categorías", value: stats.totalCategorias, icon: "🏷️", color: "yellow", to: "/admin/catalogos" },
    { label: "Stock bajo", value: stats.stockBajo,       icon: "⚠️", color: "red",     to: "/admin/inventario" },
  ];

  const MODULES = [
    {
      title: "Catálogo de Productos",
      desc:  "Registra, edita y controla todos los productos de la boutique con tallas, colores y precios.",
      to: "/admin/productos", icon: "👗", color: "blue",
    },
    {
      title: "Gestión de Clientes",
      desc:  "Consulta y administra el directorio de clientes, con datos de contacto y RFC para facturación.",
      to: "/admin/clientes", icon: "👥", color: "green",
    },
    {
      title: "Categorías",
      desc:  "Define y organiza las categorías de prendas para estructurar el catálogo correctamente.",
      to: "/admin/catalogos", icon: "🏷️", color: "yellow",
    },
    {
      title: "Inventario",
      desc:  "Consulta existencias actuales, identifica productos con stock bajo y ajusta cantidades.",
      to: "/admin/inventario", icon: "📦", color: "red",
    },
  ];

  return (
    <AdminLayout pageTitle="Dashboard" breadcrumb={null}>

      <div style={{
        background:      "linear-gradient(135deg, rgba(59,130,246,.14) 0%, rgba(59,130,246,.04) 100%)",
        border:          "1px solid rgba(59,130,246,.25)",
        borderRadius:    "12px",
        padding:         "22px 24px",
        marginBottom:    "24px",
        display:         "flex",
        alignItems:      "center",
        justifyContent: "space-between",
        gap:             "16px",
        flexWrap:        "wrap",
      }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-logo,'Montserrat',sans-serif)", fontSize: "20px", fontWeight: 800, marginBottom: "4px" }}>
            Bienvenido al Panel Administrativo
          </h2>
          <p style={{ color: "var(--text-muted,#8b949e)", fontSize: "13px" }}>
            DanElement Boutique, Módulos de febrero listos para captura de datos reales
          </p>
        </div>
        <span style={{
          background:   "rgba(59,130,246,.15)",
          color:        "#3b82f6",
          padding:      "5px 14px",
          borderRadius: "20px",
          fontSize:     "12px",
          fontWeight:   600,
          border:       "1px solid rgba(59,130,246,.3)",
          whiteSpace:   "nowrap",
        }}>
        </span>
      </div>

      <div className="adm-stats-grid">
        {STATS.map(s => (
          <Link key={s.label} to={s.to} style={{ textDecoration: "none" }}>
            <div className="adm-stat-card">
              <div className={`adm-stat-icon ${s.color}`}>{s.icon}</div>
              <div>
                <div className="adm-stat-value">{loading ? "—" : s.value}</div>
                <div className="adm-stat-label">{s.label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="adm-section-header">
        <h3 className="adm-section-title">Módulos activos — Entregables Febrero</h3>
      </div>

      <div style={{
        display:              "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap:                  "14px",
      }}>
        {MODULES.map(m => (
          <Link key={m.title} to={m.to} style={{ textDecoration: "none" }}>
            <div
              className="adm-stat-card"
              style={{ flexDirection: "column", alignItems: "flex-start", gap: "12px", padding: "20px", cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className={`adm-stat-icon ${m.color}`} style={{ width: 36, height: 36, fontSize: 16, borderRadius: 8 }}>
                  {m.icon}
                </div>
                <span style={{ fontFamily: "var(--font-logo,'Montserrat',sans-serif)", fontSize: "14px", fontWeight: 700 }}>
                  {m.title}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted,#8b949e)", lineHeight: 1.5, margin: 0 }}>
                {m.desc}
              </p>
              <span style={{ fontSize: "11px", color: "var(--color-accent,#3b82f6)", fontWeight: 600 }}>
                Ir al módulo →
              </span>
            </div>
          </Link>
        ))}
      </div>

    </AdminLayout>
  );
}