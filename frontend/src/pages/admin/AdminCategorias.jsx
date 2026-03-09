import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../services/api";

const IconX     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconEdit  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const IconPlus  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;

const EMPTY_FORM = { nombre: "", activo: true };

export default function AdminCategorias() {
  const [categorias,  setCategorias]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(false);
  const [editando,    setEditando]    = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [errors,      setErrors]      = useState({});
  const [alert,       setAlert]       = useState(null);
  const [confirmDel,  setConfirmDel]  = useState(null);

  // ── Cargar ────────────────────────────────────────────────
  const cargar = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/categorias");
      setCategorias(res.data || []);
    } catch (error) {
      console.error("Error al cargar:", error);
      setCategorias([]); // Reemplazo de DEMO_CATS por un arreglo vacío
      setAlert({ type: "error", msg: "Error al obtener categorías de la base de datos." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  // ── Alert auto-dismiss ────────────────────────────────────
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 3500);
    return () => clearTimeout(t);
  }, [alert]);

  // ── Validación ────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.nombre.trim())             e.nombre = "El nombre es obligatorio";
    else if (form.nombre.trim().length < 2) e.nombre = "Mínimo 2 caracteres";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Abrir modal ───────────────────────────────────────────
  const openCreate = () => {
    setEditando(null); setForm(EMPTY_FORM); setErrors({}); setModal(true);
  };
  const openEdit = (cat) => {
    setEditando(cat);
    setForm({ nombre: cat.nombre, activo: cat.activo });
    setErrors({});
    setModal(true);
  };

  // ── Guardar ───────────────────────────────────────────────
  const handleGuardar = async () => {
    if (!validate()) return;
    try {
      if (editando) {
        await api.put(`/admin/categorias/${editando.id}`, form);
        setAlert({ type: "success", msg: "Categoría actualizada correctamente." });
      } else {
        await api.post("/admin/categorias", form);
        setAlert({ type: "success", msg: "Categoría creada correctamente." });
      }
      setModal(false);
      cargar();
    } catch (err) {
      setAlert({ type: "error", msg: err.response?.data?.message || "Error al guardar." });
    }
  };

  // ── Eliminar ──────────────────────────────────────────────
  const handleEliminar = async (id) => {
    try {
      await api.delete(`/admin/categorias/${id}`);
      setAlert({ type: "success", msg: "Categoría eliminada." });
      setConfirmDel(null);
      cargar();
    } catch (err) {
      setAlert({ type: "error", msg: err.response?.data?.message || "No se pudo eliminar." });
      setConfirmDel(null);
    }
  };

  // ── Toggle activo ─────────────────────────────────────────
  const handleToggle = async (cat) => {
    try {
      await api.put(`/admin/categorias/${cat.id}`, { ...cat, activo: !cat.activo });
      cargar();
    } catch {
      setAlert({ type: "error", msg: "Error al cambiar estado." });
    }
  };

  const handleChange = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }));
  };

  const activas   = categorias.filter(c =>  c.activo);
  const inactivas = categorias.filter(c => !c.activo);

  return (
    <AdminLayout pageTitle="Categorías de Productos" breadcrumb="Categorías">

      {/* Alert */}
      {alert && (
        <div className={`adm-alert ${alert.type === "success" ? "adm-alert-success" : "adm-alert-error"}`}>
          {alert.type === "success" ? "✓" : "✕"} {alert.msg}
        </div>
      )}

      {/* Header */}
      <div className="adm-section-header">
        <h3 className="adm-section-title">Todas las categorías ({categorias.length})</h3>
        <button className="adm-btn adm-btn-primary" onClick={openCreate}>
          <IconPlus /> Nueva categoría
        </button>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="adm-empty"><p>Cargando categorías...</p></div>
      ) : categorias.length === 0 ? (
        <div className="adm-empty">
          <div className="adm-empty-icon">🏷️</div>
          <p>No hay categorías registradas. ¡Crea la primera!</p>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((cat, idx) => (
                <tr key={cat.id}>
                  <td style={{ color: "var(--text-muted,#8b949e)", width: "50px" }}>
                    {idx + 1}
                  </td>
                  <td style={{ fontWeight: 600 }}>{cat.nombre}</td>
                  <td>
                    <button
                      onClick={() => handleToggle(cat)}
                      className={`adm-badge ${cat.activo ? "adm-badge-green" : "adm-badge-gray"}`}
                      style={{ cursor: "pointer", border: "none" }}
                    >
                      {cat.activo ? "● Activa" : "○ Inactiva"}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="adm-btn adm-btn-ghost adm-btn-sm"
                        onClick={() => openEdit(cat)}
                        title="Editar"
                      >
                        <IconEdit />
                      </button>
                      <button
                        className="adm-btn adm-btn-danger adm-btn-sm"
                        onClick={() => setConfirmDel(cat.id)}
                        title="Eliminar"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Resumen */}
      <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
        <span className="adm-badge adm-badge-green">✓ {activas.length} activas</span>
        <span className="adm-badge adm-badge-gray">○ {inactivas.length} inactivas</span>
      </div>

      {/* ── Modal Crear / Editar ─────────────────────────── */}
      {modal && (
        <div className="adm-modal-overlay" onClick={() => setModal(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">
                {editando ? "Editar categoría" : "Nueva categoría"}
              </h3>
              <button className="adm-modal-close" onClick={() => setModal(false)}>
                <IconX />
              </button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-form-group">
                <label>Nombre de la categoría *</label>
                <input
                  className={`adm-input ${errors.nombre ? "adm-input-error" : ""}`}
                  placeholder="Ej: Playeras, Gorras, Pantalones..."
                  value={form.nombre}
                  onChange={e => handleChange("nombre", e.target.value)}
                  autoFocus
                />
                {errors.nombre && <p className="adm-error-text">{errors.nombre}</p>}
              </div>
              <div className="adm-form-group">
                <label>Estado</label>
                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                  {[true, false].map(v => (
                    <button
                      key={String(v)}
                      type="button"
                      onClick={() => handleChange("activo", v)}
                      className={`adm-btn adm-btn-sm ${form.activo === v ? "adm-btn-primary" : "adm-btn-ghost"}`}
                    >
                      {v ? "Activa" : "Inactiva"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setModal(false)}>
                Cancelar
              </button>
              <button className="adm-btn adm-btn-primary" onClick={handleGuardar}>
                {editando ? "Guardar cambios" : "Crear categoría"}
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
                ¿Estás seguro de que deseas eliminar esta categoría? Los productos
                asignados podrían quedar sin categoría.
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