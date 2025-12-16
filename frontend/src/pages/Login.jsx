import { useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // 👈 Importamos useNavigate
import api from "../services/api";
import { GoogleLogin } from "@react-oauth/google";
import "../styles/theme.css";

function Login() {
  const navigate = useNavigate(); // 👈 Hook para redirigir
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [mensaje, setMensaje] = useState("");
  // 👇 Nuevo estado para los errores específicos de los campos
  const [errores, setErrores] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setErrores({}); // Limpiamos errores previos

    try {
      const response = await api.post("/users/login", { email, password });
      
      // Si llegamos aquí, el login fue exitoso (200 OK)
      setMensaje("✅ Inicio de sesión exitoso");
      console.log(response.data);

      // AQUÍ redirigimos al usuario tras un breve retraso o inmediatamente
      // Guardar token o usuario en contexto sería el siguiente paso ideal
      setTimeout(() => {
        navigate("/Home"); 
      }, 1000);

    } catch (error) {
      // 1. Errores de validación (campos vacíos o email inválido)
      if (error.response?.data?.errors) {
        const erroresBackend = {};
        error.response.data.errors.forEach((err) => {
          erroresBackend[err.path] = err.msg;
        });
        setErrores(erroresBackend);
      } 
      // 2. Errores de lógica (Credenciales inválidas, cuenta no activa, bloqueada)
      else {
        setMensaje(error.response?.data?.message || "❌ Error al iniciar sesión");
      }
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const token = credentialResponse.credential;
      const res = await api.post("/auth/google", { token });
      setMensaje("Inicio de sesión con Google exitoso");
      console.log(res.data);
      // También redirigimos si es con Google
      setTimeout(() => navigate("/Home"), 1000);
    } catch (error) {
      console.error(error);
      setMensaje("Error al iniciar sesión con Google");
    }
  };

  const handleGoogleError = () => {
    setMensaje("Error al conectar con Google");
  };

  // Función auxiliar para limpiar error al escribir
  const handleInputChange = (setter, fieldName, e) => {
    setter(e.target.value);
    if (errores[fieldName]) {
      setErrores({ ...errores, [fieldName]: null });
    }
  };

  return (
    <div className="form-container">
      <h2>Iniciar Sesión</h2>

      <form onSubmit={handleSubmit}>
        {/* EMAIL */}
        <div style={{ marginBottom: "15px" }}>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => handleInputChange(setEmail, "email", e)}
            // Borde rojo si hay error
            style={errores.email ? { borderColor: "red", marginBottom: "5px" } : {}}
          />
          {errores.email && (
            <small style={{ color: "red", display: "block", textAlign: "left" }}>
              {errores.email}
            </small>
          )}
        </div>

        {/* PASSWORD */}
        <div style={{ marginBottom: "15px" }}>
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => handleInputChange(setPassword, "password", e)}
            style={errores.password ? { borderColor: "red", marginBottom: "5px" } : {}}
          />
          {errores.password && (
            <small style={{ color: "red", display: "block", textAlign: "left" }}>
              {errores.password}
            </small>
          )}
        </div>
        <button type="submit">Iniciar sesión</button>
      </form>

      <div className="divider" style={{margin: "20px 0"}}>o</div>

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