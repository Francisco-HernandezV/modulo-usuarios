import { useState, useEffect } from "react";
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

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [actRes, lockRes, healthRes, vacRes, sizeRes] = await Promise.all([
        api.get("/admin/monitor/activity"),
        api.get("/admin/monitor/locks"),
        api.get("/admin/monitor/health"),
        api.get("/admin/monitor/autovacuum"),
        api.get("/admin/monitor/size")
      ]);

      setActivity(Array.isArray(actRes.data?.conexiones) ? actRes.data.conexiones : []);
      setMaxConn(actRes.data?.max_connections || 100);
      setLocks(Array.isArray(lockRes.data) ? lockRes.data : []);
      setHealth(healthRes.data || {});
      setVacuum(Array.isArray(vacRes.data) ? vacRes.data : []);
      setDbSize(sizeRes.data || { total_size: "0 MB", top_tables: [] });
      
    } catch (error) {
      console.error("Error obteniendo métricas:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000); 
    return () => clearInterval(interval);
  }, []);

  // Función para calcular el tiempo transcurrido de una consulta en vivo
  const getDuration = (startTime) => {
    if (!startTime) return "—";
    const seconds = Math.floor((new Date() - new Date(startTime)) / 1000);
    if (seconds < 60) return `${seconds} seg`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  // --- PROCESAMIENTO DE DATOS ---
  const cacheHit = parseFloat(health.cache_hit_ratio) || 0;
  const commits = parseInt(health.commits) || 0;
  const rollbacks = parseInt(health.rollbacks) || 0;
  
  const dataConexiones = [
    { name: "Activas", valor: activity.length, fill: "#3b82f6" },
    { name: "Disponibles", valor: maxConn - activity.length, fill: "#374151" }
  ];

  const dataSalud = [
    { name: "Caché OK", value: cacheHit },
    { name: "Lectura Disco", value: 100 - cacheHit }
  ];
  const COLORS_PIE = ["#10b981", "#ef4444"];

  const dataTransacciones = [
    { name: "Éxito (Commits)", value: commits },
    { name: "Reversiones (Rollbacks)", value: rollbacks }
  ];
  const COLORS_TRANS = ["#3b82f6", "#f59e0b"];

  const dataTablas = vacuum.map(v => ({
    name: v.tabla.split('.').pop(), 
    tuplas: parseInt(v.tuplas_muertas)
  })).slice(0, 5);

  // Data para Operaciones CRUD
  const dataOperaciones = [
    { name: "Consultas", valor: parseInt(health.selects) || 0, fill: "#8b5cf6" }, 
    { name: "Inserciones", valor: parseInt(health.inserts) || 0, fill: "#10b981" }, 
    { name: "Actualizaciones", valor: parseInt(health.updates) || 0, fill: "#f59e0b" }, 
    { name: "Eliminaciones", valor: parseInt(health.deletes) || 0, fill: "#ef4444" }  
  ];

  return (
    <AdminLayout pageTitle="Monitor Operativo DB" breadcrumb="Sistema">
      
      {/* TOOLBAR SUPERIOR (Solo botón Refrescar) */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
        <button className="adm-btn adm-btn-primary" onClick={fetchData} disabled={isRefreshing} type="button">
          <IconRefresh /> {isRefreshing ? "Sincronizando..." : "Sincronizar Ahora"}
        </button>
      </div>

      {/* 1. DASHBOARD DE GRÁFICAS PRINCIPALES */}
      <div className="adm-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginBottom: "20px" }}>
        
        {/* Gráfica: Conexiones */}
        <div className="adm-stat-card" style={{ flexDirection: "column" }}>
          <h4 style={{ fontSize: "13px", color: "#8b949e", marginBottom: "15px" }}>CONEXIONES (LÍMITE: {maxConn})</h4>
          <div style={{ height: "200px", width: "100%" }}>
            <ResponsiveContainer>
              <BarChart data={dataConexiones} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{fill: '#8b949e', fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{backgroundColor: '#161b22', border: '1px solid #30363d'}} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={25}>
                  {dataConexiones.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="valor" position="right" fill="#fff" fontSize={13} fontWeight="bold" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica: Cache Hit Ratio */}
        <div className="adm-stat-card" style={{ flexDirection: "column", alignItems: "center" }}>
          <h4 style={{ fontSize: "13px", color: "#8b949e", marginBottom: "5px", width: "100%" }}>SALUD DE MEMORIA</h4>
          <div style={{ height: "200px", width: "100%", position: "relative" }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={dataSalud} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {dataSalud.map((entry, index) => <Cell key={index} fill={COLORS_PIE[index]} />)}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#161b22', border: '1px solid #30363d'}} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "26px", fontWeight: "900", color: cacheHit > 90 ? "#10b981" : "#ef4444" }}>
              {cacheHit}%
            </div>
          </div>
        </div>

        {/* Gráfica: Transacciones */}
        <div className="adm-stat-card" style={{ flexDirection: "column", alignItems: "center" }}>
          <h4 style={{ fontSize: "13px", color: "#8b949e", marginBottom: "5px", width: "100%" }}>TASA DE TRANSACCIONES</h4>
          <div style={{ height: "200px", width: "100%" }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={dataTransacciones} innerRadius={0} outerRadius={80} dataKey="value" stroke="none">
                  {dataTransacciones.map((entry, index) => <Cell key={index} fill={COLORS_TRANS[index]} />)}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#161b22', border: '1px solid #30363d'}} />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "12px", color: "#8b949e" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 2. TAMAÑO FÍSICO Y TUPLAS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px", marginBottom: "30px" }}>
        <div className="adm-stat-card" style={{ flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "#8b949e", textTransform: "uppercase" }}>Peso Total Base de Datos</div>
          <div style={{ fontSize: "42px", fontWeight: "900", color: "#3b82f6", margin: "10px 0" }}>{dbSize.total_size}</div>
          <div style={{ fontSize: "11px", color: "#10b981" }}>Infraestructura en Render Cloud</div>
        </div>

        <div className="adm-stat-card" style={{ flexDirection: "column" }}>
          <h4 style={{ fontSize: "13px", color: "#8b949e", marginBottom: "15px" }}>TABLAS CON TUPLAS MUERTAS</h4>
          <div style={{ height: "180px", width: "100%" }}>
            <ResponsiveContainer>
              <BarChart data={dataTablas} layout="vertical" margin={{ top: 5, right: 40, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#30363d" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fill: '#8b949e', fontSize: 11}} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d' }} />
                <Bar dataKey="tuplas" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={25}>
                  <LabelList dataKey="tuplas" position="right" fill="#fff" fontSize={12} fontWeight="bold" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 🔥 3. NUEVO: VOLUMEN DE OPERACIONES CRUD (Limpio y automático) */}
      <div className="adm-section-header">
        <h3 className="adm-section-title">Volumen de Operaciones (Lectura vs Escritura)</h3>
      </div>
      <div className="adm-stat-card" style={{ flexDirection: "column", marginBottom: "40px" }}>
        <h4 style={{ fontSize: "13px", color: "#8b949e", marginBottom: "20px" }}>DESGLOSE DE CONSULTAS (HOY)</h4>
        <div style={{ height: "250px", width: "100%" }}>
          <ResponsiveContainer>
            <BarChart data={dataOperaciones} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
              <XAxis dataKey="name" tick={{fill: '#8b949e', fontSize: 12}} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{backgroundColor: '#161b22', border: '1px solid #30363d'}} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]} barSize={50}>
                {dataOperaciones.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <LabelList dataKey="valor" position="top" fill="#fff" fontSize={14} fontWeight="bold" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. ALERTAS DE BLOQUEO (DEADLOCKS) */}
      {locks.length > 0 && (
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
                {locks.map((lock, i) => (
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

      {/* 5. TABLA DE ACTIVIDAD */}
      <div className="adm-section-header">
        <h3 className="adm-section-title">Sesiones y Procesos Activos</h3>
        {locks.length > 0 && <span className="adm-badge adm-badge-red">⚠ {locks.length} BLOQUEOS DETECTADOS</span>}
      </div>
      <div className="adm-table-wrap" style={{ marginBottom: "30px" }}>
        <table className="adm-table">
          <thead>
            <tr><th>PID</th><th>Usuario</th><th>Estado</th><th>Tiempo Activo</th><th>Consulta Actual</th></tr>
          </thead>
          <tbody>
            {activity.map(act => (
              <tr key={act.pid}>
                <td style={{ fontFamily: "monospace", color: "#3b82f6", fontWeight: "bold" }}>{act.pid}</td>
                <td>{act.usename}</td>
                <td><span className={`adm-badge ${act.state?.includes('idle') ? 'adm-badge-gray' : 'adm-badge-green'}`}>{act.state}</span></td>
                <td style={{ color: "#d1d5db", fontSize: "12px", fontWeight: "600" }}>{getDuration(act.query_start)}</td>
                <td style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: "11px", color: "#9ca3af" }} title={act.query}>{act.query}</td>
              </tr>
            ))}
            {activity.length === 0 && <tr><td colSpan="5" className="adm-empty">No hay actividad registrada en este momento.</td></tr>}
          </tbody>
        </table>
      </div>

    </AdminLayout>
  );
}