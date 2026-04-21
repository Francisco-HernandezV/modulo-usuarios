// frontend/src/pages/admin/AdminPredictivo.jsx
import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../services/api";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label
} from "recharts";

const IconChart = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;

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
  const [selectedVariant, setSelectedVariant] = useState(null);

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

  const generarDatosCurva = (v) => {
    if (!v) return [];
    
    const puntos = [];
    const x0 = Number(v.stock_actual) + Number(v.vendido_30_dias);

    if (!v.k || v.k === 0) {
      for (let t = 0; t <= 30; t += 5) {
        puntos.push({ dia: t, unidades: x0 });
      }
      return puntos;
    }

    const maxDias = Math.max(v.dias_agotamiento || 0, 90); 
    const step = maxDias > 150 ? 5 : 2; 
    
    for (let t = 0; t <= maxDias + 15; t += step) {
      const x = x0 * Math.exp(v.k * t); 
      
      if (x < 0.5) {
        puntos.push({ dia: t, unidades: 0 });
        break; 
      }

      puntos.push({
        dia: t,
        unidades: parseFloat(x.toFixed(2))
      });
    }
    return puntos;
  };

  return (
    <AdminLayout pageTitle="Modelo Predictivo de Inventario" breadcrumb="Predictivo">

      <div style={{ display: "flex", gap: "16px", marginBottom: 24, flexWrap: "wrap" }}>
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

      {loading ? (
        <div className="adm-empty"><p>Calculando proyecciones matemáticas...</p></div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Talla/Color</th>
                <th>Stock</th>
                <th>Vendido</th>
                <th>Historial (Días)</th> {/* 🔥 NUEVA COLUMNA */}
                <th>k (Tasa)</th>
                <th>Alerta (≤10)</th>
                <th>Agotamiento</th>
                <th>Estado</th>
                <th>Gráfica</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(d => {
                const cfg = ESTADO_CONFIG[d.estado];
                return (
                  <tr key={d.variante_id}>
                    <td><div style={{ fontWeight: 600 }}>{d.producto}</div></td>
                    <td>
                      <span className="adm-badge adm-badge-gray">{d.talla}</span>
                      <span style={{ marginLeft: 8, fontSize: 12, color: "#8b949e" }}>{d.color}</span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{d.stock_actual}</td>
                    <td style={{ color: "#f59e0b" }}>{d.vendido_30_dias}</td>
                    <td style={{ fontWeight: 600, color: "#60a5fa" }}>
                      {d.dias_historial ? `${d.dias_historial} d` : "—"} {/* 🔥 SE MUESTRA EL DATO AQUÍ */}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 12, color: "#8b949e" }}>
                      {d.k ? d.k.toFixed(4) : "0.0000"}
                    </td>
                    <td style={{ color: "#f59e0b", fontWeight: 600 }}>
                      {d.estado === "sin_movimiento" ? "—" : d.dias_alerta !== null ? `~Día ${d.dias_alerta}` : "—"}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {d.estado === "sin_movimiento" ? "—" : d.dias_agotamiento !== null ? `~Día ${d.dias_agotamiento}` : "—"}
                    </td>
                    <td>
                      <span className={`adm-badge ${cfg.cls}`}>
                        {cfg.icono} {cfg.label}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => setSelectedVariant(d)}
                        className="adm-btn-icon"
                        title="Ver curva de decaimiento"
                        style={{ background: "#374151", color: "#3b82f6", border: "none", borderRadius: "4px", padding: "4px 8px", cursor: "pointer" }}
                      >
                        <IconChart />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedVariant && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: "12px", width: "100%", maxWidth: "800px", padding: "24px", position: "relative" }}>
            <button 
              onClick={() => setSelectedVariant(null)}
              style={{ position: "absolute", top: 15, right: 15, background: "none", border: "none", color: "#8b949e", fontSize: "20px", cursor: "pointer" }}
            >✕</button>

            <h3 style={{ color: "white", marginBottom: 5 }}>
              {selectedVariant.k && selectedVariant.k < 0 ? "Curva de Decaimiento Exponencial" : "Estabilidad de Inventario (Sin ventas)"}
            </h3>
            <p style={{ color: "#8b949e", marginBottom: 20, fontSize: "14px" }}>
              {selectedVariant.producto} - {selectedVariant.color} ({selectedVariant.talla})
            </p>

            <div style={{ height: "400px", width: "100%", background: "#0d1117", borderRadius: "8px", padding: "10px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={generarDatosCurva(selectedVariant)} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  
                  <defs>
                    <linearGradient id="colorUnidades" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                  
                  <XAxis 
                    dataKey="dia" 
                    stroke="#8b949e" 
                    label={{ value: 'Días transcurridos (t)', position: 'insideBottomRight', offset: -10, fill: '#8b949e', fontSize: 12 }} 
                  />
                  
                  <YAxis 
                    stroke="#8b949e" 
                    domain={[0, dataMax => Math.ceil(dataMax + 5)]} 
                    label={{ value: 'Inventario (x)', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 12 }} 
                  />
                  
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#161b22", borderColor: "#30363d", color: "white" }}
                    formatter={(value) => [`${value} unidades`, "Inventario"]}
                    labelFormatter={(label) => `Día ${label}`}
                  />
                  
                  <ReferenceLine y={10} stroke="#f59e0b" strokeDasharray="5 5" ifOverflow="extendDomain">
                    <Label value="Alerta (10)" fill="#f59e0b" position="insideTopRight" fontSize={12} />
                  </ReferenceLine>

                  <ReferenceLine y={1} stroke="#ef4444" strokeDasharray="3 3" ifOverflow="extendDomain">
                    <Label value="Agotamiento (1)" fill="#ef4444" position="insideTopRight" fontSize={12} />
                  </ReferenceLine>

                  <Area 
                    type="monotone" 
                    dataKey="unidades" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorUnidades)"
                    isAnimationActive={false} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
               {/* 🔥 SE AGREGA TAMBIÉN EL DATO AL MODAL PARA MAYOR CLARIDAD */}
               <div style={{ background: "#0d1117", padding: "10px", borderRadius: "6px", border: "1px solid #30363d" }}>
                  <div style={{ fontSize: "10px", color: "#8b949e", textTransform: "uppercase" }}>Lapso evaluado (T)</div>
                  <div style={{ color: "#60a5fa", fontWeight: "bold", fontSize: "16px" }}>
                    {selectedVariant.dias_historial ? `${selectedVariant.dias_historial} días` : "—"}
                  </div>
               </div>
               <div style={{ background: "#0d1117", padding: "10px", borderRadius: "6px", border: "1px solid #30363d" }}>
                  <div style={{ fontSize: "10px", color: "#8b949e", textTransform: "uppercase" }}>Tasa k</div>
                  <div style={{ color: "#3b82f6", fontWeight: "bold", fontSize: "16px" }}>
                    {selectedVariant.k ? selectedVariant.k.toFixed(4) : "0.0000"}
                  </div>
               </div>
               <div style={{ background: "#0d1117", padding: "10px", borderRadius: "6px", border: "1px solid #30363d" }}>
                  <div style={{ fontSize: "10px", color: "#8b949e", textTransform: "uppercase" }}>Día de Alerta</div>
                  <div style={{ color: "#f59e0b", fontWeight: "bold", fontSize: "16px" }}>
                    {selectedVariant.k ? `Día ${selectedVariant.dias_alerta}` : "Sin riesgo"}
                  </div>
               </div>
               <div style={{ background: "#0d1117", padding: "10px", borderRadius: "6px", border: "1px solid #30363d" }}>
                  <div style={{ fontSize: "10px", color: "#8b949e", textTransform: "uppercase" }}>Agotamiento</div>
                  <div style={{ color: "#ef4444", fontWeight: "bold", fontSize: "16px" }}>
                    {selectedVariant.k ? `Día ${selectedVariant.dias_agotamiento}` : "Estable"}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}