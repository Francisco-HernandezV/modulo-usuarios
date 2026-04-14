import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import api from "../services/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import "../styles/admin.css";

export default function AdminMonitor() {
  const [activity, setActivity] = useState([]);
  const [maxConn, setMaxConn] = useState(100);
  const [locks, setLocks] = useState([]);
  const [health, setHealth] = useState({});
  const [vacuum, setVacuum] = useState([]);
  const [explainScenario, setExplainScenario] = useState("productos");
  const [explainResult, setExplainResult] = useState(null);

  const fetchData = async () => {
    try {
      const [actRes, lockRes, healthRes, vacRes] = await Promise.all([
        api.get("/admin/monitor/activity"),
        api.get("/admin/monitor/locks"),
        api.get("/admin/monitor/health"),
        api.get("/admin/monitor/autovacuum")
      ]);

      setActivity(Array.isArray(actRes.data?.conexiones) ? actRes.data.conexiones : []);
      setMaxConn(actRes.data?.max_connections || 100);
      setLocks(Array.isArray(lockRes.data) ? lockRes.data : []);
      setHealth(healthRes.data || {});
      setVacuum(Array.isArray(vacRes.data) ? vacRes.data : []);
      
    } catch (error) {
      console.error("Error obteniendo métricas:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000); 
    return () => clearInterval(interval);
  }, []);

  const handleExplain = async () => {
    setExplainResult(null); 
    try {
      const res = await api.post("/admin/monitor/explain", { escenario: explainScenario });
      setExplainResult(JSON.stringify(res.data, null, 2));
    } catch (error) {
      setExplainResult("Error de conexión con el diagnóstico.");
    }
  };

  // --- VARIABLES SEGURAS ---
  const safeHealth = health || {};
  const cacheHit = parseFloat(safeHealth.cache_hit_ratio) || 0;
  const commits = parseInt(safeHealth.commits) || 0;
  const rollbacks = parseInt(safeHealth.rollbacks) || 0;
  const totalTrans = commits + rollbacks;
  
  const safeVacuum = Array.isArray(vacuum) ? vacuum : [];
  const safeActivity = Array.isArray(activity) ? activity : [];
  const safeLocks = Array.isArray(locks) ? locks : [];
  const totalDeadTuples = safeVacuum.reduce((acc, curr) => acc + parseInt(curr?.tuplas_muertas || 0), 0);
  const commitPercent = totalTrans === 0 ? 0 : (commits / totalTrans) * 100;

  // --- DATOS PARA GRÁFICAS ---
  // 1. Gráfica de Conexiones
  const dataConexiones = [
    { name: "Activas", valor: safeActivity.length, fill: "#3b82f6" },
    { name: "Disponibles", valor: maxConn - safeActivity.length, fill: "#374151" }
  ];

  // 2. Gráfica de Cache (Dona)
  const dataCache = [
    { name: "Aciertos (Hit)", value: cacheHit },
    { name: "Fallos (Miss)", value: 100 - cacheHit }
  ];
  const COLORS_CACHE = ["#10b981", "#ef4444"];

  // 3. Gráfica de Tuplas Muertas
  const dataVacuum = safeVacuum.map(v => ({
    name: v.tabla.replace('inventario.', '').replace('ventas.', '').replace('catalogo.', ''), 
    tuplas: parseInt(v.tuplas_muertas)
  })).slice(0, 5); // Tomamos solo el top 5 para no saturar la gráfica

  // Parseo de EXPLAIN
  let parsedExplain = null;
  let isSeqScan = false;
  try {
    if (explainResult) {
      const arr = JSON.parse(explainResult);
      parsedExplain = arr[0];
      isSeqScan = explainResult.includes("Seq Scan");
    }
  } catch(e) {}

  return (
    <AdminLayout pageTitle="Monitor Operativo" breadcrumb="Monitor de Rendimiento DB">
      
      {/* 1. SECCIÓN DE GRÁFICAS PRINCIPALES */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "30px" }}>
        
        {/* Gráfica 1: Conexiones */}
        <div style={{ background: "#161b22", padding: "20px", borderRadius: "12px", border: "1px solid #30363d" }}>
          <h4 style={{ color: "white", marginTop: 0, marginBottom: "15px", fontSize: "14px" }}>Carga de Conexiones ({safeActivity.length}/{maxConn})</h4>
          <div style={{ height: "200px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataConexiones} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: 'white' }} />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={25}>
                  {dataConexiones.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica 2: Cache Hit Ratio */}
        <div style={{ background: "#161b22", padding: "20px", borderRadius: "12px", border: "1px solid #30363d", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h4 style={{ color: "white", marginTop: 0, marginBottom: "5px", fontSize: "14px", width: "100%", textAlign: "left" }}>Salud de Memoria (Cache Hit)</h4>
          <div style={{ height: "200px", width: "100%", position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dataCache} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {dataCache.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS_CACHE[index % COLORS_CACHE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: 'white' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
              <span style={{ fontSize: "24px", fontWeight: "bold", color: cacheHit > 95 ? "#10b981" : "#ef4444" }}>{cacheHit}%</span>
            </div>
          </div>
        </div>

        {/* Gráfica 3: Tuplas Muertas (Top 5) */}
        <div style={{ background: "#161b22", padding: "20px", borderRadius: "12px", border: "1px solid #30363d" }}>
          <h4 style={{ color: "white", marginTop: 0, marginBottom: "15px", fontSize: "14px" }}>Top 5 Tablas con Tuplas Muertas</h4>
          <div style={{ height: "200px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataVacuum} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: 'white' }} />
                <Bar dataKey="tuplas" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 2. ALERTAS DE BLOQUEO (DEADLOCKS) */}
      {safeLocks.length > 0 && (
        <>
          <div className="adm-alert adm-alert-error">
            ⚠️ Alerta: Se han detectado procesos bloqueando la base de datos (Deadlocks). Notifique al administrador de la infraestructura.
          </div>
          <div className="adm-table-wrap" style={{ marginBottom: "28px" }}>
            <table className="adm-table">
              <thead>
                <tr><th>PID Bloqueador</th><th>PID Espera</th><th>Query Bloqueadora</th></tr>
              </thead>
              <tbody>
                {safeLocks.map((lock, i) => (
                  <tr key={i}>
                    <td><span className="adm-badge adm-badge-red">{lock.pid_bloqueador}</span></td>
                    <td>{lock.pid_espera}</td>
                    <td style={{ fontFamily: "monospace", color: "#8b949e" }}>{lock.query_bloqueadora}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 3. TABLA DE ACTIVIDAD EN VIVO */}
      <div className="adm-section-header">
        <h3 className="adm-section-title">Actividad de Conexiones en Vivo</h3>
      </div>
      <div className="adm-table-wrap" style={{ marginBottom: "28px" }}>
        <table className="adm-table">
          <thead>
            <tr><th>PID (Sesión)</th><th>Rol DB</th><th>Estado</th><th>Inicio</th><th>Última Query</th></tr>
          </thead>
          <tbody>
            {safeActivity.map((act) => (
              <tr key={act.pid}>
                <td>{act.pid}</td>
                <td>{act.usename}</td>
                <td>
                  <span className={`adm-badge ${act.state === 'idle in transaction' ? 'adm-badge-yellow' : 'adm-badge-green'}`}>
                    {act.state}
                  </span>
                </td>
                <td>{act.query_start ? new Date(act.query_start).toLocaleTimeString() : 'N/A'}</td>
                <td style={{ fontFamily: "monospace", color: "#8b949e", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={act.query}>
                  {act.query}
                </td>
              </tr>
            ))}
            {safeActivity.length === 0 && <tr><td colSpan="5" className="adm-empty">No hay actividad registrada.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* 4. SANDBOX DE DIAGNÓSTICO ESTRUCTURAL */}
      <div className="adm-section-header">
        <h3 className="adm-section-title">Sandbox de Diagnóstico Estructural</h3>
      </div>
      <div className="adm-form-group" style={{ marginBottom: "28px", background: "rgba(15,17,21,.5)", padding: "20px", borderRadius: "10px", border: "1px solid #30363d" }}>
        <label style={{ display: "block", fontSize: "12px", color: "#8b949e", marginBottom: "8px" }}>
          Selecciona un proceso del sistema para analizar su rendimiento (EXPLAIN ANALYZE):
        </label>
        
        <select 
          className="adm-select" 
          value={explainScenario} 
          onChange={(e) => setExplainScenario(e.target.value)}
          style={{ marginBottom: "15px" }}
        >
          <option value="productos">Análisis: Búsqueda cruzada de productos por descripción</option>
          <option value="clientes">Análisis: Búsqueda directa de clientes por correo electrónico</option>
        </select>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="adm-btn adm-btn-primary" onClick={handleExplain}>
            Ejecutar Diagnóstico
          </button>
        </div>
        
        {explainResult && (
          <div style={{ marginTop: "20px", background: "rgba(0,0,0,0.3)", padding: "20px", borderRadius: "8px", border: isSeqScan ? "1px solid #ef4444" : "1px solid #10b981" }}>
            
            <h4 style={{ margin: "0 0 15px 0", color: isSeqScan ? "#ef4444" : "#10b981", display: "flex", alignItems: "center", gap: "8px", fontSize: "15px" }}>
               {isSeqScan ? "⚠️ Búsqueda Ineficiente Detectada (Seq Scan)" : "✅ Plan de Ejecución Óptimo (Index Scan / Filter)"}
            </h4>
            
            {parsedExplain && parsedExplain.Plan ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "15px", marginBottom: "15px" }}>
                 <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid #30363d" }}>
                    <div style={{ fontSize: "11px", color: "#8b949e", textTransform: "uppercase", marginBottom: "4px" }}>Método de Búsqueda</div>
                    <div style={{ fontSize: "14px", fontWeight: "bold", color: isSeqScan ? "#ef4444" : "#fff" }}>{parsedExplain.Plan["Node Type"]}</div>
                 </div>
                 <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid #30363d" }}>
                    <div style={{ fontSize: "11px", color: "#8b949e", textTransform: "uppercase", marginBottom: "4px" }}>Costo Total</div>
                    <div style={{ fontSize: "14px", fontWeight: "bold", color: "#fff" }}>{parsedExplain.Plan["Total Cost"]}</div>
                 </div>
                 <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid #30363d" }}>
                    <div style={{ fontSize: "11px", color: "#8b949e", textTransform: "uppercase", marginBottom: "4px" }}>Tiempo de Ejecución</div>
                    <div style={{ fontSize: "14px", fontWeight: "bold", color: "#fff" }}>{parsedExplain["Execution Time"] ? `${parsedExplain["Execution Time"]} ms` : "N/A"}</div>
                 </div>
              </div>
            ) : (
              <p style={{ color: "#8b949e", fontSize: "13px" }}>{explainResult}</p>
            )}

            <details style={{ marginTop: "10px" }}>
              <summary style={{ color: "#3b82f6", fontSize: "12px", cursor: "pointer", outline: "none" }}>
                Ver JSON de respuesta técnica completa
              </summary>
              <pre style={{ margin: "10px 0 0 0", color: "#8b949e", fontSize: "11px", fontFamily: "monospace", overflowX: "auto", background: "#0a0c10", padding: "15px", borderRadius: "6px", border: "1px solid #30363d" }}>
                {explainResult}
              </pre>
            </details>

          </div>
        )}
      </div>

    </AdminLayout>
  );
}