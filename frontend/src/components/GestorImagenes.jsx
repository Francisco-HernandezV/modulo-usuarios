import { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import api from "../services/api";
import { cldUrl } from "../utils/cloudinary";

const MAX_IMAGENES = 4;
const MAX_MB = 5;
const FORMATOS = ["image/jpeg", "image/png", "image/webp", "image/avif"];

const IconStar = ({ lleno }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={lleno ? "currentColor" : "none"}
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
IconStar.propTypes = { lleno: PropTypes.bool };

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" /><path d="M14 11v6" />
  </svg>
);

export default function GestorImagenes({ productoId, onCambio }) {
  const [imagenes, setImagenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [arrastrando, setArrastrando] = useState(false);
  const inputRef = useRef(null);

  const cargar = useCallback(async () => {
    if (!productoId) return;
    try {
      const res = await api.get(`/admin/productos/${productoId}/imagenes`);
      setImagenes(res.data);
    } catch {
      setError("No se pudieron cargar las imágenes.");
    } finally {
      setCargando(false);
    }
  }, [productoId]);

  useEffect(() => { cargar(); }, [cargar]);

  const notificar = () => { if (onCambio) onCambio(); };

  // ── Subida ────────────────────────────────────────────────
  const subir = async (listaArchivos) => {
    const archivos = Array.from(listaArchivos);
    if (archivos.length === 0) return;
    setError("");

    // Validación en el cliente (el backend vuelve a validar, esto es solo UX)
    if (imagenes.length + archivos.length > MAX_IMAGENES) {
      setError(`Máximo ${MAX_IMAGENES} imágenes por producto. Ya tienes ${imagenes.length}.`);
      return;
    }
    for (const a of archivos) {
      if (!FORMATOS.includes(a.type)) {
        setError(`"${a.name}" no es un formato válido. Usa JPG, PNG, WEBP o AVIF.`);
        return;
      }
      if (a.size > MAX_MB * 1024 * 1024) {
        setError(`"${a.name}" pesa más de ${MAX_MB} MB.`);
        return;
      }
    }

    const fd = new FormData();
    archivos.forEach((a) => fd.append("imagenes", a));

    setSubiendo(true);
    try {
      await api.post(`/admin/productos/${productoId}/imagenes`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await cargar();
      notificar();
    } catch (e) {
      setError(e.response?.data?.message || "Error al subir las imágenes.");
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  // ── Eliminar ──────────────────────────────────────────────
  const eliminar = async (imagenId) => {
    setError("");
    try {
      await api.delete(`/admin/productos/${productoId}/imagenes/${imagenId}`);
      setImagenes((prev) => prev.filter((i) => i.id !== imagenId));
      await cargar();
      notificar();
    } catch (e) {
      setError(e.response?.data?.message || "Error al eliminar la imagen.");
    }
  };

  // ── Marcar portada ────────────────────────────────────────
  const hacerPrincipal = async (imagenId) => {
    setError("");
    try {
      await api.put(`/admin/productos/${productoId}/imagenes/${imagenId}/principal`);
      await cargar();
      notificar();
    } catch (e) {
      setError(e.response?.data?.message || "Error al marcar la portada.");
    }
  };

  // ── Drag & drop ───────────────────────────────────────────
  const onDrop = (e) => {
    e.preventDefault();
    setArrastrando(false);
    if (e.dataTransfer.files?.length) subir(e.dataTransfer.files);
  };

  const zonaStyle = {
    border: `2px dashed ${arrastrando ? "#3b82f6" : "#4b5563"}`,
    background: arrastrando ? "rgba(59,130,246,0.08)" : "#1f2937",
    borderRadius: "10px",
    padding: "28px 20px",
    textAlign: "center",
    cursor: subiendo ? "wait" : "pointer",
    transition: "all .2s",
    marginBottom: "20px",
  };

  if (!productoId) {
    return <p style={{ color: "#9ca3af" }}>Guarda el producto primero para poder subir fotos.</p>;
  }

  return (
    <div>
      {/* Zona de carga */}
      <button
        type="button"
        style={{ ...zonaStyle, width: "100%", color: "inherit" }}
        onClick={() => !subiendo && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={onDrop}
        disabled={subiendo}
      >
        <div style={{ fontSize: "28px", marginBottom: "8px" }}>{subiendo ? "⏳" : "🖼️"}</div>
        <p style={{ color: "white", margin: "0 0 4px", fontWeight: "bold" }}>
          {subiendo ? "Subiendo a Cloudinary..." : "Arrastra tus fotos o haz clic aquí"}
        </p>
        <p style={{ color: "#9ca3af", margin: 0, fontSize: "13px" }}>
          JPG, PNG, WEBP o AVIF · máx. {MAX_MB} MB c/u · hasta {MAX_IMAGENES} por producto
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={FORMATOS.join(",")}
          multiple
          hidden
          onChange={(e) => subir(e.target.files)}
        />
      </button>

      {error && (
        <div style={{ background: "rgba(239,68,68,.12)", border: "1px solid #ef4444",
                      color: "#fca5a5", padding: "10px 14px", borderRadius: "8px",
                      marginBottom: "16px", fontSize: "14px" }}>
          {error}
        </div>
      )}

      {/* Galería */}
      {(() => {
        if (cargando) return <p style={{ color: "#9ca3af" }}>Cargando imágenes...</p>;
        if (imagenes.length === 0) {
          return (
            <p style={{ color: "#9ca3af", textAlign: "center", padding: "10px 0" }}>
              Este producto todavía no tiene fotos. La primera que subas será la portada.
            </p>
          );
        }
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "14px" }}>
            {imagenes.map((img) => (
              <div key={img.id}
                   style={{ position: "relative", borderRadius: "10px", overflow: "hidden",
                            border: `2px solid ${img.principal ? "#f59e0b" : "#374151"}`,
                            background: "#0f172a" }}>
                <img
                  src={cldUrl(img.url, "w_300,h_300,c_fill")}
                  alt="Foto del producto"
                  style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }}
                />

                {img.principal && (
                  <span style={{ position: "absolute", top: "6px", left: "6px", background: "#f59e0b",
                                 color: "#111827", fontSize: "10px", fontWeight: "bold",
                                 padding: "3px 7px", borderRadius: "20px" }}>
                    PORTADA
                  </span>
                )}

                <div style={{ display: "flex", gap: "6px", padding: "8px" }}>
                  <button
                    type="button"
                    title="Usar como portada"
                    onClick={() => hacerPrincipal(img.id)}
                    disabled={img.principal}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                             gap: "4px", padding: "6px", borderRadius: "6px", border: "1px solid #4b5563",
                             background: "transparent", color: img.principal ? "#f59e0b" : "#d1d5db",
                             cursor: img.principal ? "default" : "pointer", fontSize: "12px" }}>
                    <IconStar lleno={img.principal} />
                  </button>
                  <button
                    type="button"
                    title="Quitar imagen"
                    onClick={() => eliminar(img.id)}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                             padding: "6px", borderRadius: "6px", border: "1px solid #7f1d1d",
                             background: "rgba(239,68,68,.12)", color: "#fca5a5", cursor: "pointer" }}>
                    <IconTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

GestorImagenes.propTypes = {
  productoId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onCambio: PropTypes.func,
};