import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../services/api";

const IconX     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconEdit  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const IconPlus  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;

const DEMO_PRODUCTOS = [
  { id: 1, nombre: "Playera Urban Drop",  precio_base: 350, costo: 180, categoria_id: 1, activo: true,  categoria_nombre: "Playeras"   },
  { id: 2, nombre: "Gorra SnapBack DTE",  precio_base: 280, costo: 120, categoria_id: 3, activo: true,  categoria_nombre: "Gorras"     },
  { id: 3, nombre: "Sudadera Oversized",  precio_base: 620, costo: 310, categoria_id: 4, activo: true,  categoria_nombre: "Sudaderas"  },
  { id: 4, nombre: "Pantalón Cargo 2024", precio_base: 490, costo: 240, categoria_id: 2, activo: false, categoria_nombre: "Pantalones" },
];

const DEMO_CATS = [
  { id: 1, nombre: "Playeras"  },
  { id: 2, nombre: "Pantalones"},
  { id: 3, nombre: "Gorras"   },
  { id: 4, nombre: "Sudaderas" },
];

const EMPTY_FORM = {
  nombre: "", descripcion: "", precio_base: "", costo: "", categoria_id: "", activo: true,
};

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
      setProductos(DEMO_PRODUCTOS);
      setCategorias(DEMO_CATS);
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
    if (!form.nombre.trim())                              e.nombre       = "Nombre obligatorio";
    if (!form.precio_base || Number(form.precio_base) <= 0) e.precio_base  = "Precio válido requerido";
    if (!form.categoria_id)                               e.categoria_id = "Selecciona una categoría";
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
      precio_base:  parseFloat(form.precio_base),
      costo:        form.costo ? parseFloat(form.costo) : null,
      categoria_id: parseInt(form.categoria_id),
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

  return (
    <AdminLayout pageTitle="Catálogo de Productos" breadcrumb="Productos">

      {alert && (
        <div className={`adm-alert ${alert.type === "success" ? "adm-alert-success" : "adm-alert-error"}`}>
          {alert.type === "success" ? "✓" : "✕"} {alert.msg}
        </div>
      )}

      {/* Header */}
      <div className="adm-section-header">
        <h3 className="adm-section-title">Productos ({productos.length})</h3>
        <button className="adm-btn adm-btn-primary" onClick={openCreate}>
          <IconPlus /> Nuevo producto
        </button>
      </div>

      {/* Tabla */}
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
                        <span className={`adm-badge ${
                          Number(margen) >= 40 ? "adm-badge-green" :
                          Number(margen) >= 20 ? "adm-badge-yellow" : "adm-badge-red"
                        }`}>
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
                        >
                          <IconEdit />
                        </button>
                        <button
                          className="adm-btn adm-btn-danger adm-btn-sm"
                          onClick={() => setConfirmDel(p.id)}
                          title="Eliminar"
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

      {/* ── Modal Crear / Editar ─────────────────────────── */}
      {modal && (
        <div className="adm-modal-overlay" onClick={() => setModal(false)}>
          <div className="adm-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">
                {editando ? "Editar producto" : "Nuevo producto"}
              </h3>
              <button className="adm-modal-close" onClick={() => setModal(false)}>
                <IconX />
              </button>
            </div>
            <div className="adm-modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>

              {/* Nombre */}
              <div className="adm-form-group">
                <label>Nombre del producto *</label>
                <input
                  className={`adm-input ${errors.nombre ? "adm-input-error" : ""}`}
                  placeholder="Ej: Playera Urban Drop"
                  value={form.nombre}
                  onChange={e => handleChange("nombre", e.target.value)}
                  autoFocus
                />
                {errors.nombre && <p className="adm-error-text">{errors.nombre}</p>}
              </div>

              {/* Descripción */}
              <div className="adm-form-group">
                <label>Descripción</label>
                <textarea
                  className="adm-textarea"
                  placeholder="Descripción del producto (opcional)"
                  value={form.descripcion}
                  onChange={e => handleChange("descripcion", e.target.value)}
                  rows={3}
                />
              </div>

              {/* Precio y Costo */}
              <div className="adm-form-row">
                <div className="adm-form-group" style={{ margin: 0 }}>
                  <label>Precio de venta (MXN) *</label>
                  <input
                    className={`adm-input ${errors.precio_base ? "adm-input-error" : ""}`}
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={form.precio_base}
                    onChange={e => handleChange("precio_base", e.target.value)}
                  />
                  {errors.precio_base && <p className="adm-error-text">{errors.precio_base}</p>}
                </div>
                <div className="adm-form-group" style={{ margin: 0 }}>
                  <label>Costo (MXN)</label>
                  <input
                    className="adm-input"
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={form.costo}
                    onChange={e => handleChange("costo", e.target.value)}
                  />
                </div>
              </div>

              {/* Categoría */}
              <div className="adm-form-group" style={{ marginTop: "14px" }}>
                <label>Categoría *</label>
                <select
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

              {/* Estado */}
              <div className="adm-form-group">
                <label>Estado</label>
                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                  {[true, false].map(v => (
                    <button
                      key={String(v)} type="button"
                      onClick={() => handleChange("activo", v)}
                      className={`adm-btn adm-btn-sm ${form.activo === v ? "adm-btn-primary" : "adm-btn-ghost"}`}
                    >
                      {v ? "Activo" : "Inactivo"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview margen */}
              {form.precio_base && form.costo && (
                <div style={{
                  background:   "rgba(59,130,246,.08)",
                  border:       "1px solid rgba(59,130,246,.2)",
                  borderRadius: 8,
                  padding:      "10px 14px",
                  fontSize:     12,
                  color:        "#8b949e",
                }}>
                  Margen estimado:{" "}
                  <strong style={{ color: "#3b82f6" }}>
                    {(((form.precio_base - form.costo) / form.precio_base) * 100).toFixed(1)}%
                  </strong>
                </div>
              )}
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setModal(false)}>
                Cancelar
              </button>
              <button className="adm-btn adm-btn-primary" onClick={handleGuardar}>
                {editando ? "Guardar cambios" : "Crear producto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar eliminación ──────────────────── */}
      {confirmDel && (
        <div className="adm-modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="adm-modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">Confirmar eliminación</h3>
              <button className="adm-modal-close" onClick={() => setConfirmDel(null)}>
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
              <button className="adm-btn adm-btn-ghost" onClick={() => setConfirmDel(null)}>
                Cancelar
              </button>
              <button className="adm-btn adm-btn-danger" onClick={() => handleEliminar(confirmDel)}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}