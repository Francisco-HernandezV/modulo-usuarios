import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../services/api";

const IconPlus = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconKey = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>;
const IconEdit = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;

const EMPTY_FORM = { id: null, nombre: "", email: "", telefono: "", rol_id: "", departamentos: [], password_temporal: "", activo: true };

export default function AdminEmpleados() {
  const [empleados, setEmpleados] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departamentosDB, setDepartamentosDB] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modal, setModal] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  
  const [form, setForm] = useState(EMPTY_FORM);
  const [alert, setAlert] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [empRes, rolRes, depRes] = await Promise.all([
        api.get("/admin/empleados"),
        api.get("/admin/roles"),
        api.get("/admin/departamentos")
      ]);
      setEmpleados(empRes.data || []);
      setRoles(rolRes.data || []);
      setDepartamentosDB(depRes.data || []);
    } catch (error) {
      console.error("Error cargando datos de empleados:", error);
      setAlert({ type: "error", msg: "Error al cargar la información." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleChange = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const toggleDepartamento = (id) => {
    setForm(f => ({
      ...f,
      departamentos: f.departamentos.includes(id)
        ? f.departamentos.filter(d => d !== id)
        : [...f.departamentos, id]
    }));
  };

  const generarPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    handleChange("password_temporal", pass);
  };

  const abrirModalNuevo = () => {
    setForm(EMPTY_FORM);
    setModal(true);
  };

  const abrirModalEditar = (empleado) => {
    setForm({
      id: empleado.id,
      nombre: empleado.nombre,
      email: empleado.email,
      telefono: empleado.telefono_contacto || "",
      rol_id: empleado.rol_id || "",
      departamentos: empleado.departamentos || [],
      activo: empleado.cuenta_activa,
      password_temporal: "" 
    });
    setModal(true);
  };

  const handleGuardar = async () => {
    if (isSubmitting) return;

    if (!form.nombre || !form.email || !form.rol_id) {
      setAlert({ type: "error", msg: "Llena los campos obligatorios." });
      return;
    }
    if (!form.id && (!form.password_temporal || form.password_temporal.length < 8)) {
      setAlert({ type: "error", msg: "La contraseña temporal debe tener al menos 8 caracteres." });
      return;
    }

    setIsSubmitting(true);

    try {
      if (form.id) {
        await api.put(`/admin/empleados/${form.id}`, form);
        setAlert({ type: "success", msg: "Empleado actualizado correctamente." });
      } else {
        await api.post("/admin/empleados", form);
        setAlert({ type: "success", msg: "Empleado registrado exitosamente." });
      }
      setModal(false);
      cargarDatos();
    } catch (error) {
      setAlert({ type: "error", msg: error.response?.data?.message || "Error al procesar la solicitud." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEliminarConfirmado = async () => {
    if (!confirmDel) return;
    try {
      await api.delete(`/admin/empleados/${confirmDel}`);
      setAlert({ type: "success", msg: "Empleado eliminado correctamente." });
      setConfirmDel(null);
      cargarDatos();
    } catch (error) {
      setConfirmDel(null);
      setAlert({ type: "error", msg: error.response?.data?.message || "Error al eliminar." });
    }
  };

  const copiarPassword = () => {
    if (form.password_temporal.length < 8) return;
    navigator.clipboard.writeText(form.password_temporal);
    setAlert({ type: "success", msg: "¡Contraseña copiada al portapapeles!" });
  };

  return (
    <AdminLayout pageTitle="Gestión de Empleados" breadcrumb="Empleados">
      {alert && <div className={`adm-alert ${alert.type === "success" ? "adm-alert-success" : "adm-alert-error"}`}>{alert.msg}</div>}
      
      <div className="adm-section-header">
        <h3 className="adm-section-title">Plantilla de Empleados ({empleados.length})</h3>
        <button className="adm-btn adm-btn-primary" onClick={abrirModalNuevo} type="button">
          <IconPlus /> Nuevo Empleado
        </button>
      </div>

      {loading ? (
        <div className="adm-empty"><p>Cargando plantilla...</p></div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Correo</th>
                <th>Teléfono</th>
                <th>Rol</th>
                <th>Estado</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empleados.map(e => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 600 }}>{e.nombre}</td>
                  <td style={{ fontSize: 13, color: "#d1d5db" }}>{e.email}</td>
                  <td style={{ fontFamily: "monospace", color: "#8b949e", fontSize: 13 }}>
                    {e.telefono_contacto || "—"}
                  </td>
                  <td>
                    <span className="adm-badge adm-badge-blue">
                      {e.rol.replace('rol_', '').toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className={`adm-badge ${e.cuenta_activa ? "adm-badge-green" : "adm-badge-red"}`}>
                      {e.cuenta_activa ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      <button className="adm-btn adm-btn-ghost adm-btn-sm" title="Editar empleado" onClick={() => abrirModalEditar(e)} type="button">
                        <IconEdit />
                      </button>
                      <button className="adm-btn adm-btn-danger adm-btn-sm" title="Eliminar empleado" onClick={() => setConfirmDel(e.id)} type="button">
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

      {confirmDel && (
        <div className="adm-modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="adm-modal" style={{ maxWidth: "380px" }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">Confirmar eliminación</h3>
              <button className="adm-modal-close" onClick={() => setConfirmDel(null)} type="button"><IconX /></button>
            </div>
            <div className="adm-modal-body">
              <p style={{ fontSize: "14px", color: "#9ca3af", lineHeight: 1.6, marginBottom: "20px" }}>¿Seguro que deseas eliminar este empleado? Esta acción es irreversible.</p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button className="adm-btn adm-btn-ghost" onClick={() => setConfirmDel(null)}>Cancelar</button>
                <button className="adm-btn adm-btn-danger" onClick={handleEliminarConfirmado}>Sí, eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="adm-modal-overlay" onClick={() => setModal(false)}>
          <div className="adm-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">{form.id ? "Editar Empleado" : "Registrar Empleado"}</h3>
              <button className="adm-modal-close" onClick={() => setModal(false)} type="button"><IconX /></button>
            </div>
            <div className="adm-modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              
              <div className="adm-form-row">
                <div className="adm-form-group">
                  <label>Nombre Completo *</label>
                  <input className="adm-input" value={form.nombre} onChange={e => handleChange("nombre", e.target.value)} autoFocus />
                </div>
                <div className="adm-form-group">
                  <label>Teléfono</label>
                  <input className="adm-input" value={form.telefono} onChange={e => handleChange("telefono", e.target.value)} maxLength={10} />
                </div>
              </div>

              <div className="adm-form-row">
                <div className="adm-form-group">
                  <label>Correo Electrónico (Usuario) *</label>
                  <input className="adm-input" type="email" value={form.email} onChange={e => handleChange("email", e.target.value)} />
                </div>
                <div className="adm-form-group">
                  <label>Rol en el sistema *</label>
                  <select className="adm-select" value={form.rol_id} onChange={e => handleChange("rol_id", Number(e.target.value))}>
                    <option value="">-- Seleccionar Rol --</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.nombre.replace('rol_', '').toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              <div className="adm-form-group">
                <label>Departamentos asignados</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", background: "rgba(15,17,21,.5)", padding: "12px", borderRadius: "8px", border: "1px solid #30363d" }}>
                  {departamentosDB.map(d => (
                    <label key={d.id} style={{ display: "flex", alignItems: "center", gap: "6px", color: "white", cursor: "pointer", fontSize: "13px", textTransform: "none" }}>
                      <input type="checkbox" checked={form.departamentos.includes(d.id)} onChange={() => toggleDepartamento(d.id)} />
                      {d.nombre}
                    </label>
                  ))}
                </div>
              </div>

              {form.id && (
                <div className="adm-form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "white", cursor: "pointer", fontSize: "14px" }}>
                    <input type="checkbox" checked={form.activo} onChange={e => handleChange("activo", e.target.checked)} />
                    Cuenta Activa (Puede iniciar sesión)
                  </label>
                </div>
              )}

              {/* 🔥 AQUÍ ESTÁ LA MEJORA DE LA CONTRASEÑA (Diseño blindado con CSS Grid) */}
              {!form.id && (
                <div className="adm-form-group">
                  <label>Contraseña Temporal *</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px", alignItems: "center" }}>
                    <input 
                      className="adm-input" 
                      type="text" 
                      value={form.password_temporal} 
                      onChange={e => handleChange("password_temporal", e.target.value.trim())}
                      placeholder="Escribe o genera..." 
                      style={{ 
                        fontFamily: "'Courier New', Courier, monospace",
                        fontSize: "16px", 
                        letterSpacing: "2px",
                        fontWeight: "bold",
                        width: "100%",
                        boxSizing: "border-box"
                      }} 
                    />
                    
                    <button 
                      className="adm-btn adm-btn-ghost" 
                      onClick={generarPassword} 
                      type="button" 
                      title="Generar contraseña"
                      style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%" }}
                    >
                      <IconKey /> Generar
                    </button>

                    <button 
                      className="adm-btn adm-btn-ghost" 
                      onClick={copiarPassword} 
                      type="button" 
                      title="Copiar al portapapeles"
                      disabled={form.password_temporal.length < 8}
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "6px",
                        width: "100%",
                        opacity: form.password_temporal.length < 8 ? 0.4 : 1,
                        cursor: form.password_temporal.length < 8 ? "not-allowed" : "pointer"
                      }}
                    >
                      📋 Copiar
                    </button>
                  </div>
                  <small style={{ color: "#8b949e", fontSize: "11px", marginTop: "5px", display: "block" }}>
                    Mínimo 8 caracteres. Copia esta contraseña y entrégala al empleado.
                  </small>
                </div>
              )}

            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setModal(false)} type="button">Cancelar</button>
              
              <button 
                className="adm-btn adm-btn-primary" 
                onClick={handleGuardar} 
                type="button"
                disabled={isSubmitting}
                style={{
                  background: isSubmitting ? "#6b7280" : "",
                  borderColor: isSubmitting ? "#6b7280" : "",
                  cursor: isSubmitting ? "not-allowed" : "pointer"
                }}
              >
                {isSubmitting ? "Guardando..." : (form.id ? "Guardar Cambios" : "Registrar Empleado")}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}