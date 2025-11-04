import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import "../styles/theme.css";

function AccountActivation() {
  const { token } = useParams();
  const [mensaje, setMensaje] = useState("Activando cuenta...");
  const [exito, setExito] = useState(false);

  useEffect(() => {
    const activarCuenta = async () => {
      try {
        const res = await api.get(`/users/activar/${token}`);
        setMensaje(res.data.message || "Cuenta activada correctamente");
        setExito(true);
      } catch (error) {
        setMensaje(error.response?.data?.message || "❌ Error al activar la cuenta");
        setExito(false);
      }
    };
    activarCuenta();
  }, [token]);

  return (
    <div className="form-container">
      <h2>Activación de Cuenta</h2>
      <p className={exito ? "mensaje-exito" : "mensaje-error"}>{mensaje}</p>

      <div className="links">
        {exito ? (
          <Link to="/">Iniciar sesión</Link>
        ) : (
          <Link to="/register">Volver al registro</Link>
        )}
      </div>
    </div>
  );
}

export default AccountActivation;
