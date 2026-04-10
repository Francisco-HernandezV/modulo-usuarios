import { useState, useEffect } from "react";
import api from "../../services/api";
import "../../styles/theme.css";

const IconX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

const PRESETS = [
  { label: "Ropa estándar",  vals: ["CH","M","G","EG","EEG"] },
  { label: "Calzado 23–28",  vals: ["23","23.5","24","24.5","25","25.5","26","26.5","27","27.5","28"] },
  { label: "Pantalón",       vals: ["28X30","28X32","30X30","30X32","32X30","32X32","34X30","34X32"] },
];

export default function FormularioTallas({ onSubmit, onCancel }) {
  const [tiposTalla, setTiposTalla] = useState([]);
  const [tipoId, setTipoId]         = useState("");
  const [esNuevo, setEsNuevo]       = useState(false);
  const [nuevoTipo, setNuevoTipo]   = useState("");
  const [valores, setValores]       = useState([]);
  const [inputVal, setInputVal]     = useState("");

  useEffect(() => {
    api.get("/admin/tipos-talla")
      .then(r => {
        setTiposTalla(r.data);
        if (r.data.length > 0) setTipoId(r.data[0].id);
      })
      .catch(() => {});
  }, []);

  const addValor = (v) => {
    const clean = v.toUpperCase().trim().replace(/,$/,"");
    if (clean && !valores.includes(clean)) setValores(prev => [...prev, clean]);
  };

  const removeValor = (v) => setValores(prev => prev.filter(x => x !== v));

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      inputVal.split(",").map(s => s.trim()).filter(Boolean).forEach(addValor);
      setInputVal("");
    } else if (e.key === "Backspace" && inputVal === "" && valores.length > 0) {
      removeValor(valores[valores.length - 1]);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    e.clipboardData.getData("text").split(/[,\n]+/).map(s => s.trim()).filter(Boolean).forEach(addValor);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!esNuevo && !tipoId)        return alert("Selecciona un tipo de talla");
    if (esNuevo && !nuevoTipo.trim()) return alert("Escribe el nombre del nuevo tipo");
    if (!valores.length)             return alert("Agrega al menos un valor de talla");

    onSubmit({
      tipo_talla_id: esNuevo ? null : Number(tipoId),
      nuevo_tipo:    esNuevo ? nuevoTipo.trim() : null,
      valores,
    });
  };

  const inputBase = {
    width: "100%", padding: "10px", borderRadius: "6px",
    border: "1px solid #4b5563", background: "transparent",
    color: "white", outline: "none", fontSize: "14px",
  };

  const labelBase = { display: "block", marginBottom: "8px", color: "#d1d5db", fontSize: "14px" };

  const tipoBtnStyle = (active) => ({
    padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "13px",
    background: active ? "#1f2937" : "transparent",
    color:      active ? "white"   : "#9ca3af",
    border:    `1px solid ${active ? "#3b82f6" : "#4b5563"}`,
  });

  return (
    <div className="adm-modal-overlay">
      <div className="adm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "490px" }}>

        <div className="adm-modal-header">
          <h3 className="adm-modal-title">Nuevas tallas</h3>
          <button className="adm-modal-close" onClick={onCancel} type="button"><IconX /></button>
        </div>

        <div className="adm-modal-body">
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Tipo de talla */}
            <div>
              <label style={labelBase}>Tipo de talla</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: esNuevo ? "10px" : "0" }}>
                {tiposTalla.map(t => (
                  <button
                    key={t.id} type="button"
                    onClick={() => { setTipoId(t.id); setEsNuevo(false); }}
                    style={tipoBtnStyle(!esNuevo && Number(tipoId) === t.id)}
                  >
                    {t.nombre}
                  </button>
                ))}
                <button type="button" onClick={() => setEsNuevo(true)} style={tipoBtnStyle(esNuevo)}>
                  + Nuevo tipo
                </button>
              </div>
              {esNuevo && (
                <input
                  type="text" placeholder="Ej: Ropa infantil"
                  value={nuevoTipo} onChange={e => setNuevoTipo(e.target.value)}
                  style={inputBase} autoFocus
                />
              )}
            </div>

            {/* Tag input de valores */}
            <div>
              <label style={labelBase}>
                Valores{" "}
                <span style={{ color: "#6b7280", fontSize: "12px" }}>({valores.length} agregados)</span>
              </label>
              <div
                style={{ border: "1px solid #4b5563", borderRadius: "6px", padding: "8px", display: "flex", flexWrap: "wrap", gap: "6px", minHeight: "48px", cursor: "text" }}
                onClick={() => document.getElementById("talla-tag-input").focus()}
              >
                {valores.map(v => (
                  <span key={v} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", background: "#1f2937", border: "1px solid #374151", borderRadius: "20px", fontSize: "13px", color: "#d1d5db" }}>
                    {v}
                    <button type="button" onClick={() => removeValor(v)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: "15px", padding: 0, lineHeight: 1 }}>×</button>
                  </span>
                ))}
                <input
                  id="talla-tag-input"
                  type="text"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={valores.length === 0 ? "Escribe un valor y presiona Enter o coma…" : ""}
                  style={{ border: "none", outline: "none", background: "transparent", color: "white", fontSize: "14px", flex: 1, minWidth: "120px" }}
                />
              </div>
              <p style={{ color: "#6b7280", fontSize: "12px", marginTop: "5px" }}>
                Puedes pegar varios separados por coma. Ej: CH, M, G, EG
              </p>
            </div>

            {/* Atajos en bloque */}
            <div>
              <label style={labelBase}>Agregar en bloque</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {PRESETS.map(preset => (
                  <button
                    key={preset.label} type="button"
                    onClick={() => preset.vals.forEach(addValor)}
                    style={{ padding: "7px 12px", borderRadius: "6px", background: "transparent", color: "#9ca3af", border: "1px solid #4b5563", cursor: "pointer", fontSize: "12px" }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
              <button type="button" className="adm-btn adm-btn-ghost" onClick={onCancel}>Cancelar</button>
              <button type="submit" className="adm-btn adm-btn-primary" style={{ borderRadius: "6px", minWidth: "120px" }}>Guardar tallas</button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}