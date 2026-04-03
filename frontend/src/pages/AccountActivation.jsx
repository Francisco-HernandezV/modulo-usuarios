import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import "../styles/theme.css";

function AccountActivation() {
  const { token } = useParams();
  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState(false);
  const [cargando, setCargando] = useState(true); // <-- Nuevo estado de carga
  const fetched = useRef(false);

  useEffect(() => {
    const activarCuenta = async () => {
      if (fetched.current) return;
      fetched.current = true;

      try {
        const res = await api.get(`/users/activar/${token}`);
        setMensaje(res.data.message || "Cuenta activada correctamente");
        setExito(true);
      } catch (error) {
        setMensaje(error.response?.data?.message || "❌ Error al activar la cuenta");
        setExito(false);
      } finally {
        setCargando(false); // Apagamos el loader al terminar
      }
    };
    
    activarCuenta();
  }, [token]);

  return (
    <div className="form-container">
      <h2>Activación de Cuenta</h2>
      
      {cargando ? (
        <p style={{ color: "#3b82f6", fontWeight: "bold" }}>⏳ Verificando token de seguridad...</p>
      ) : (
        <p className={exito ? "mensaje-exito" : "mensaje-error"}>{mensaje}</p>
      )}

      {!cargando && (
        <div className="links">
          {exito ? (
            <Link to="/login">Ir a Iniciar sesión</Link>
          ) : (
            <Link to="/register">Volver al registro</Link>
          )}
        </div>
      )}
    </div>
  );
}

export default AccountActivation;