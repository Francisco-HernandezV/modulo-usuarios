import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../services/api";
import "../styles/theme.css";

function ChangePin() {
  const [nuevoPin, setNuevoPin] = useState("");
  const [confirmarPin, setConfirmarPin] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  // Solo permite dígitos y máximo 4
  const soloDigitos = (valor) => valor.replace(/\D/g, "").slice(0, 4);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");

    if (!/^\d{4}$/.test(nuevoPin)) {
      setMensaje("❌ El PIN debe ser de exactamente 4 dígitos.");
      return;
    }
    if (nuevoPin !== confirmarPin) {
      setMensaje("❌ Los PIN no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/users/cambiar-pin", { nuevoPin });
      setMensaje("✅ " + (res.data.message || "PIN actualizado correctamente."));
      setNuevoPin("");
      setConfirmarPin("");
    } catch (error) {
      console.error("Error al cambiar PIN:", error);
      setMensaje("❌ " + (error.response?.data?.message || "Error al actualizar el PIN."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="main-content">
        <div className="profile-wrapper">
          <div className="profile-header">
            <h2 className="section-title">Cambiar mi PIN de Alexa</h2>
            <p style={{ color: "#8b949e" }}>
              Tu PIN de 4 dígitos para acceder por voz. Elige uno que recuerdes fácil.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="nuevoPin">Nuevo PIN (4 dígitos)</label>
              <input
                id="nuevoPin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="••••"
                value={nuevoPin}
                onChange={(e) => setNuevoPin(soloDigitos(e.target.value))}
                style={{ letterSpacing: "0.5em", textAlign: "center", fontSize: "1.3rem" }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmarPin">Confirmar PIN</label>
              <input
                id="confirmarPin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="••••"
                value={confirmarPin}
                onChange={(e) => setConfirmarPin(soloDigitos(e.target.value))}
                style={{ letterSpacing: "0.5em", textAlign: "center", fontSize: "1.3rem" }}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Guardando..." : "Guardar PIN"}
            </button>

            {mensaje && (
              <p style={{
                marginTop: "15px",
                color: mensaje.includes("✅") ? "#10b981" : "#ef4444",
                fontWeight: "bold"
              }}>
                {mensaje}
              </p>
            )}
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default ChangePin;