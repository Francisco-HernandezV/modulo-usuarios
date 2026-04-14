import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../services/api";
import "../../styles/theme.css";

import FormularioBasico from "../../components/catalogos/FormularioBasico";
import FormularioColor from "../../components/catalogos/FormularioColor";
import FormularioTallas from "../../components/catalogos/FormularioTallas";

const IconPlus  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconEdit  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const IconX     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconUpload = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;

// Colores de badge por tipo de talla
const TIPO_BADGE_STYLE = {
  "Ropa":    { background: "#1e3a5f", color: "#93c5fd" },
  "Calzado": { background: "#1a3a2a", color: "#6ee7b7" },
  "Pantalón":{ background: "#3b2a1a", color: "#fcd34d" },
};
const defaultBadge = { background: "#2d2d2d", color: "#d1d5db" };

const TABS = ["categorias", "marcas", "departamentos", "colores", "tallas"];

// Funciones para alertas
const getAlertClass = (type) => type === "success" ? "adm-alert-success" : "adm-alert-error";
const getAlertIcon = (type) => type === "success" ? "✓" : "✕";

export default function AdminCatalogos() {
  const [tabActiva, setTabActiva]           = useState("categorias");
  const [datos, setDatos]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [confirmDel, setConfirmDel]         = useState(null);
  const [isImporting, setIsImporting]       = useState(false);
  const [alertMsg, setAlertMsg]             = useState(null); // 🔥 Estado para alertas visuales

  const cargarDatos = async (tab) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/${tab}`);
      setDatos(res.data);
    } catch (error) {
      console.error(`Error cargando ${tab}:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos(tabActiva);
    setMostrarFormulario(false);
    setConfirmDel(null);
  }, [tabActiva]);

  // 🔥 Auto-ocultar la alerta después de 4 segundos
  useEffect(() => {
    if (!alertMsg) return;
    const t = setTimeout(() => setAlertMsg(null), 4000);
    return () => clearTimeout(t);
  }, [alertMsg]);

  const handleAgregar = async (payload) => {
    try {
      const res = await api.post(`/admin/${tabActiva}`, payload);

      if (tabActiva === "tallas") {
        const { duplicadas = [] } = res.data;
        if (duplicadas.length > 0) {
          setAlertMsg({ type: "success", msg: `Tallas guardadas. Se omitieron las que ya existían: ${duplicadas.join(", ")}` });
        } else {
          setAlertMsg({ type: "success", msg: "Registro creado exitosamente." });
        }
      } else {
        setAlertMsg({ type: "success", msg: "Registro creado exitosamente." });
      }

      setMostrarFormulario(false);
      cargarDatos(tabActiva);
    } catch (error) {
      setAlertMsg({ type: "error", msg: error.response?.data?.message || "Error al agregar. Puede que ya exista." });
    }
  };

  const handleEliminarConfirmado = async () => {
    if (!confirmDel) return;
    try {
      await api.delete(`/admin/${tabActiva}/${confirmDel}`);
      setAlertMsg({ type: "success", msg: "Registro eliminado correctamente." });
      setConfirmDel(null);
      cargarDatos(tabActiva);
    } catch (error) {
      setAlertMsg({ type: "error", msg: error.response?.data?.message || "Error al eliminar. Es posible que esté en uso." });
      setConfirmDel(null);
    }
  };

  const handleEditar = (item) => {
    setAlertMsg({ type: "error", msg: `La edición para "${item.nombre || item.valor}" estará disponible pronto.` });
  };

  // 🔥 Importación con alertas visuales
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("archivo", file);
    
    try {
      setIsImporting(true);
      const res = await api.post("/admin/catalogos/importar", formData);
      setAlertMsg({ type: "success", msg: res.data.message });
      cargarDatos(tabActiva); 
    } catch (err) {
      console.error(err);
      setAlertMsg({ type: "error", msg: err.response?.data?.message || "Error al importar el archivo." });
    } finally {
      setIsImporting(false);
      e.target.value = null;
    }
  };

  const renderFilas = () => {
    if (datos.length === 0) {
      const cols = tabActiva === "colores" ? 4 : tabActiva === "tallas" ? 3 : 3;
      return (
        <tr>
          <td colSpan={cols} style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
            No hay registros.
          </td>
        </tr>
      );
    }

    if (tabActiva === "tallas") {
      return datos.reduce((acc, item, idx) => {
        const prevTipo = idx > 0 ? datos[idx - 1].tipo_nombre : null;

        if (item.tipo_nombre !== prevTipo) {
          const count = datos.filter(d => d.tipo_nombre === item.tipo_nombre).length;
          acc.push(
            <tr key={`g-${item.tipo_nombre}`} style={{ background: "#161d2b" }}>
              <td colSpan={3} style={{ padding: "6px 15px", color: "#6b7280", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {item.tipo_nombre}
                <span style={{ marginLeft: "8px", background: "#374151", color: "#9ca3af", borderRadius: "20px", padding: "1px 7px", fontSize: "11px" }}>{count}</span>
              </td>
            </tr>
          );
        }

        const badgeStyle = TIPO_BADGE_STYLE[item.tipo_nombre] || defaultBadge;
        acc.push(
          <tr key={item.id} style={{ borderBottom: "1px solid #374151" }}>
            <td style={{ padding: "13px 15px" }}>
              <span style={{ ...badgeStyle, padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "500" }}>
                {item.tipo_nombre}
              </span>
            </td>
            <td style={{ padding: "13px 15px", fontWeight: "500", color: "white" }}>{item.valor}</td>
            <td style={{ padding: "13px 15px", textAlign: "right" }}>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => handleEditar(item)} title="Editar" style={{ padding: "6px 10px" }}>
                  <IconEdit />
                </button>
                <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setConfirmDel(item.id)} title="Eliminar" style={{ padding: "6px 10px" }}>
                  <IconTrash />
                </button>
              </div>
            </td>
          </tr>
        );
        return acc;
      }, []);
    }

    return datos.map((item) => (
      <tr key={item.id} style={{ borderBottom: "1px solid #374151" }}>
        <td style={{ padding: "15px", fontWeight: "500", color: "white" }}>{item.nombre}</td>
        {tabActiva === "colores" && (
          <td style={{ padding: "15px", textAlign: "center" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: item.codigo_hex || "#ccc", margin: "0 auto", border: "1px solid #4b5563" }} title={item.codigo_hex} />
          </td>
        )}
        <td style={{ padding: "15px", textAlign: "center" }}>
          <span className={`adm-badge ${item.activo ? "adm-badge-green" : "adm-badge-gray"}`}>
            {item.activo ? "Activo" : "Inactivo"}
          </span>
        </td>
        <td style={{ padding: "15px", textAlign: "right" }}>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => handleEditar(item)} title="Editar" style={{ padding: "6px 10px" }}>
              <IconEdit />
            </button>
            <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setConfirmDel(item.id)} title="Eliminar" style={{ padding: "6px 10px" }}>
              <IconTrash />
            </button>
          </div>
        </td>
      </tr>
    ));
  };

  const renderEncabezado = () => {
    if (tabActiva === "tallas") {
      return (
        <tr style={{ borderBottom: "1px solid #374151", background: "#1f2937" }}>
          <th style={{ padding: "15px", textAlign: "left", color: "#d1d5db" }}>Tipo</th>
          <th style={{ padding: "15px", textAlign: "left", color: "#d1d5db" }}>Valor</th>
          <th style={{ padding: "15px", textAlign: "right", color: "#d1d5db" }}>Acciones</th>
        </tr>
      );
    }
    return (
      <tr style={{ borderBottom: "1px solid #374151", background: "#1f2937" }}>
        <th style={{ padding: "15px", textAlign: "left", color: "#d1d5db" }}>Nombre</th>
        {tabActiva === "colores" && <th style={{ padding: "15px", textAlign: "center", color: "#d1d5db" }}>Color</th>}
        <th style={{ padding: "15px", textAlign: "center", color: "#d1d5db" }}>Estado</th>
        <th style={{ padding: "15px", textAlign: "right", color: "#d1d5db" }}>Acciones</th>
      </tr>
    );
  };

  const renderFormulario = () => {
    if (!mostrarFormulario) return null;
    if (tabActiva === "colores")  return <FormularioColor  onSubmit={handleAgregar} onCancel={() => setMostrarFormulario(false)} />;
    if (tabActiva === "tallas")   return <FormularioTallas onSubmit={handleAgregar} onCancel={() => setMostrarFormulario(false)} />;
    return <FormularioBasico tabActiva={tabActiva} onSubmit={handleAgregar} onCancel={() => setMostrarFormulario(false)} />;
  };

  return (
    <AdminLayout pageTitle="Catálogos Base" breadcrumb="Catálogos">
      
      {/* 🔥 Renderizamos la alerta visual aquí arriba */}
      {alertMsg && (
        <div className={`adm-alert ${getAlertClass(alertMsg.type)}`} style={{ maxWidth: "1000px", margin: "0 auto 20px" }}>
          {getAlertIcon(alertMsg.type)} {alertMsg.msg}
        </div>
      )}

      <div style={{ maxWidth: "1000px", margin: "0 auto", position: "relative" }}>

        <h3 style={{ marginBottom: "20px", color: "white", fontSize: "1.2rem", fontWeight: "600" }}>
          Gestión de catálogos
        </h3>

        {/* Tabs */}
        <div style={{ display: "flex", border: "1px solid #374151", borderRadius: "8px", overflow: "hidden", marginBottom: "40px" }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setTabActiva(tab)}
              style={{
                flex: 1, padding: "14px 0",
                background: tabActiva === tab ? "#1f2937" : "transparent",
                color: tabActiva === tab ? "white" : "#9ca3af",
                border: "none", borderRight: "1px solid #374151",
                cursor: "pointer", textTransform: "capitalize",
                fontWeight: tabActiva === tab ? "600" : "400",
                transition: "all 0.2s"
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
          <p style={{ color: "#9ca3af", fontSize: "0.9rem", margin: 0 }}>
            {datos.length} {tabActiva === "tallas" ? "tallas registradas" : "registros"}
          </p>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <label className={`adm-btn adm-btn-ghost ${isImporting ? 'disabled' : ''}`} style={{ cursor: isImporting ? "not-allowed" : "pointer", margin: 0 }}>
              {isImporting ? "Importando..." : <><IconUpload /> Importar Catálogos (Excel)</>}
              <input type="file" accept=".xlsx, .xls" style={{ display: "none" }} onChange={handleImportExcel} disabled={isImporting} />
            </label>

            <button className="adm-btn adm-btn-primary" onClick={() => setMostrarFormulario(true)} style={{ borderRadius: "8px", padding: "10px 20px" }}>
              <IconPlus /> Agregar {tabActiva === "tallas" ? "tallas" : "nuevo"}
            </button>
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="adm-empty"><p>Cargando catálogo...</p></div>
        ) : (
          <div className="adm-table-wrap" style={{ border: "1px solid #374151", borderRadius: "8px" }}>
            <table className="adm-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>{renderEncabezado()}</thead>
              <tbody>{renderFilas()}</tbody>
            </table>
          </div>
        )}

        {/* Formulario modal */}
        {renderFormulario()}

        {/* Modal confirmación eliminación */}
        {confirmDel && (
          <div className="adm-modal-overlay" onClick={() => setConfirmDel(null)}>
            <div className="adm-modal" style={{ maxWidth: "380px" }} onClick={e => e.stopPropagation()}>
              <div className="adm-modal-header">
                <h3 className="adm-modal-title">Confirmar eliminación</h3>
                <button className="adm-modal-close" onClick={() => setConfirmDel(null)} type="button"><IconX /></button>
              </div>
              <div className="adm-modal-body">
                <p style={{ fontSize: "14px", color: "#9ca3af", lineHeight: 1.6, marginBottom: "20px" }}>
                  ¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button className="adm-btn adm-btn-ghost" onClick={() => setConfirmDel(null)}>Cancelar</button>
                  <button className="adm-btn adm-btn-danger" onClick={handleEliminarConfirmado}>Sí, eliminar</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}