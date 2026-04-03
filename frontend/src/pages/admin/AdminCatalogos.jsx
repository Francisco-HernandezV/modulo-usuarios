import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../services/api";
import "../../styles/theme.css";

function AdminCatalogos() {
  const [tabActiva, setTabActiva] = useState("marcas");
  const [datos, setDatos] = useState([]);
  const [nuevoItem, setNuevoItem] = useState("");
  const [loading, setLoading] = useState(true);

  const cargarDatos = async (endpoint) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/${endpoint}`);
      setDatos(res.data);
    } catch (error) {
      console.error(`Error cargando ${endpoint}:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos(tabActiva);
  }, [tabActiva]);

  const handleAgregar = async (e) => {
    e.preventDefault();
    if (!nuevoItem.trim()) return;
    try {
      await api.post(`/admin/${tabActiva}`, { nombre: nuevoItem });
      setNuevoItem("");
      cargarDatos(tabActiva); // Recargar la lista
    } catch (error) {
      alert("Error al agregar elemento. Puede que ya exista.");
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este registro?")) return;
    try {
      await api.delete(`/admin/${tabActiva}/${id}`);
      cargarDatos(tabActiva);
    } catch (error) {
      alert("Error al eliminar. Es posible que esté en uso por algún producto.");
    }
  };

  return (
    <AdminLayout pageTitle="Catálogos Base" breadcrumb="Catálogos">
      <div className="adm-section-header">
        <h3 className="adm-section-title">Gestión de Catálogos Base</h3>
      </div>
      <p style={{ color: "var(--text-muted,#8b949e)", marginBottom: "20px" }}>
        Administra las opciones (marcas, colores, departamentos, etc.) que aparecerán en el creador de productos.
      </p>

      {/* Menú de Pestañas */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #333", paddingBottom: "10px", flexWrap: "wrap" }}>
        {["marcas", "departamentos", "categorias", "colores"].map((tab) => (
          <button
            key={tab}
            onClick={() => setTabActiva(tab)}
            style={{
              padding: "8px 16px",
              background: tabActiva === tab ? "#3b82f6" : "transparent",
              color: tabActiva === tab ? "white" : "#8b949e",
              border: tabActiva === tab ? "none" : "1px solid #333",
              borderRadius: "4px",
              cursor: "pointer",
              textTransform: "capitalize",
              fontWeight: tabActiva === tab ? "bold" : "normal",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Formulario rápido de creación */}
      <form onSubmit={handleAgregar} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder={`Nueva ${tabActiva.slice(0, -1)}...`}
          value={nuevoItem}
          onChange={(e) => setNuevoItem(e.target.value)}
          style={{ flex: 1, padding: "10px", borderRadius: "4px", border: "1px solid #333", background: "#111827", color: "white" }}
        />
        <button type="submit" className="adm-btn adm-btn-primary" style={{ padding: "10px 20px" }}>
          + Agregar
        </button>
      </form>

      {/* Tabla de Resultados */}
      {loading ? (
        <div className="adm-empty"><p>Cargando datos...</p></div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th style={{textTransform: "capitalize"}}>Nombre de {tabActiva.slice(0, -1)}</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((item) => (
                <tr key={item.id}>
                  <td style={{ color: "#8b949e", width: "80px" }}>{item.id}</td>
                  <td style={{ fontWeight: "bold" }}>{item.nombre}</td>
                  <td>
                    <span className={`adm-badge ${item.activo ? "adm-badge-green" : "adm-badge-gray"}`}>
                      {item.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="adm-btn adm-btn-danger adm-btn-sm"
                      onClick={() => handleEliminar(item.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {datos.length === 0 && (
                <tr><td colSpan="4" style={{textAlign: "center", padding: "20px"}}>No hay registros en este catálogo.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminCatalogos;