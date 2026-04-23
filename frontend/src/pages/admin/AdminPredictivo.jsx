// frontend/src/pages/admin/AdminPredictivo.jsx
import { useState, useEffect, useCallback } from "react";
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
  const [datosGenerales, setDatosGenerales] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [selectedVariant, setSelectedVariant] = useState(null);

  const [filtrosData, setFiltrosData] = useState({ 
    min_fecha: "", categorias: [], colores: [], tallas: [], relacion_cat_tallas: [] 
  });
  const [parametrosBusqueda, setParametrosBusqueda] = useState({
    fecha_inicio: "",
    fecha_fin: "",
    categoria_id: "",
    color_id: "",
    talla_id: ""
  });

  useEffect(() => {
    api.get("/admin/inventario/predictivo/filtros")
      .then(r => setFiltrosData(r.data))
      .catch(console.error);
    cargarDatos();
  }, []);

  const cargarDatos = useCallback(() => {
    setLoading(true);
    api.get("/admin/inventario/predictivo", { params: parametrosBusqueda })
      .then(r => {
        setDatos(r.data.individual);
        setDatosGenerales(r.data.general);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [parametrosBusqueda]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setParametrosBusqueda(prev => {
      const newState = { ...prev, [name]: value };
      if (name === "categoria_id") {
        newState.talla_id = "";
      }
      return newState;
    });
  };

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
    
    const x0 = Number(v.stock_actual); 
    
    if (!v.k || v.k === 0) {
      for (let t = 0; t <= 30; t += 5) {
        puntos.push({ dia: t, unidades: x0 });
      }
      return puntos;
    }
    
    const maxDias = Math.max(v.dias_agotamiento || 0, 90); 
    const step = maxDias > 150 ? 2 : 1; 
    
    for (let t = 0; t <= maxDias + 15; t += step) {
      const x = x0 * Math.exp(v.k * t); 
      if (x < 0.1) {
        puntos.push({ dia: t, unidades: 0 });
        break; 
      }
      puntos.push({ dia: t, unidades: Number(x.toFixed(2)) });
    }

    if (v.dias_alerta && !puntos.some(p => p.dia === v.dias_alerta)) {
       puntos.push({ dia: v.dias_alerta, unidades: Number((x0 * Math.exp(v.k * v.dias_alerta)).toFixed(2)) });
    }
    if (v.dias_agotamiento && !puntos.some(p => p.dia === v.dias_agotamiento)) {
       puntos.push({ dia: v.dias_agotamiento, unidades: Number((x0 * Math.exp(v.k * v.dias_agotamiento)).toFixed(2)) });
    }

    puntos.sort((a, b) => a.dia - b.dia);

    return puntos;
  };

  const formatearFechaExacta = (fechaIso) => {
    if (!fechaIso) return "—";
    const [año, mes, dia] = fechaIso.split('-');
    return `${dia}/${mes}/${año}`;
  };

  const tallasDisponibles = parametrosBusqueda.categoria_id
    ? filtrosData.tallas.filter(t => 
        filtrosData.relacion_cat_tallas.some(
          rel => rel.categoria_id === Number(parametrosBusqueda.categoria_id) && rel.talla_id === t.id
        )
      )
    : filtrosData.tallas;

  const hoyIso = new Date().toISOString().split('T')[0];

  return (
    <AdminLayout pageTitle="Modelo Predictivo de Inventario" breadcrumb="Predictivo">
      
      {/* SECCIÓN DE FILTROS */}
      <div style={{ background: "#161b22", padding: "16px", borderRadius: "8px", marginBottom: "24px", border: "1px solid #30363d", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "12px", color: "#8b949e" }}>Desde (Ventas)</label>
          <input 
            type="date" 
            name="fecha_inicio" 
            value={parametrosBusqueda.fecha_inicio} 
            min={filtrosData.min_fecha}
            max={hoyIso} 
            onChange={handleFilterChange} 
            className="adm-input" 
            style={{ width: "150px", colorScheme: "dark" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "12px", color: "#8b949e" }}>Hasta (Ventas)</label>
          <input 
            type="date" 
            name="fecha_fin" 
            value={parametrosBusqueda.fecha_fin} 
            min={parametrosBusqueda.fecha_inicio || filtrosData.min_fecha} 
            max={hoyIso} 
            onChange={handleFilterChange} 
            className="adm-input" 
            style={{ width: "150px", colorScheme: "dark" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "12px", color: "#8b949e" }}>Categoría</label>
          <select name="categoria_id" value={parametrosBusqueda.categoria_id} onChange={handleFilterChange} className="adm-input">
            <option value="">Todas</option>
            {filtrosData.categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "12px", color: "#8b949e" }}>Color</label>
          <select name="color_id" value={parametrosBusqueda.color_id} onChange={handleFilterChange} className="adm-input">
            <option value="">Todos</option>
            {filtrosData.colores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "12px", color: "#8b949e" }}>Talla</label>
          <select name="talla_id" value={parametrosBusqueda.talla_id} onChange={handleFilterChange} className="adm-input">
            <option value="">Todas</option>
            {tallasDisponibles.map(t => <option key={t.id} value={t.id}>{t.valor}</option>)}
          </select>
        </div>

        <button 
          onClick={cargarDatos} 
          style={{ background: "#3b82f6", color: "white", padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", height: "38px", fontWeight: "bold" }}>
          Aplicar Filtros
        </button>
      </div>

      {/* SECCIÓN DE PREDICCIÓN GENERAL */}
      {!loading && datosGenerales && datosGenerales.stock_actual > 0 && (
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
          <h3 style={{ color: "white", marginBottom: "16px", fontSize: "18px" }}>Predicción General de Inventario (Filtro Actual)</h3>
          
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            
            {/* Tarjetas Estadísticas Generales */}
            <div style={{ flex: "1", minWidth: "250px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ background: "#0d1117", padding: "12px", borderRadius: "6px", border: "1px solid #30363d", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#8b949e", fontSize: "13px" }}>Cantidad Inicial:</span>
                <span style={{ color: "white", fontWeight: "bold", fontSize: "16px" }}>{datosGenerales.stock_inicial}</span>
              </div>
              <div style={{ background: "#0d1117", padding: "12px", borderRadius: "6px", border: "1px solid #30363d", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#8b949e", fontSize: "13px" }}>Cantidad Actual:</span>
                <span style={{ color: "#3b82f6", fontWeight: "bold", fontSize: "16px" }}>{datosGenerales.stock_actual}</span>
              </div>
              <div style={{ background: "#0d1117", padding: "12px", borderRadius: "6px", border: "1px solid #30363d", display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#8b949e", fontSize: "12px", marginBottom: "4px" }}>Proyección de Alerta (10 unidades):</span>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ color: "#f59e0b", fontWeight: "bold", fontSize: "18px" }}>{datosGenerales.dias_alerta !== null ? `${datosGenerales.dias_alerta} días` : "—"}</span>
                  <span style={{ color: "#8b949e", fontSize: "13px" }}>{formatearFechaExacta(datosGenerales.fecha_alerta)}</span>
                </div>
              </div>
              <div style={{ background: "#0d1117", padding: "12px", borderRadius: "6px", border: "1px solid #30363d", display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#8b949e", fontSize: "12px", marginBottom: "4px" }}>Proyección de Agotamiento (1 unidad):</span>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ color: "#ef4444", fontWeight: "bold", fontSize: "18px" }}>{datosGenerales.dias_agotamiento !== null ? `${datosGenerales.dias_agotamiento} días` : "—"}</span>
                  <span style={{ color: "#8b949e", fontSize: "13px" }}>{formatearFechaExacta(datosGenerales.fecha_agotamiento)}</span>
                </div>
              </div>
            </div>

            {/* Gráfica de Decaimiento General */}
            <div style={{ flex: "2", minWidth: "400px", height: "300px", background: "#0d1117", borderRadius: "8px", padding: "10px", border: "1px solid #30363d" }}>
               <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={generarDatosCurva(datosGenerales)} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorGeneral" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                  <XAxis 
                    dataKey="dia" 
                    stroke="#8b949e" 
                    label={{ value: 'Días', position: 'insideBottomRight', offset: -10, fill: '#8b949e', fontSize: 12 }} 
                  />
                  <YAxis 
                    stroke="#8b949e" 
                    domain={[0, dataMax => Math.ceil(dataMax + 5)]} 
                    label={{ value: 'Inventario General', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 12 }} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#161b22", borderColor: "#30363d", color: "white" }}
                    formatter={(value) => [`${value} unidades`, "Inventario Exacto"]}
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
                    fill="url(#colorGeneral)"
                    isAnimationActive={false} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

          </div>
        </div>
      )}

      {/* SECCIÓN DE ESTADÍSTICAS INDIVIDUALES */}
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

      {/* TABLA DE VARIANTES */}
      {loading ? (
        <div className="adm-empty"><p>Calculando proyecciones matemáticas...</p></div>
      ) : filtrados.length === 0 ? (
        <div className="adm-empty" style={{ padding: "40px", textAlign: "center", color: "#8b949e", background: "#161b22", borderRadius: "8px", border: "1px dashed #30363d" }}>
          <div style={{ fontSize: "40px", marginBottom: "10px" }}>📭</div>
          <h3 style={{ color: "white", marginBottom: "8px" }}>Sin resultados para estos filtros</h3>
          <p>No se encontraron productos o ventas con la categoría, color, talla y fechas que seleccionaste.</p>
        </div>
      ) : (
        <div className="adm-table-wrap" style={{ overflowX: "auto" }}>
          <table className="adm-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Talla/Color</th>
                <th>Stock</th>
                <th>Vendido</th>
                <th>Lapso</th>
                <th>Tasa (k)</th>
                <th>Alerta (≤10)</th>
                <th>Agotamiento (1)</th>
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
                      <span style={{ marginLeft: 8, fontSize: 12, color: "#8b949e", whiteSpace: "nowrap" }}>{d.color}</span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{d.stock_actual}</td>
                    
                    <td style={{ color: "#f59e0b" }}>
                      <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.2" }}>
                        <span style={{ fontWeight: "bold" }}>{d.vendido_periodo} <span style={{ fontSize: "10px", fontWeight: "normal" }}>en filtro</span></span>
                        <span style={{ fontSize: "11px", opacity: 0.8 }}>{d.vendido_historico} histórico</span>
                      </div>
                    </td>

                    <td style={{ fontWeight: 600, color: "#60a5fa", whiteSpace: "nowrap" }}>
                      {d.dias_historial ? `${d.dias_historial} d` : "—"}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 12, color: "#8b949e" }}>
                      {d.k ? d.k.toFixed(4) : "0.0000"}
                    </td>
                    
                    <td style={{ color: "#f59e0b", fontWeight: 600 }}>
                      {d.estado === "sin_movimiento" || d.dias_alerta === null ? "—" : (
                        <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.2" }}>
                          <span>{d.dias_alerta} d</span>
                          <span style={{ fontSize: "11px", opacity: 0.8, fontWeight: "normal" }}>{formatearFechaExacta(d.fecha_alerta)}</span>
                        </div>
                      )}
                    </td>
                    
                    <td style={{ color: "#ef4444", fontWeight: 600 }}>
                      {d.estado === "sin_movimiento" || d.dias_agotamiento === null ? "—" : (
                        <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.2" }}>
                          <span>{d.dias_agotamiento} d</span>
                          <span style={{ fontSize: "11px", opacity: 0.8, fontWeight: "normal" }}>{formatearFechaExacta(d.fecha_agotamiento)}</span>
                        </div>
                      )}
                    </td>

                    <td style={{ whiteSpace: "nowrap" }}>
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

      {/* MODAL DE GRÁFICA INDIVIDUAL */}
      {selectedVariant && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: "12px", width: "100%", maxWidth: "800px", padding: "24px", position: "relative" }}>
            <button 
              onClick={() => setSelectedVariant(null)}
              style={{ position: "absolute", top: 15, right: 15, background: "none", border: "none", color: "#8b949e", fontSize: "20px", cursor: "pointer" }}
            >✕</button>

            <h3 style={{ color: "white", marginBottom: 5 }}>
              {selectedVariant.k && selectedVariant.k < 0 ? "Curva de Decaimiento Exponencial" : "Estabilidad de Inventario (Sin ventas en filtro)"}
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
                    label={{ value: 'Días transcurridos desde fecha de corte (t)', position: 'insideBottomRight', offset: -10, fill: '#8b949e', fontSize: 12 }} 
                  />
                  
                  <YAxis 
                    stroke="#8b949e" 
                    domain={[0, dataMax => Math.ceil(dataMax + 5)]} 
                    label={{ value: 'Inventario (x)', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 12 }} 
                  />
                  
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#161b22", borderColor: "#30363d", color: "white" }}
                    formatter={(value) => [`${value} unidades`, "Inventario Exacto"]}
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
                  <div style={{ fontSize: "10px", color: "#8b949e", textTransform: "uppercase" }}>Días Alerta</div>
                  <div style={{ color: "#f59e0b", fontWeight: "bold", fontSize: "16px" }}>
                    {selectedVariant.k ? `${selectedVariant.dias_alerta} d` : "Sin riesgo"}
                  </div>
               </div>
               <div style={{ background: "#0d1117", padding: "10px", borderRadius: "6px", border: "1px solid #30363d" }}>
                  <div style={{ fontSize: "10px", color: "#8b949e", textTransform: "uppercase" }}>Días Agotamiento</div>
                  <div style={{ color: "#ef4444", fontWeight: "bold", fontSize: "16px" }}>
                    {selectedVariant.k ? `${selectedVariant.dias_agotamiento} d` : "Estable"}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}