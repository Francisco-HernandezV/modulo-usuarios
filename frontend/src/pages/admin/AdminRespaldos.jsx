import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../services/api";

const IconDownload = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IconDatabase = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>;

export default function AdminRespaldos() {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);

  const cargarHistorial = async () => {
    try {
      const res = await api.get("/admin/respaldos");
      setHistorial(res.data || []);
    } catch (error) {
      console.error("Error al cargar el historial:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  const handleIniciarRespaldo = () => {
    setGenerando(true);
    
    // Al ser una descarga de archivo, podemos crear un enlace temporal y simular el clic
    const url = `${api.defaults.baseURL}/admin/respaldos/generar`;
    
    const link = document.createElement("a");
    link.href = url;
    // Agregamos el token si tu ruta requiere autenticación
    link.setAttribute("download", ""); 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Damos un pequeño tiempo para recargar la tabla y ver el nuevo registro
    setTimeout(() => {
      cargarHistorial();
      setGenerando(false);
    }, 3000);
  };

  const formatearFecha = (fechaRaw) => {
    const date = new Date(fechaRaw);
    return date.toLocaleDateString("es-MX");
  };

  const formatearHora = (fechaRaw) => {
    const date = new Date(fechaRaw);
    return date.toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AdminLayout pageTitle="Gestión de Respaldos" breadcrumb="Respaldos DB">
      
      {/* SECCIÓN SUPERIOR: Generador de respaldo */}
      <div style={{
        backgroundColor: "#1f2937",
        border: "1px solid #374151",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "30px"
      }}>
        <h3 style={{ margin: "0 0 15px 0", fontSize: "16px", color: "white" }}>
          Generar nueva copia de seguridad
        </h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "600px" }}>
          <label style={{ fontSize: "13px", color: "#9ca3af" }}>Seleccionar ubicación del respaldo:</label>
          
          <div style={{ display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap" }}>
            <input 
              type="text" 
              className="adm-input" 
              value="Carpeta predeterminada de descargas del navegador" 
              disabled 
              style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.05)", color: "#8b949e", cursor: "not-allowed" }}
            />
            <button 
              className="adm-btn adm-btn-primary" 
              onClick={handleIniciarRespaldo}
              disabled={generando}
              type="button"
            >
              {generando ? "Generando..." : <><IconDownload /> Iniciar respaldo</>}
            </button>
          </div>
          <small style={{ color: "#6b7280", fontSize: "11px" }}>
            Por motivos de seguridad, el archivo .backup se descargará automáticamente usando el gestor de tu navegador web.
          </small>
        </div>
      </div>

      {/* SECCIÓN INFERIOR: Historial */}
      <div className="adm-section-header">
        <h3 className="adm-section-title">
          <IconDatabase /> Historial de respaldos
        </h3>
      </div>

      {loading ? (
        <div className="adm-empty"><p>Cargando historial...</p></div>
      ) : historial.length === 0 ? (
        <div className="adm-empty">
          <div className="adm-empty-icon">📂</div>
          <p>Aún no se han generado respaldos de la base de datos.</p>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Nombre del respaldo</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Ubicación</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((reg) => (
                <tr key={reg.id}>
                  <td style={{ fontWeight: 600, color: "#3b82f6", fontFamily: "monospace", fontSize: "12px" }}>
                    {reg.nombre_archivo}
                  </td>
                  <td>{formatearFecha(reg.fecha_generacion)}</td>
                  <td>{formatearHora(reg.fecha_generacion)}</td>
                  <td style={{ color: "var(--text-muted,#8b949e)", fontSize: "13px" }}>
                    {reg.ubicacion_destino}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}