import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../services/api";

const IconX     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconEdit  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const IconPlus  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;

const cargar = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/clientes");
      setClientes(res.data || []);
    } catch (error) {
      setClientes([]);
      setAlert({ type: "error", msg: "Error al cargar el directorio de clientes desde la BD." });
    } finally {
      setLoading(false);
    }
  };

const EMPTY_FORM = { nombre: "", telefono: "", email: "", rfc: "", notas: "" };

const COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4"];
const colorFor   = (id) => COLORS[id % COLORS.length];
const initials   = (nombre) => nombre.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
const fmtFecha   = (f) => f ? new Date(f).toLocaleDateString("es-MX") : "—";

export default function AdminClientes() {
  const [clientes,   setClientes]   = useState([]);
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
      const res = await api.get("/admin/clientes");
      setClientes(res.data || []);
    } catch {
      setClientes(DEMO_CLIENTES);
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
    if (!form.nombre.trim()) e.nombre = "El nombre es obligatorio";
    if (form.telefono && !/^\d{10}$/.test(form.telefono.replace(/\s/g, "")))
      e.telefono = "Ingresa 10 dígitos";
    if (form.email && !/\S+@\S+\.\S+/.test(form.email))
      e.email = "Correo inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openCreate = () => {
    setEditando(null); setForm(EMPTY_FORM); setErrors({}); setModal(true);
  };
  const openEdit = (c) => {
    setEditando(c);
    setForm({
      nombre:   c.nombre,
      telefono: c.telefono || "",
      email:    c.email    || "",
      rfc:      c.rfc      || "",
      notas:    c.notas    || "",
    });
    setErrors({});
    setModal(true);
  };

  const handleGuardar = async () => {
    if (!validate()) return;
    try {
      if (editando) {
        await api.put(`/admin/clientes/${editando.id}`, form);
        setAlert({ type: "success", msg: "Cliente actualizado correctamente." });
      } else {
        await api.post("/admin/clientes", form);
        setAlert({ type: "success", msg: "Cliente registrado correctamente." });
      }
      setModal(false);
      cargar();
    } catch (err) {
      setAlert({ type: "error", msg: err.response?.data?.message || "Error al guardar." });
    }
  };

  const handleEliminar = async (id) => {
    try {
      await api.delete(`/admin/clientes/${id}`);
      setAlert({ type: "success", msg: "Cliente eliminado." });
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

  return (
    <AdminLayout pageTitle="Gestión de Clientes" breadcrumb="Clientes">

      {alert && (
        <div className={`adm-alert ${alert.type === "success" ? "adm-alert-success" : "adm-alert-error"}`}>
          {alert.type === "success" ? "✓" : "✕"} {alert.msg}
        </div>
      )}

      {/* Header */}
      <div className="adm-section-header">
        <h3 className="adm-section-title">Clientes registrados ({clientes.length})</h3>
        <button className="adm-btn adm-btn-primary" onClick={openCreate}>
          <IconPlus /> Nuevo cliente
        </button>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="adm-empty"><p>Cargando clientes...</p></div>
      ) : clientes.length === 0 ? (
        <div className="adm-empty">
          <div className="adm-empty-icon">👥</div>
          <p>No hay clientes. ¡Registra el primero!</p>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>RFC</th>
                <th>Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: colorFor(c.id),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
                      }}>
                        {initials(c.nombre)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{c.nombre}</div>
                        {c.notas && (
                          <div style={{
                            fontSize: 11, color: "var(--text-muted,#8b949e)",
                            maxWidth: 180, overflow: "hidden",
                            textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {c.notas}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                    {c.telefono || <span style={{ color: "var(--text-muted,#8b949e)" }}>—</span>}
                  </td>
                  <td style={{ fontSize: 12, color: c.email ? "var(--text-main,#fff)" : "var(--text-muted,#8b949e)" }}>
                    {c.email || "—"}
                  </td>
                  <td>
                    {c.rfc
                      ? <span className="adm-badge adm-badge-blue" style={{ fontFamily: "monospace" }}>{c.rfc}</span>
                      : <span style={{ color: "var(--text-muted,#8b949e)", fontSize: 12 }}>—</span>
                    }
                  </td>
                  <td style={{ color: "var(--text-muted,#8b949e)", fontSize: 12 }}>
                    {fmtFecha(c.creado_en)}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="adm-btn adm-btn-ghost adm-btn-sm"
                        onClick={() => openEdit(c)}
                        title="Editar"
                      >
                        <IconEdit />
                      </button>
                      <button
                        className="adm-btn adm-btn-danger adm-btn-sm"
                        onClick={() => setConfirmDel(c.id)}
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

      {/* ── Modal Crear / Editar ─────────────────────────── */}
      {modal && (
        <div className="adm-modal-overlay" onClick={() => setModal(false)}>
          <div className="adm-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">
                {editando ? "Editar cliente" : "Registrar nuevo cliente"}
              </h3>
              <button className="adm-modal-close" onClick={() => setModal(false)}>
                <IconX />
              </button>
            </div>
            <div className="adm-modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>

              {/* Nombre */}
              <div className="adm-form-group">
                <label>Nombre completo *</label>
                <input
                  className={`adm-input ${errors.nombre ? "adm-input-error" : ""}`}
                  placeholder="Nombre y apellidos"
                  value={form.nombre}
                  onChange={e => handleChange("nombre", e.target.value)}
                  autoFocus
                />
                {errors.nombre && <p className="adm-error-text">{errors.nombre}</p>}
              </div>

              {/* Teléfono / Email */}
              <div className="adm-form-row">
                <div className="adm-form-group" style={{ margin: 0 }}>
                  <label>Teléfono</label>
                  <input
                    className={`adm-input ${errors.telefono ? "adm-input-error" : ""}`}
                    placeholder="10 dígitos"
                    value={form.telefono}
                    onChange={e => handleChange("telefono", e.target.value)}
                    maxLength={10}
                  />
                  {errors.telefono && <p className="adm-error-text">{errors.telefono}</p>}
                </div>
                <div className="adm-form-group" style={{ margin: 0 }}>
                  <label>Correo electrónico</label>
                  <input
                    className={`adm-input ${errors.email ? "adm-input-error" : ""}`}
                    type="email"
                    placeholder="cliente@email.com"
                    value={form.email}
                    onChange={e => handleChange("email", e.target.value)}
                  />
                  {errors.email && <p className="adm-error-text">{errors.email}</p>}
                </div>
              </div>

              {/* RFC */}
              <div className="adm-form-group" style={{ marginTop: "14px" }}>
                <label>
                  RFC{" "}
                  <span style={{ fontWeight: 400, textTransform: "none" }}>
                    (para facturación, opcional)
                  </span>
                </label>
                <input
                  className="adm-input"
                  placeholder="Ej: TOGA901210XXX"
                  value={form.rfc}
                  onChange={e => handleChange("rfc", e.target.value.toUpperCase())}
                  maxLength={13}
                  style={{ fontFamily: "monospace", letterSpacing: "1px" }}
                />
              </div>

              {/* Notas */}
              <div className="adm-form-group">
                <label>Notas internas</label>
                <textarea
                  className="adm-textarea"
                  placeholder="Preferencias de talla, observaciones, etc."
                  value={form.notas}
                  onChange={e => handleChange("notas", e.target.value)}
                  rows={3}
                />
              </div>

            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setModal(false)}>
                Cancelar
              </button>
              <button className="adm-btn adm-btn-primary" onClick={handleGuardar}>
                {editando ? "Guardar cambios" : "Registrar cliente"}
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
                ¿Seguro que deseas eliminar este cliente? El historial de compras
                asociado se conservará.
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