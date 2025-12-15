import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { GoogleLogin } from "@react-oauth/google";
import "../styles/theme.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");

  // 🔹 Inicio de sesión clásico
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/users/login", { email, password });
      setMensaje("✅ Inicio de sesión exitoso");
      console.log(response.data);
    } catch (error) {
      setMensaje(error.response?.data?.message || "❌ Error al iniciar sesión");
    }
  };

  // 🔹 Inicio de sesión con Google
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const token = credentialResponse.credential;
      const res = await api.post("/auth/google", { token });
      setMensaje("✅ Inicio de sesión con Google exitoso");
      console.log(res.data);
    } catch (error) {
      console.error(error);
      setMensaje("❌ Error al iniciar sesión con Google");
    }
  };

  const handleGoogleError = () => {
    setMensaje("❌ Error al conectar con Google");
  };

  return (
    <div className="form-container">
      <h2>Iniciar Sesión</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="links">
        <Link to="/Home">Iniciar sesión</Link>
      </div>
      </form>

      <div className="divider">o</div>

      <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />

      {mensaje && (
        <p className={mensaje.includes("✅") ? "mensaje-exito" : "mensaje-error"}>
          {mensaje}
        </p>
      )}

      <div className="links">
        <Link to="/register">Registrarse</Link> |{" "}
        <Link to="/recover">¿Olvidaste tu contraseña?</Link>
      </div>
    </div>
  );
}

export default Login;
