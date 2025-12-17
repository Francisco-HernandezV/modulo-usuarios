import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { GoogleLogin } from "@react-oauth/google";
import "../styles/theme.css";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Estado para el ojito
  const [showPassword, setShowPassword] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [errores, setErrores] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setErrores({});
    try {
      const response = await api.post("/users/login", { email, password });
      setMensaje("✅ Inicio de sesión exitoso");
      console.log(response.data);
      setTimeout(() => {
        navigate("/Home"); 
      }, 1000);

    } catch (error) {
      if (error.response?.data?.errors) {
        const erroresBackend = {};
        error.response.data.errors.forEach((err) => {
          erroresBackend[err.path] = err.msg;
        });
        setErrores(erroresBackend);
      }
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
      setTimeout(() => navigate("/Home"), 1000);
    } catch (error) {
      console.error(error);
      setMensaje("Error al iniciar sesión con Google");
    }
  };

  const handleGoogleError = () => {
    setMensaje("Error al conectar con Google");
  };
  
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
        <div style={{ marginBottom: "15px" }}>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => handleInputChange(setEmail, "email", e)}
            style={errores.email ? { borderColor: "red", marginBottom: "5px" } : {}}
          />
          {errores.email && (
            <small style={{ color: "red", display: "block", textAlign: "left" }}>
              {errores.email}
            </small>
          )}
        </div>

        {/* CONTRASEÑA CON OJITO */}
        <div style={{ marginBottom: "15px", position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"} // Cambia el tipo dinámicamente
            placeholder="Contraseña"
            value={password}
            onChange={(e) => handleInputChange(setPassword, "password", e)}
            style={errores.password ? { borderColor: "red", marginBottom: "5px", paddingRight: "40px" } : { paddingRight: "40px" }}
          />
          
          {/* Botón del ojito */}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "10px",
              top: "22px", // Ajusta según la altura de tu input
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              width: "auto",
              color: "#888" // Color del icono
            }}
          >
            {showPassword ? (
              // Icono Ojo Abierto (SVG)
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            ) : (
              // Icono Ojo Cerrado (SVG)
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
            )}
          </button>

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