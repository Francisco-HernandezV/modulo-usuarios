// frontend/src/pages/admin/AdminReportes.jsx
import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../services/api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

export default function AdminReportes() {
  const hoyIso = new Date().toISOString().split('T')[0];
  const [minFecha, setMinFecha] = useState("");
  
  const [reportData, setReportData] = useState({
    diario: [], kpis: {}, topCategorias: [], topProductos: []
  });
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    fecha_inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    fecha_fin: hoyIso,
    categoria_id: ""
  });

  useEffect(() => {
    api.get("/admin/categorias").then(r => setCategorias(r.data)).catch(console.error);
    // Obtenemos la fecha más antigua registrada en el sistema para limitar el calendario
    api.get("/admin/inventario/predictivo/filtros")
       .then(r => setMinFecha(r.data.min_fecha))
       .catch(console.error);
    cargarReporte();
  }, []);

  const cargarReporte = () => {
    setLoading(true);
    api.get("/admin/reportes/ventas", { params: filtros })
      .then(r => {
        const rawData = r.data;
        // Conversión estricta a Number() porque PostgreSQL retorna SUM() como String.
        // Esto es necesario para que Recharts calcule las proporciones geométricas correctamente.
        setReportData({
          diario: rawData.diario.map(d => ({
            ...d,
            total_prendas: Number(d.total_prendas),
            total_monto: Number(d.total_monto)
          })),
          kpis: {
            total_prendas: Number(rawData.kpis?.total_prendas || 0),
            total_ingresos: Number(rawData.kpis?.total_ingresos || 0),
            total_tickets: Number(rawData.kpis?.total_tickets || 0)
          },
          topCategorias: rawData.topCategorias.map(c => ({
            ...c,
            value: Number(c.value) 
          })),
          topProductos: rawData.topProductos.map(p => ({
            ...p,
            cantidad: Number(p.cantidad),
            ingresos: Number(p.ingresos)
          }))
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor || 0);
  };

  const { diario, kpis, topCategorias, topProductos } = reportData;
  const ticketPromedio = kpis.total_tickets > 0 ? (kpis.total_ingresos / kpis.total_tickets) : 0;

  return (
    <AdminLayout pageTitle="Reportes de Ventas y Rendimiento" breadcrumb="Reportes">
      <div style={{ background: "#161b22", padding: "16px", borderRadius: "8px", marginBottom: "24px", border: "1px solid #30363d", display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: "12px", color: "#8b949e" }}>Desde</label>
          <input 
            type="date" 
            className="adm-input" 
            value={filtros.fecha_inicio}
            min={minFecha}
            max={hoyIso}
            onChange={e => setFiltros({...filtros, fecha_inicio: e.target.value})} 
            style={{ colorScheme: "dark" }} 
          />
        </div>
        <div>
          <label style={{ fontSize: "12px", color: "#8b949e" }}>Hasta</label>
          <input 
            type="date" 
            className="adm-input" 
            value={filtros.fecha_fin} 
            min={filtros.fecha_inicio || minFecha}
            max={hoyIso}
            onChange={e => setFiltros({...filtros, fecha_fin: e.target.value})} 
            style={{ colorScheme: "dark" }} 
          />
        </div>
        <div>
          <label style={{ fontSize: "12px", color: "#8b949e" }}>Categoría</label>
          <select className="adm-input" value={filtros.categoria_id} onChange={e => setFiltros({...filtros, categoria_id: e.target.value})}>
            <option value="">Todas</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <button onClick={cargarReporte} disabled={loading} style={{ background: "#238636", color: "white", padding: "8px 16px", borderRadius: "6px", border: "none", cursor: loading ? "wait" : "pointer", fontWeight: "bold", height: "38px" }}>
          {loading ? "Calculando..." : "Generar Reporte"}
        </button>
      </div>

      <div style={{ display: "flex", gap: "16px", marginBottom: 24, flexWrap: "wrap" }}>
        <div className="adm-stat-card" style={{ padding: "15px", flex: 1, minWidth: "200px" }}>
          <div className="adm-stat-icon green" style={{ width: 32, height: 32 }}>💰</div>
          <div>
            <div className="adm-stat-value" style={{ fontSize: 24 }}>{formatearMoneda(kpis.total_ingresos)}</div>
            <div className="adm-stat-label">Ingresos Totales</div>
          </div>
        </div>
        <div className="adm-stat-card" style={{ padding: "15px", flex: 1, minWidth: "200px" }}>
          <div className="adm-stat-icon blue" style={{ width: 32, height: 32 }}>👕</div>
          <div>
            <div className="adm-stat-value" style={{ fontSize: 24 }}>{kpis.total_prendas || 0}</div>
            <div className="adm-stat-label">Prendas Vendidas</div>
          </div>
        </div>
        <div className="adm-stat-card" style={{ padding: "15px", flex: 1, minWidth: "200px" }}>
          <div className="adm-stat-icon yellow" style={{ width: 32, height: 32 }}>🧾</div>
          <div>
            <div className="adm-stat-value" style={{ fontSize: 24 }}>{formatearMoneda(ticketPromedio)}</div>
            <div className="adm-stat-label">Ticket Promedio</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px", marginBottom: "20px" }}>
        <div style={{ background: "#161b22", padding: "20px", borderRadius: "8px", border: "1px solid #30363d" }}>
          <h4 style={{ color: "white", marginBottom: "15px" }}>Evolución de Ingresos ($)</h4>
          <div style={{ height: "300px" }}>
            {diario.length === 0 ? <p style={{ color: "#8b949e", textAlign: "center", marginTop: "100px" }}>Sin datos en este lapso</p> : 
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={diario}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                <XAxis dataKey="fecha" stroke="#8b949e" fontSize={12} />
                <YAxis stroke="#8b949e" fontSize={12} width={80} tickFormatter={(val) => `$${val}`} />
                <RechartsTooltip contentStyle={{ background: "#0d1117", border: "1px solid #30363d", color: "white" }} formatter={(val) => [formatearMoneda(val), "Ingreso"]} />
                <Area type="monotone" dataKey="total_monto" name="Monto" stroke="#238636" fill="#238636" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>}
          </div>
        </div>

        <div style={{ background: "#161b22", padding: "20px", borderRadius: "8px", border: "1px solid #30363d" }}>
          <h4 style={{ color: "white", marginBottom: "15px" }}>Volumen de Prendas Desplazadas</h4>
          <div style={{ height: "300px" }}>
            {diario.length === 0 ? <p style={{ color: "#8b949e", textAlign: "center", marginTop: "100px" }}>Sin datos en este lapso</p> : 
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diario}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                <XAxis dataKey="fecha" stroke="#8b949e" fontSize={12} />
                <YAxis stroke="#8b949e" fontSize={12} allowDecimals={false} />
                <RechartsTooltip contentStyle={{ background: "#0d1117", border: "1px solid #30363d", color: "white" }} />
                <Bar dataKey="total_prendas" name="Prendas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
        
        <div style={{ background: "#161b22", padding: "20px", borderRadius: "8px", border: "1px solid #30363d" }}>
          <h4 style={{ color: "white", marginBottom: "15px" }}>Distribución por Categoría</h4>
          <div style={{ height: "300px" }}>
            {topCategorias.length === 0 ? <p style={{ color: "#8b949e", textAlign: "center", marginTop: "100px" }}>Sin datos</p> : 
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={topCategorias} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                  {topCategorias.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ background: "#0d1117", border: "1px solid #30363d", color: "white" }} formatter={(val) => [`${val} unidades`, "Volumen"]} />
              </PieChart>
            </ResponsiveContainer>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", marginTop: "10px" }}>
            {topCategorias.map((cat, index) => (
              <div key={index} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#8b949e" }}>
                <span style={{ display: "block", width: "10px", height: "10px", borderRadius: "50%", background: COLORS[index % COLORS.length] }}></span>
                {cat.name} ({cat.value})
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#161b22", padding: "20px", borderRadius: "8px", border: "1px solid #30363d", overflowX: "auto" }}>
          <h4 style={{ color: "white", marginBottom: "15px" }}>Top 5 Productos con Mayor Ingreso</h4>
          {topProductos.length === 0 ? <p style={{ color: "#8b949e", textAlign: "center", marginTop: "100px" }}>Sin datos</p> : 
          <table className="adm-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Producto</th>
                <th style={{ textAlign: "center" }}>Prendas Vendidas</th>
                <th style={{ textAlign: "right" }}>Ingreso Generado</th>
              </tr>
            </thead>
            <tbody>
              {topProductos.map((p, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: "bold" }}>{p.producto}</td>
                  <td style={{ textAlign: "center", color: "#60a5fa", fontWeight: "bold" }}>{p.cantidad}</td>
                  <td style={{ textAlign: "right", color: "#10b981", fontWeight: "bold" }}>{formatearMoneda(p.ingresos)}</td>
                </tr>
              ))}
            </tbody>
          </table>}
        </div>

      </div>
    </AdminLayout>
  );
}