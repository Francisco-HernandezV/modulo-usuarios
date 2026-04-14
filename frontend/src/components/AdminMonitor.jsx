import { useState, useEffect, useCallback } from "react";
import AdminLayout from "./AdminLayout";
import api from "../services/api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, LabelList, Legend 
} from "recharts";
import "../styles/admin.css";

const IconRefresh = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 2.13-5.83L2 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 1 0-2.13 5.83L22 16"/></svg>;

export default function AdminMonitor() {
  const [activity, setActivity] = useState([]);
  const [maxConn, setMaxConn] = useState(100);
  const [locks, setLocks] = useState([]);
  const [health, setHealth] = useState({});
  const [vacuum, setVacuum] = useState([]);
  const [dbSize, setDbSize] = useState({ total_size: "0 MB", top_tables: [] });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [authError, setAuthError] = useState(false);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    setAuthError(false);
    try {
      // 🔥 ESCUDOS ANTI-FALLOS AÑADIDOS DE VUELTA
      // Si el servidor de producción aún no tiene la ruta, no explota, pone valores por defecto.
      const [actRes, lockRes, healthRes, vacRes, sizeRes] = await Promise.all([
        api.get("/admin/monitor/activity").catch(() => ({ data: { conexiones: [] } })),
        api.get("/admin/monitor/locks").catch(() => ({ data: [] })),
        api.get("/admin/monitor/health").catch(() => ({ data: {} })),
        api.get("/admin/monitor/autovacuum").catch(() => ({ data: [] })),
        api.get("/admin/monitor/size").catch(() => ({ data: { total_size: "Calculando...", top_tables: [] } }))
      ]);

      setActivity(actRes.data?.conexiones || []);
      setMaxConn(actRes.data?.max_connections || 100);
      setLocks(lockRes.data || []);
      setHealth(healthRes.data || {});
      setVacuum(vacRes.data || []);
      setDbSize(sizeRes.data || { total_size: "0 MB", top_tables: [] });
      
      setHasData(true); // Siempre mostramos la pantalla aunque falte 1 dato
    } catch (error) {
      console.error("Error en monitor:", error);
      if (error.response?.status === 401) setAuthError(true);
      setHasData(true); // Descongela la pantalla en caso de error crítico
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getDuration = (startTime) => {
    if (!startTime) return "—";
    const seconds = Math.floor((new Date() - new Date(startTime)) / 1000);
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m`;
  };

  // --- PREPARACIÓN DE DATOS PARA GRÁFICAS ---
  const cacheHit = parseFloat(health.cache_hit_ratio) || 0;
  const commits = parseInt(health.commits) || 0;
  const rollbacks = parseInt(health.rollbacks) || 0;

  const dataConexiones = [
    { name: "Activas", valor: activity.length, fill: "#3b82f6" },
    { name: "Disponibles", valor: Math.max(0, maxConn - activity.length), fill: "#1f2937" }
  ];

  const dataSalud = [
    { name: "Cache OK", value: cacheHit },
    { name: "Lectura Disco", value: Math.max(0, 100 - cacheHit) }
  ];

  const dataTransacciones = [
    { name: "Éxito (Commits)", value: commits },
    { name: "Fallas (Rollbacks)", value: rollbacks }
  ];

  const dataTablas = vacuum.map(v => ({
    name: v.tabla.split('.').pop(), 
    tuplas: parseInt(v.tuplas_muertas)
  })).slice(0, 5);

  if (authError) {
    return (
      <AdminLayout pageTitle="Error de Acceso">
        <div className="adm-alert adm-alert-error">Sesión expirada o sin permisos. Por favor, re-inicia sesión.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Monitor Operativo DB" breadcrumb="Sistema">
      
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
        <button className="adm-btn adm-btn-primary" onClick={fetchData} disabled={isRefreshing}>
          <IconRefresh /> {isRefreshing ? "Cargando..." : "Sincronizar Ahora"}
        </button>
      </div>

      {!hasData ? (
        <div className="adm-stat-card">Sincronizando con PostgreSQL...</div>
      ) : (
        <>
          <div className="adm-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "20px" }}>
            
            <div className="adm-stat-card" style={{ flexDirection: "column", height: "350px" }}>
              <h4 style={{ fontSize: "12px", color: "#8b949e", marginBottom: "20px" }}>CONEXIONES ({activity.length}/{maxConn})</h4>
              <div style={{ width: "100%", height: "250px" }}>
                <ResponsiveContainer>
                  <BarChart data={dataConexiones} layout="vertical" margin={{ right: 40 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{fill: '#8b949e', fontSize: 12}} width={70} />
                    <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={30}>
                      {dataConexiones.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      <LabelList dataKey="valor" position="right" fill="#fff" fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="adm-stat-card" style={{ flexDirection: "column", alignItems: "center", height: "350px" }}>
              <h4 style={{ fontSize: "12px", color: "#8b949e", marginBottom: "10px" }}>HIT RATIO (MEMORIA)</h4>
              <div style={{ width: "100%", height: "250px", position: "relative" }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={dataSalud} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                      <Cell fill="#10b981" /><Cell fill="#1f2937" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                  <div style={{ fontSize: "24px", fontWeight: "900", color: "#10b981" }}>{cacheHit}%</div>
                </div>
              </div>
            </div>

            <div className="adm-stat-card" style={{ flexDirection: "column", alignItems: "center", height: "350px" }}>
              <h4 style={{ fontSize: "12px", color: "#8b949e", marginBottom: "10px" }}>TASA DE TRANSACCIONES</h4>
              <div style={{ width: "100%", height: "250px", position: "relative" }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={dataTransacciones} innerRadius={0} outerRadius={70} dataKey="value" stroke="none">
                      <Cell fill="#3b82f6" />
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip contentStyle={{backgroundColor: '#161b22', border: 'none'}} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: "absolute", top: "42%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none" }}>
                  <div style={{ fontSize: "18px", fontWeight: "900", color: "#fff" }}>{commits}</div>
                  <div style={{ fontSize: "8px", color: "#8b949e" }}>COMMITS</div>
                </div>
              </div>
            </div>

          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px", marginBottom: "30px" }}>
            <div className="adm-stat-card" style={{ flexDirection: "column", justifyContent: "center", textAlign: "center", minHeight: "220px" }}>
              <div style={{ fontSize: "12px", color: "#8b949e" }}>PESO TOTAL DB</div>
              <div style={{ fontSize: "38px", fontWeight: "900", color: "#3b82f6", margin: "10px 0" }}>{dbSize.total_size}</div>
            </div>

            <div className="adm-stat-card" style={{ flexDirection: "column", minHeight: "220px" }}>
              <h4 style={{ fontSize: "12px", color: "#8b949e", marginBottom: "15px" }}>FRAGMENTACIÓN DE TABLAS</h4>
              <div style={{ width: "100%", height: "150px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataTablas} layout="vertical" margin={{ right: 50 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{fill: '#8b949e', fontSize: 11}} axisLine={false} />
                    <Bar dataKey="tuplas" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={15}>
                      <LabelList dataKey="tuplas" position="right" fill="#fff" fontSize={10} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="adm-section-header">
            <h3 className="adm-section-title">Sesiones en Tiempo Real</h3>
            {locks.length > 0 && <span className="adm-badge adm-badge-red">⚠ {locks.length} BLOQUEOS</span>}
          </div>
          <div className="adm-table-wrap" style={{ marginBottom: "40px" }}>
            <table className="adm-table">
              <thead>
                <tr><th>PID</th><th>Usuario</th><th>Estado</th><th>Tiempo</th><th>Consulta</th></tr>
              </thead>
              <tbody>
                {activity.map(act => (
                  <tr key={act.pid}>
                    <td style={{ color: "#3b82f6", fontWeight: "bold" }}>{act.pid}</td>
                    <td>{act.usename}</td>
                    <td><span className={`adm-badge ${act.state === 'active' ? 'adm-badge-green' : 'adm-badge-gray'}`}>{act.state}</span></td>
                    <td>{getDuration(act.query_start)}</td>
                    <td style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "11px", color: "#9ca3af", fontFamily: "monospace" }}>{act.query}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminLayout>
  );
}