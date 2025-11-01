import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { GoogleLogin } from "@react-oauth/google";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");

  // 🔹 Inicio de sesión clásico
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/users/login", { email, password });
      setMensaje("Inicio de sesión exitoso ✅");
      console.log(response.data);
    } catch (error) {
      setMensaje(error.response?.data?.message || "Error al iniciar sesión ❌");
    }
  };

  // 🔹 Inicio de sesión con Google
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const token = credentialResponse.credential;
      // Enviar token al backend para validarlo
      const res = await api.post("/auth/google", { token });
      setMensaje("Inicio de sesión con Google exitoso ");
      console.log(res.data);
    } catch (error) {
      console.error(error);
      setMensaje("Error al iniciar sesión con Google ");
    }
  };

  const handleGoogleError = () => {
    setMensaje("Error al conectar con Google ");
  };

  return (
    <div style={{ maxWidth: "400px", margin: "40px auto", textAlign: "center" }}>
      <h2>Iniciar Sesión</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
        />
        <button type="submit" style={{ width: "100%", padding: "8px" }}>
          Ingresar
        </button>
      </form>

      <hr style={{ margin: "20px 0" }} />
      <p>O ingresa con:</p>

      {/* 🔹 Botón de Google */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
      </div>

      {mensaje && <p style={{ marginTop: "15px" }}>{mensaje}</p>}

      <div style={{ marginTop: "15px" }}>
        <Link to="/register">Registrarse</Link> |{" "}
        <Link to="/recover">¿Olvidaste tu contraseña?</Link>
      </div>
    </div>
  );
}

export default Login;
