import { useState } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import "../../styles/theme.css";

const IconX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

export default function FormularioColor({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    nombre: "",
    codigo_hex: "#3b82f6",
    activo: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return alert("El nombre es obligatorio");
    onSubmit({ nombre: form.nombre, codigo_hex: form.codigo_hex, activo: form.activo });
  };

  return (
    <div className="adm-modal-overlay">
      <div className="adm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
        
        <div className="adm-modal-header">
          <h3 className="adm-modal-title">Nuevo Color</h3>
          <button className="adm-modal-close" onClick={onCancel} type="button">
            <IconX />
          </button>
        </div>

        <div className="adm-modal-body">
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#d1d5db", fontSize: "14px" }}>Nombre del Color</label>
              <input
                type="text"
                placeholder="Ej. Azul Marino"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #4b5563", background: "transparent", color: "white", outline: "none" }}
                autoFocus required
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#d1d5db", fontSize: "14px" }}>Código Hexadecimal</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "15px", alignItems: "center", background: "#111827", padding: "15px", borderRadius: "8px", border: "1px solid #374151" }}>
                
                <HexColorPicker color={form.codigo_hex} onChange={(color) => setForm({ ...form, codigo_hex: color })} />
                
                <div style={{ display: "flex", width: "100%", maxWidth: "200px" }}>
                  <span style={{ padding: "8px 12px", background: "#374151", border: "1px solid #4b5563", borderRight: "none", borderRadius: "6px 0 0 6px", color: "#9ca3af" }}>HEX</span>
                  <HexColorInput 
                    color={form.codigo_hex} 
                    onChange={(color) => setForm({ ...form, codigo_hex: color })} 
                    prefixed 
                    style={{ flex: 1, padding: "8px", borderRadius: "0 6px 6px 0", border: "1px solid #4b5563", background: "transparent", color: "white", outline: "none", textTransform: "uppercase" }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#d1d5db", fontSize: "14px" }}>Estado</label>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={() => setForm({ ...form, activo: true })} style={{ flex: 1, padding: "10px", borderRadius: "6px", cursor: "pointer", fontWeight: "500", background: form.activo ? "#1f2937" : "transparent", color: form.activo ? "white" : "#9ca3af", border: `1px solid ${form.activo ? "#3b82f6" : "#4b5563"}` }}>Activo</button>
                <button type="button" onClick={() => setForm({ ...form, activo: false })} style={{ flex: 1, padding: "10px", borderRadius: "6px", cursor: "pointer", fontWeight: "500", background: !form.activo ? "#1f2937" : "transparent", color: !form.activo ? "white" : "#9ca3af", border: `1px solid ${!form.activo ? "#ef4444" : "#4b5563"}` }}>Inactivo</button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
              <button type="button" className="adm-btn adm-btn-ghost" onClick={onCancel}>Cancelar</button>
              <button type="submit" className="adm-btn adm-btn-primary" style={{ borderRadius: "6px", minWidth: "100px" }}>Crear Color</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}