import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import "../styles/admin.css";

export default function AdminMonitor() {
  const [activity, setActivity] = useState([]);
  const [maxConn, setMaxConn] = useState(100);
  const [locks, setLocks] = useState([]);
  const [health, setHealth] = useState({});
  const [vacuum, setVacuum] = useState([]);
  const [explainScenario, setExplainScenario] = useState("productos");
  const [explainResult, setExplainResult] = useState(null);

  const getHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${localStorage.getItem("token")}`
  });

  const fetchData = async () => {
    try {
      const baseUrl = "http://localhost:4000/api/admin/monitor"; 
      
      const [actRes, lockRes, healthRes, vacRes] = await Promise.all([
        fetch(`${baseUrl}/activity`, { headers: getHeaders() }),
        fetch(`${baseUrl}/locks`, { headers: getHeaders() }),
        fetch(`${baseUrl}/health`, { headers: getHeaders() }),
        fetch(`${baseUrl}/autovacuum`, { headers: getHeaders() })
      ]);

      if (actRes.ok) {
        const actData = await actRes.json();
        setActivity(Array.isArray(actData?.conexiones) ? actData.conexiones : []);
        setMaxConn(actData?.max_connections || 100);
      }
      if (lockRes.ok) {
        const lockData = await lockRes.json();
        setLocks(Array.isArray(lockData) ? lockData : []);
      }
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData || {});
      }
      if (vacRes.ok) {
        const vacData = await vacRes.json();
        setVacuum(Array.isArray(vacData) ? vacData : []);
      }
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
      const res = await fetch("http://localhost:4000/api/admin/monitor/explain", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ escenario: explainScenario })
      });
      const data = await res.json();
      setExplainResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setExplainResult("Error de conexión con el diagnóstico.");
    }
  };

  // --- VARIABLES PROTEGIDAS CONTRA CRASHES ---
  const safeHealth = health || {};
  const cacheHit = parseFloat(safeHealth.cache_hit_ratio) || 0;
  const isCacheHealthy = cacheHit > 95;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (cacheHit / 100) * circumference;
  
  const commits = parseInt(safeHealth.commits) || 0;
  const rollbacks = parseInt(safeHealth.rollbacks) || 0;
  const totalTrans = commits + rollbacks;
  
  const safeVacuum = Array.isArray(vacuum) ? vacuum : [];
  const safeActivity = Array.isArray(activity) ? activity : [];
  const safeLocks = Array.isArray(locks) ? locks : [];
  
  const totalDeadTuples = safeVacuum.reduce((acc, curr) => acc + parseInt(curr?.tuplas_muertas || 0), 0);
  const commitPercent = totalTrans === 0 ? 0 : (commits / totalTrans) * 100;

  // --- PARSEO INTELIGENTE DEL JSON DE EXPLAIN ---
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
      
      <div className="adm-stats-grid">
        <div className="adm-stat-card">
          <div className="adm-stat-icon blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <div>
            <div className="adm-stat-value">{safeActivity.length} <span style={{fontSize: "14px", color: "#8b949e"}}>/ {maxConn}</span></div>
            <div className="adm-stat-label">Conexiones Activas</div>
          </div>
        </div>

        <div className="adm-stat-card">
          <div className={`adm-stat-icon ${isCacheHealthy ? 'green' : 'red'}`}>
            <svg width="42" height="42" viewBox="0 0 50 50">
              <circle cx="25" cy="25" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
              <circle cx="25" cy="25" r={radius} fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} transform="rotate(-90 25 25)" style={{ transition: "stroke-dashoffset 0.5s" }} />
            </svg>
          </div>
          <div>
            <div className="adm-stat-value">{cacheHit}%</div>
            <div className="adm-stat-label">Cache Hit Ratio</div>
          </div>
        </div>

        <div className="adm-stat-card" style={{ flexWrap: "wrap" }}>
          <div className="adm-stat-icon blue">⚡</div>
          <div style={{ flex: 1, minWidth: "150px" }}>
            <div className="adm-stat-value">{totalTrans.toLocaleString()}</div>
            <div className="adm-stat-label">Total Transacciones</div>
            <div className="adm-stock-bar-wrap" style={{ marginTop: "10px" }}>
              <div className="adm-stock-bar">
                <div className={`adm-stock-fill ${commitPercent > 90 ? 'high' : 'medium'}`} style={{ width: `${commitPercent}%` }}></div>
              </div>
              <div className="adm-stock-num" style={{ color: rollbacks > 0 ? "#ef4444" : "#10b981" }}>
                {rollbacks > 0 ? `${rollbacks} err` : 'OK'}
              </div>
            </div>
          </div>
        </div>

        <div className="adm-stat-card">
          <div className={`adm-stat-icon ${totalDeadTuples > 5000 ? 'red' : 'yellow'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </div>
          <div>
            <div className="adm-stat-value">{totalDeadTuples.toLocaleString()}</div>
            <div className="adm-stat-label">Total Tuplas Muertas</div>
          </div>
        </div>
      </div>

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

      <div className="adm-section-header">
        <h3 className="adm-section-title">Salud del Almacenamiento (Autovacuum)</h3>
      </div>
      <div className="adm-table-wrap" style={{ marginBottom: "28px" }}>
        <table className="adm-table">
          <thead>
            <tr><th>Tabla Supervisada</th><th>Tuplas Muertas (n_dead_tup)</th><th>Última Limpieza Automática</th></tr>
          </thead>
          <tbody>
            {safeVacuum.map((v, i) => (
              <tr key={i}>
                <td style={{ fontWeight: "600", color: "#fff" }}>{v.tabla}</td>
                <td>
                  <span className={`adm-badge ${v.tuplas_muertas > 1000 ? 'adm-badge-red' : 'adm-badge-gray'}`}>
                    {v.tuplas_muertas}
                  </span>
                </td>
                <td style={{ color: "#8b949e" }}>{v.last_autovacuum ? new Date(v.last_autovacuum).toLocaleString() : "Sin registro"}</td>
              </tr>
            ))}
            {safeVacuum.length === 0 && <tr><td colSpan="3" className="adm-empty">No hay datos de mantenimiento.</td></tr>}
          </tbody>
        </table>
      </div>

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