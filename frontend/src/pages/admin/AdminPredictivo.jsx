// frontend/src/pages/admin/AdminPredictivo.jsx
import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../services/api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";

const IconTable = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/><line x1="15" y1="9" x2="15" y2="21"/></svg>;
const IconChart = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;

const ESTADO_CONFIG = {
  agotado:        { label: "Agotado",        cls: "adm-badge-red",    icono: "⛔" },
  critico:        { label: "Crítico ≤7d",  cls: "adm-badge-red",    icono: "🚨" },
  alerta:         { label: "Alerta ≤15d",  cls: "adm-badge-yellow", icono: "⚠️" },
  normal:         { label: "Normal",         cls: "adm-badge-green",  icono: "✅" },
  sin_movimiento: { label: "Sin ventas",     cls: "adm-badge-gray",   icono: "—"  },
};

export default function AdminPredictivo() {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [vista, setVista] = useState("tabla"); // <-- NUEVO ESTADO PARA ALTERNAR VISTA

  useEffect(() => {
    api.get("/admin/inventario/predictivo")
      .then(r => setDatos(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtrados = filtro === "todos" ? datos : datos.filter(d => d.estado === filtro);

  const conteo = {
    agotado:  datos.filter(d => d.estado === "agotado").length,
    critico:  datos.filter(d => d.estado === "critico").length,
    alerta:   datos.filter(d => d.estado === "alerta").length,
    normal:   datos.filter(d => d.estado === "normal").length,
  };

  // Preparar datos para la gráfica (Mostramos top 15 para no saturar la pantalla)
  const datosGrafica = filtrados.slice(0, 15).map(d => ({
    name: `${d.producto.substring(0, 12)}... (${d.talla})`,
    "Stock Actual": d.stock_actual,
    "Ventas (30d)": d.vendido_30_dias,
  }));

  return (
    <AdminLayout pageTitle="Modelo Predictivo de Inventario" breadcrumb="Predictivo">

      {/* Controles Superiores: Tarjetas resumen y Toggle de Vista */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: "20px" }}>
        
        {/* Tarjetas de Filtro */}
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", flex: 1 }}>
          {[
            { label: "Agotados",    value: conteo.agotado,  color: "red",    icon: "⛔", key: "agotado"  },
            { label: "Críticos",    value: conteo.critico,  color: "red",    icon: "🚨", key: "critico"  },
            { label: "En alerta",   value: conteo.alerta,   color: "yellow", icon: "⚠️", key: "alerta"   },
            { label: "Stock normal",value: conteo.normal,   color: "green",  icon: "✅", key: "normal"   },
          ].map(s => (
            <div
              key={s.key}
              className="adm-stat-card"
              style={{ cursor: "pointer", outline: filtro === s.key ? "2px solid #3b82f6" : "none", padding: "15px", flex: 1, minWidth: "140px" }}
              onClick={() => setFiltro(f => f === s.key ? "todos" : s.key)}
            >
              <div className={`adm-stat-icon ${s.color}`} style={{ width: 32, height: 32, fontSize: 14 }}>{s.icon}</div>
              <div>
                <div className="adm-stat-value" style={{ fontSize: 20 }}>{loading ? "—" : s.value}</div>
                <div className="adm-stat-label" style={{ fontSize: 10 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Botones Toggle (Tabla / Gráfica) */}
        <div style={{ display: "flex", background: "#1f2937", borderRadius: "8px", padding: "4px", border: "1px solid #374151" }}>
          <button 
            type="button"
            onClick={() => setVista("tabla")}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, transition: "all 0.2s", background: vista === "tabla" ? "#3b82f6" : "transparent", color: vista === "tabla" ? "white" : "#9ca3af" }}
          >
            <IconTable /> Tabla
          </button>
          <button 
            type="button"
            onClick={() => setVista("grafica")}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, transition: "all 0.2s", background: vista === "grafica" ? "#3b82f6" : "transparent", color: vista === "grafica" ? "white" : "#9ca3af" }}
          >
            <IconChart /> Gráfica
          </button>
        </div>
      </div>

      {loading ? (
        <div className="adm-empty"><p>Calculando modelo predictivo...</p></div>
      ) : vista === "grafica" ? (
        
        /* ─── VISTA GRÁFICA ─── */
        <div className="adm-table-wrap" style={{ padding: "30px", height: "500px" }}>
          <h3 style={{ color: "white", marginBottom: "20px", fontSize: "16px" }}>
            Top {filtrados.length > 15 ? 15 : filtrados.length} variantes - Relación Stock vs Ventas
          </h3>
          {filtrados.length === 0 ? (
            <div className="adm-empty"><p>No hay datos para graficar en este estado.</p></div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosGrafica} margin={{ top: 10, right: 10, left: -20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#9ca3af" 
                  angle={-45} 
                  textAnchor="end" 
                  interval={0} 
                  tick={{ fontSize: 11, fill: '#8b949e' }}
                />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 11, fill: '#8b949e' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: "#161b22", borderColor: "#30363d", borderRadius: "8px", color: "white", fontSize: "13px" }} 
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "13px", color: "#d1d5db" }} />
                <Bar dataKey="Stock Actual" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Ventas (30d)" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      ) : (

        /* ─── VISTA TABLA (ORIGINAL) ─── */
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Talla</th>
                <th>Color</th>
                <th>Stock actual</th>
                <th>Vendido (30d)</th>
                <th>k (tasa consumo)</th>
                <th>Agotamiento estimado</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(d => {
                const cfg = ESTADO_CONFIG[d.estado];
                return (
                  <tr key={d.variante_id}>
                    <td style={{ fontWeight: 600 }}>{d.producto}</td>
                    <td><span className="adm-badge adm-badge-gray">{d.talla}</span></td>
                    <td>{d.color}</td>
                    <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{d.stock_actual}</td>
                    <td style={{ color: "#f59e0b" }}>{d.vendido_30_dias}</td>
                    <td style={{ fontFamily: "monospace", color: "#8b949e", fontSize: 12 }}>
                      {d.k !== null ? d.k.toFixed(4) : "—"}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {d.estado === "agotado"
                        ? <span style={{ color: "#ef4444" }}>Ya agotado</span>
                        : d.dias_agotamiento !== null
                          ? `~Día ${d.dias_agotamiento}`
                          : "—"
                      }
                    </td>
                    <td>
                      <span className={`adm-badge ${cfg.cls}`}>
                        {cfg.icono} {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtrados.length === 0 && (
            <div className="adm-empty"><p>No hay variantes en este estado.</p></div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}