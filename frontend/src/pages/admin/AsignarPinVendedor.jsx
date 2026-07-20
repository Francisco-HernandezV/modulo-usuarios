import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../services/api";

export default function AsignarPinVendedor() {
  const [vendedores, setVendedores] = useState([]);
  const [vendedorId, setVendedorId] = useState("");
  const [nuevoPin, setNuevoPin] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  const soloDigitos = (valor) => valor.replace(/\D/g, "").slice(0, 4);

  const cargarVendedores = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/empleados");
      const soloVendedores = (res.data || []).filter((e) => e.rol === "rol_vendedor");
      setVendedores(soloVendedores);
    } catch (error) {
      console.error("Error cargando vendedores:", error);
      setAlert({ type: "error", msg: "No se pudo cargar la lista de vendedores." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarVendedores(); }, []);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 3500);
    return () => clearTimeout(t);
  }, [alert]);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!vendedorId) {
      setAlert({ type: "error", msg: "Selecciona un vendedor." });
      return;
    }
    if (!/^\d{4}$/.test(nuevoPin)) {
      setAlert({ type: "error", msg: "El PIN debe ser de exactamente 4 dígitos." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post("/users/admin/asignar-pin", {
        vendedorId: Number(vendedorId),
        nuevoPin
      });
      setAlert({ type: "success", msg: res.data.message || "PIN asignado correctamente." });
      setNuevoPin("");
      setVendedorId("");
    } catch (error) {
      console.error("Error asignando PIN:", error);
      setAlert({ type: "error", msg: error.response?.data?.message || "Error al asignar el PIN." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout pageTitle="Asignar PIN a Vendedor" breadcrumb="Asignar PIN">

      {alert && (
        <div className={`adm-alert ${alert.type === "success" ? "adm-alert-success" : "adm-alert-error"}`}>
          {alert.msg}
        </div>
      )}

      <div className="adm-section-header">
        <h3 className="adm-section-title">
          Define el PIN de 4 dígitos con el que el vendedor accederá por Alexa
        </h3>
      </div>

      {loading ? (
        <div className="adm-empty"><p>Cargando vendedores...</p></div>
      ) : (
        <div style={{ maxWidth: 520 }}>
          <div className="adm-form-group">
            <label>Vendedor *</label>
            <select
              className="adm-select"
              value={vendedorId}
              onChange={(e) => setVendedorId(e.target.value)}
            >
              <option value="">-- Selecciona un vendedor --</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre} {v.email ? `(${v.email})` : ""}
                </option>
              ))}
            </select>
            {vendedores.length === 0 && (
              <small style={{ color: "#8b949e", fontSize: 12, marginTop: 5, display: "block" }}>
                No hay vendedores registrados todavía.
              </small>
            )}
          </div>

          <div className="adm-form-group">
            <label>PIN (4 dígitos) *</label>
            <input
              className="adm-input"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="••••"
              value={nuevoPin}
              onChange={(e) => setNuevoPin(soloDigitos(e.target.value))}
              style={{ letterSpacing: "0.5em", textAlign: "center", fontSize: "1.3rem", fontWeight: "bold" }}
            />
            <small style={{ color: "#8b949e", fontSize: 11, marginTop: 5, display: "block" }}>
              Entrega este PIN al vendedor. Podrá usarlo para iniciar sesión por voz en Alexa.
            </small>
          </div>

          <button
            className="adm-btn adm-btn-primary"
            onClick={handleSubmit}
            type="button"
            disabled={isSubmitting}
            style={{
              background: isSubmitting ? "#6b7280" : "",
              borderColor: isSubmitting ? "#6b7280" : "",
              cursor: isSubmitting ? "not-allowed" : "pointer"
            }}
          >
            {isSubmitting ? "Asignando..." : "Asignar PIN"}
          </button>
        </div>
      )}
    </AdminLayout>
  );
}