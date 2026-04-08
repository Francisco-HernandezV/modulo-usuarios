import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../services/api";

const IconPlus = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconKey = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>;

const EMPTY_FORM = { nombre: "", email: "", telefono: "", rol_id: "", departamentos: [], password_temporal: "", activo: true };

export default function AdminEmpleados() {
  const [empleados, setEmpleados] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departamentosDB, setDepartamentosDB] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [alert, setAlert] = useState(null);

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

  const handleGuardar = async () => {
    if (!form.nombre || !form.email || !form.rol_id || !form.password_temporal) {
      setAlert({ type: "error", msg: "Llena los campos obligatorios." });
      return;
    }
    try {
      await api.post("/admin/empleados", form);
      setAlert({ type: "success", msg: "Empleado registrado. Pásale su contraseña temporal." });
      setModal(false);
      cargarDatos();
    } catch (error) {
      setAlert({ type: "error", msg: error.response?.data?.message || "Error al registrar." });
    }
  };

  return (
    <AdminLayout pageTitle="Gestión de Empleados" breadcrumb="Empleados">
      {alert && <div className={`adm-alert ${alert.type === "success" ? "adm-alert-success" : "adm-alert-error"}`}>{alert.msg}</div>}
      
      <div className="adm-section-header">
        <h3 className="adm-section-title">Plantilla de Empleados ({empleados.length})</h3>
        <button className="adm-btn adm-btn-primary" onClick={() => { setForm(EMPTY_FORM); setModal(true); }} type="button">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="adm-modal-overlay" onClick={() => setModal(false)}>
          <div className="adm-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">Registrar Empleado</h3>
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
                  <select className="adm-select" value={form.rol_id} onChange={e => handleChange("rol_id", e.target.value)}>
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

              <div className="adm-form-group">
                <label>Contraseña Temporal *</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input className="adm-input" type="text" value={form.password_temporal} onChange={e => handleChange("password_temporal", e.target.value)} placeholder="Escribe o autogenera..." style={{ fontFamily: "monospace", fontSize: "14px" }} />
                  <button className="adm-btn adm-btn-ghost" onClick={generarPassword} type="button"><IconKey /> Generar</button>
                </div>
                <small style={{ color: "#8b949e", fontSize: "11px", marginTop: "5px", display: "block" }}>El sistema obligará al empleado a cambiar esta contraseña en su primer inicio de sesión.</small>
              </div>

            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setModal(false)} type="button">Cancelar</button>
              <button className="adm-btn adm-btn-primary" onClick={handleGuardar} type="button">Registrar Empleado</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}