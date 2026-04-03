import { useState } from "react";
import "../../styles/theme.css";

const IconX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

export default function FormularioBasico({ tabActiva, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    activo: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return alert("El nombre es obligatorio");
    onSubmit({ nombre: form.nombre, activo: form.activo });
  };

  // Nombres amigables para el título
  const titulo = tabActiva === "categorias" ? "Categoría" : tabActiva.slice(0, -1);

  return (
    <div className="adm-modal-overlay" onClick={onCancel}>
      <div className="adm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
        
        <div className="adm-modal-header">
          <h3 className="adm-modal-title" style={{ textTransform: "capitalize" }}>
            Nueva {titulo}
          </h3>
          <button className="adm-modal-close" onClick={onCancel} type="button">
            <IconX />
          </button>
        </div>

        <div className="adm-modal-body">
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#d1d5db", fontSize: "14px" }}>Nombre</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #4b5563", background: "transparent", color: "white", outline: "none" }}
                autoFocus required
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#d1d5db", fontSize: "14px" }}>Descripción (Opcional)</label>
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                style={{ width: "100%", padding: "10px", borderRadius: "6px", minHeight: "80px", resize: "vertical", border: "1px solid #4b5563", background: "transparent", color: "white", outline: "none" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#d1d5db", fontSize: "14px" }}>Estado</label>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, activo: true })}
                  style={{
                    flex: 1, padding: "10px", borderRadius: "6px", cursor: "pointer", fontWeight: "500",
                    background: form.activo ? "#1f2937" : "transparent", color: form.activo ? "white" : "#9ca3af",
                    border: `1px solid ${form.activo ? "#3b82f6" : "#4b5563"}`
                  }}
                >
                  Activo
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, activo: false })}
                  style={{
                    flex: 1, padding: "10px", borderRadius: "6px", cursor: "pointer", fontWeight: "500",
                    background: !form.activo ? "#1f2937" : "transparent", color: !form.activo ? "white" : "#9ca3af",
                    border: `1px solid ${!form.activo ? "#ef4444" : "#4b5563"}`
                  }}
                >
                  Inactivo
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
              <button type="button" className="adm-btn adm-btn-ghost" onClick={onCancel}>Cancelar</button>
              <button type="submit" className="adm-btn adm-btn-primary" style={{ borderRadius: "6px", minWidth: "100px" }}>Crear</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}