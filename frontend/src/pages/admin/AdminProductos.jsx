import { useState, useEffect, useRef } from "react"; 
import AdminLayout from "../../components/AdminLayout";
import api from "../../services/api";

const IconX     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconEdit  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const IconPlus  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconImport = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const IconExport = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;

const EMPTY_FORM = {
  nombre: "", descripcion: "", precio_base: "", costo: "", categoria_id: "", activo: true,
};

const getMargenBadgeClass = (margen) => {
  const m = Number(margen);
  if (m >= 40) return "adm-badge-green";
  if (m >= 20) return "adm-badge-yellow";
  return "adm-badge-red";
};

const getAlertClass = (type) => type === "success" ? "adm-alert-success" : "adm-alert-error";
const getAlertIcon = (type) => type === "success" ? "✓" : "✕";

export default function AdminProductos() {
  const [productos,  setProductos]  = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(false);
  const [editando,   setEditando]   = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [errors,     setErrors]     = useState({});
  const [alert,      setAlert]      = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const fileInputRef = useRef(null);
  const [importando, setImportando] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        api.get("/admin/productos"),
        api.get("/admin/categorias"),
      ]);
      setProductos(pRes.data  || []);
      setCategorias(cRes.data || []);
    } catch {
      setProductos([]);
      setCategorias([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 3500);
    return () => clearTimeout(t);
  }, [alert]);

  const validate = () => {
    const e = {};
    if (!form.nombre.trim())                           e.nombre       = "Nombre obligatorio";
    if (!form.precio_base || Number(form.precio_base) <= 0) e.precio_base  = "Precio válido requerido";
    if (!form.categoria_id)                            e.categoria_id = "Selecciona una categoría";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openCreate = () => {
    setEditando(null); setForm(EMPTY_FORM); setErrors({}); setModal(true);
  };

  const openEdit = (p) => {
    setEditando(p);
    setForm({
      nombre:       p.nombre,
      descripcion:  p.descripcion  || "",
      precio_base:  p.precio_base,
      costo:        p.costo        || "",
      categoria_id: p.categoria_id,
      activo:       p.activo,
    });
    setErrors({});
    setModal(true);
  };

  const handleGuardar = async () => {
    if (!validate()) return;
    const payload = {
      ...form,
      precio_base:  Number.parseFloat(form.precio_base),
      costo:        form.costo ? Number.parseFloat(form.costo) : null,
      categoria_id: Number.parseInt(form.categoria_id, 10),
    };
    try {
      if (editando) {
        await api.put(`/admin/productos/${editando.id}`, payload);
        setAlert({ type: "success", msg: "Producto actualizado correctamente." });
      } else {
        await api.post("/admin/productos", payload);
        setAlert({ type: "success", msg: "Producto creado correctamente." });
      }
      setModal(false);
      cargar();
    } catch (err) {
      setAlert({ type: "error", msg: err.response?.data?.message || "Error al guardar." });
    }
  };

  const handleEliminar = async (id) => {
    try {
      await api.delete(`/admin/productos/${id}`);
      setAlert({ type: "success", msg: "Producto eliminado." });
      setConfirmDel(null);
      cargar();
    } catch (err) {
      setAlert({ type: "error", msg: err.response?.data?.message || "No se pudo eliminar." });
      setConfirmDel(null);
    }
  };

  const handleChange = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }));
  };

  const fmt = (n) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

  const handleOverlayKey = (e, callback) => {
    if (e.key === 'Enter' || e.key === ' ') {
      callback();
    }
  };

  const handleImportar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("archivo", file);

    setImportando(true);
    try {
      // Hacemos el POST a la nueva ruta enviando el FormData
      const res = await api.post("/admin/productos/importar", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setAlert({ type: "success", msg: res.data.message });
      cargar(); // Recargamos la tabla de productos
    } catch (err) {
      setAlert({ type: "error", msg: err.response?.data?.message || "Error al importar el archivo." });
    } finally {
      setImportando(false);
      e.target.value = null; // Reseteamos el input para permitir subir el mismo archivo otra vez
    }
  };

  const handleExportar = () => {
    // 1. Definir las cabeceras exactas de tu formato
    const headers = ["Nombre", "Descripcion", "Precio_Base", "Costo", "Categoria"];

    // 2. Transformar los datos de la tabla al formato CSV
    const rows = productos.map(p => {
      // Obtenemos el nombre de la categoría
      const catNombre = p.categoria_nombre || categorias.find(c => c.id === p.categoria_id)?.nombre || "Sin Categoria";
      
      // Función para limpiar textos (evita que las comas en las descripciones rompan el CSV)
      const escapeCSV = (val) => {
        if (!val) return '""';
        const str = String(val).replace(/"/g, '""'); // Escapar comillas dobles
        return `"${str}"`; // Envolver en comillas
      };

      // Retornamos la fila unida por comas
      return [
        escapeCSV(p.nombre),
        escapeCSV(p.descripcion),
        p.precio_base,
        p.costo || "",
        escapeCSV(catNombre)
      ].join(",");
    });

    // 3. Unir todo. El "\uFEFF" es la magia para que Excel lea los acentos perfectamente.
    const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n");

    // 4. Crear el archivo y forzar la descarga en el navegador
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    // Generar un nombre con la fecha actual
    const fecha = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `Catalogo_DanElement_${fecha}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout pageTitle="Catálogo de Productos" breadcrumb="Productos">
      {alert && (
        <div className={`adm-alert ${getAlertClass(alert.type)}`}>
          {getAlertIcon(alert.type)} {alert.msg}
        </div>
      )}
      <div className="adm-section-header">
        <h3 className="adm-section-title">Productos ({productos.length})</h3>
        
        {/* Contenedor Flexbox ajustado para alinear los botones a la misma altura */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          
          <button 
            className="adm-btn adm-btn-ghost" 
            onClick={handleExportar} 
            type="button"
            title="Descargar catálogo en CSV"
          >
            <IconExport /> Exportar
          </button>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleImportar}
          />
          
          <button 
            className="adm-btn adm-btn-ghost" 
            onClick={() => fileInputRef.current.click()} 
            disabled={importando}
            type="button"
            title="Cargar productos desde Excel/CSV"
          >
            {importando ? "⏳ Cargando..." : <><IconImport /> Importar</>}
          </button>

          <button className="adm-btn adm-btn-primary" onClick={openCreate} type="button">
            <IconPlus /> Nuevo producto
          </button>

        </div>
      </div>
      {loading ? (
        <div className="adm-empty"><p>Cargando productos...</p></div>
      ) : productos.length === 0 ? (
        <div className="adm-empty">
          <div className="adm-empty-icon">👗</div>
          <p>No hay productos. ¡Añade el primero!</p>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Costo</th>
                <th>Margen</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p, idx) => {
                const margen = p.costo
                  ? (((p.precio_base - p.costo) / p.precio_base) * 100).toFixed(0)
                  : null;
                return (
                  <tr key={p.id}>
                    <td style={{ color: "var(--text-muted,#8b949e)", width: 40 }}>
                      {idx + 1}
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                    <td>
                      <span className="adm-badge adm-badge-blue">
                        {p.categoria_nombre ||
                          categorias.find(c => c.id === p.categoria_id)?.nombre ||
                          "—"}
                      </span>
                    </td>
                    <td style={{ fontFamily: "monospace", fontWeight: 600 }}>
                      {fmt(p.precio_base)}
                    </td>
                    <td style={{ color: "var(--text-muted,#8b949e)", fontFamily: "monospace" }}>
                      {p.costo ? fmt(p.costo) : "—"}
                    </td>
                    <td>
                      {margen ? (
                        <span className={`adm-badge ${getMargenBadgeClass(margen)}`}>
                          {margen}%
                        </span>
                      ) : "—"}
                    </td>
                    <td>
                      <span className={`adm-badge ${p.activo ? "adm-badge-green" : "adm-badge-gray"}`}>
                        {p.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="adm-btn adm-btn-ghost adm-btn-sm"
                          onClick={() => openEdit(p)}
                          title="Editar"
                          type="button"
                        >
                          <IconEdit />
                        </button>
                        <button
                          className="adm-btn adm-btn-danger adm-btn-sm"
                          onClick={() => setConfirmDel(p.id)}
                          title="Eliminar"
                          type="button"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <div className="adm-modal-overlay" onClick={() => setModal(false)} role="button" tabIndex={0} onKeyDown={(e) => handleOverlayKey(e, () => setModal(false))} aria-label="Cerrar modal">
          <div className="adm-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">
                {editando ? "Editar producto" : "Nuevo producto"}
              </h3>
              <button className="adm-modal-close" onClick={() => setModal(false)} type="button" aria-label="Cerrar">
                <IconX />
              </button>
            </div>
            <div className="adm-modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <div className="adm-form-group">
                <label htmlFor="prod_nombre">Nombre del producto *</label>
                <input
                  id="prod_nombre"
                  className={`adm-input ${errors.nombre ? "adm-input-error" : ""}`}
                  placeholder="Ej: Playera Urban Drop"
                  value={form.nombre}
                  onChange={e => handleChange("nombre", e.target.value)}
                  autoFocus
                />
                {errors.nombre && <p className="adm-error-text">{errors.nombre}</p>}
              </div>
              <div className="adm-form-group">
                <label htmlFor="prod_desc">Descripción</label>
                <textarea
                  id="prod_desc"
                  className="adm-textarea"
                  placeholder="Descripción del producto (opcional)"
                  value={form.descripcion}
                  onChange={e => handleChange("descripcion", e.target.value)}
                  rows={3}
                />
              </div>
              <div className="adm-form-row">
                <div className="adm-form-group" style={{ margin: 0 }}>
                  <label htmlFor="prod_precio">Precio de venta (MXN) *</label>
                  <input
                    id="prod_precio"
                    className={`adm-input ${errors.precio_base ? "adm-input-error" : ""}`}
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={form.precio_base}
                    onChange={e => handleChange("precio_base", e.target.value)}
                  />
                  {errors.precio_base && <p className="adm-error-text">{errors.precio_base}</p>}
                </div>
                <div className="adm-form-group" style={{ margin: 0 }}>
                  <label htmlFor="prod_costo">Costo (MXN)</label>
                  <input
                    id="prod_costo"
                    className="adm-input"
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={form.costo}
                    onChange={e => handleChange("costo", e.target.value)}
                  />
                </div>
              </div>
              <div className="adm-form-group" style={{ marginTop: "14px" }}>
                <label htmlFor="prod_categoria">Categoría *</label>
                <select
                  id="prod_categoria"
                  className={`adm-select ${errors.categoria_id ? "adm-input-error" : ""}`}
                  value={form.categoria_id}
                  onChange={e => handleChange("categoria_id", e.target.value)}
                >
                  <option value="">— Selecciona una categoría —</option>
                  {categorias
                    .filter(c => c.activo !== false)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))
                  }
                </select>
                {errors.categoria_id && <p className="adm-error-text">{errors.categoria_id}</p>}
              </div>
              <div className="adm-form-group">
                <label id="prod_estado_label">Estado</label>
                <div role="group" aria-labelledby="prod_estado_label" style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                  {[true, false].map(v => (
                    <button
                      key={String(v)} 
                      type="button"
                      onClick={() => handleChange("activo", v)}
                      className={`adm-btn adm-btn-sm ${form.activo === v ? "adm-btn-primary" : "adm-btn-ghost"}`}
                      aria-pressed={form.activo === v}
                    >
                      {v ? "Activo" : "Inactivo"}
                    </button>
                  ))}
                </div>
              </div>
              {form.precio_base && form.costo && (
                <div style={{
                  background:   "rgba(59,130,246,.08)",
                  border:       "1px solid rgba(59,130,246,.2)",
                  borderRadius: 8,
                  padding:      "10px 14px",
                  fontSize:     12,
                  color:        "#9ca3af",
                }}>
                  Margen estimado:{" "}
                  <strong style={{ color: "#3b82f6" }}>
                    {(((form.precio_base - form.costo) / form.precio_base) * 100).toFixed(1)}%
                  </strong>
                </div>
              )}
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setModal(false)} type="button">
                Cancelar
              </button>
              <button className="adm-btn adm-btn-primary" onClick={handleGuardar} type="button">
                {editando ? "Guardar cambios" : "Crear producto"}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmDel && (
        <div className="adm-modal-overlay" onClick={() => setConfirmDel(null)} role="button" tabIndex={0} onKeyDown={(e) => handleOverlayKey(e, () => setConfirmDel(null))} aria-label="Cerrar confirmación">
          <div className="adm-modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">Confirmar eliminación</h3>
              <button className="adm-modal-close" onClick={() => setConfirmDel(null)} type="button" aria-label="Cerrar">
                <IconX />
              </button>
            </div>
            <div className="adm-modal-body">
              <p style={{ fontSize: "13px", color: "var(--text-muted,#8b949e)", lineHeight: 1.6 }}>
                ¿Seguro que deseas eliminar este producto? Esta acción también
                eliminará sus variantes de inventario.
              </p>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setConfirmDel(null)} type="button">
                Cancelar
              </button>
              <button className="adm-btn adm-btn-danger" onClick={() => handleEliminar(confirmDel)} type="button">
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}