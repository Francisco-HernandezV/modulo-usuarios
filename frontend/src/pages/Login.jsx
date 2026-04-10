import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/theme.css";

// 1. SOLUCIÓN: El componente del "Ojito" debe ir AFUERA de la función principal
const InputToggleObj = ({ show, setShow }) => (
  <button type="button" onClick={() => setShow(!show)} style={{ position: "absolute", right: "10px", top: "22px", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, width: "auto", color: "#888" }}>
    {show ? (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
    )}
  </button>
);

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [requireChange, setRequireChange] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [mensaje, setMensaje] = useState(""); 
  const [errores, setErrores] = useState({});

  const processSuccessfulLogin = (data) => {
    localStorage.setItem("token", data.token);
    const userRol = data.usuario?.rol || "rol_cliente";
    localStorage.setItem("rol", userRol);

    // ── Lógica de Redirección por Rol ──
    if (userRol === "rol_admin") {
      navigate("/admin");
    } else if (userRol === "rol_vendedor") {
      navigate("/vendedor"); // Redirige directamente al POS del vendedor
    } else if (userRol === "rol_gestor_inventario") {
      navigate("/admin/inventario");
    } else {
      navigate("/");
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setMensaje(""); setErrores({});
    try {
      const response = await api.post("/users/login", { email, password });
      if (response.data.requirePasswordChange) {
        setRequireChange(true);
        setTempToken(response.data.token);
        setMensaje("⚠️ Por seguridad, debes actualizar tu contraseña temporal.");
      } else {
        processSuccessfulLogin(response.data);
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        const erroresBackend = {};
        error.response.data.errors.forEach((err) => { erroresBackend[err.path] = err.msg; });
        setErrores(erroresBackend);
      } else {
        setMensaje(error.response?.data?.message || "❌ Error al iniciar sesión");
      }
    }
  };

  const handleForceChangeSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    if (newPassword !== confirmNewPassword) {
      setMensaje("❌ Las contraseñas no coinciden");
      return;
    }
    try {
      const config = { headers: { Authorization: `Bearer ${tempToken}` } };
      const response = await api.post("/users/force-password-change", { nueva_password: newPassword }, config);
      processSuccessfulLogin(response.data);
    } catch (error) {
      setMensaje(error.response?.data?.message || "❌ Error al actualizar contraseña.");
    }
  };

  const handleInputChange = (setter, fieldName, e) => {
    setter(e.target.value);
    if (errores[fieldName]) setErrores({ ...errores, [fieldName]: null });
  };

  return (
    <div className="form-container">
      <h2>{requireChange ? "Configura tu Contraseña" : "Iniciar Sesión"}</h2>
      {mensaje && (
        <p className={mensaje.includes("⚠️") || mensaje.includes("✅") ? "mensaje-exito" : "mensaje-error"} style={mensaje.includes("⚠️") ? {backgroundColor: "#f59e0b", color: "black", border: "none"} : {}}>
          {mensaje}
        </p>
      )}
      {!requireChange ? (
        <form onSubmit={handleLoginSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <input type="email" placeholder="Correo electrónico" value={email} onChange={(e) => handleInputChange(setEmail, "email", e)} style={errores.email ? { borderColor: "red" } : {}} />
            {errores.email && <small style={{ color: "red", display: "block", textAlign: "left" }}>{errores.email}</small>}
          </div>
          <div style={{ marginBottom: "15px", position: "relative" }}>
            <input type={showPassword ? "text" : "password"} placeholder="Contraseña" value={password} onChange={(e) => handleInputChange(setPassword, "password", e)} style={{ paddingRight: "40px" }} />
            <InputToggleObj show={showPassword} setShow={setShowPassword} />
          </div>
          <button type="submit">Entrar</button>
          <div className="links">
            <Link to="/register">Registrarse</Link> | <Link to="/recover">¿Olvidaste tu contraseña?</Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleForceChangeSubmit}>
          <div style={{ marginBottom: "15px", position: "relative" }}>
            <input type={showNewPassword ? "text" : "password"} placeholder="Nueva contraseña definitiva" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ paddingRight: "40px" }} required minLength={8}/>
            <InputToggleObj show={showNewPassword} setShow={setShowNewPassword} />
          </div>
          <div style={{ marginBottom: "15px", position: "relative" }}>
            {/* 2. SOLUCIÓN: Faltaba setConfirmNewPassword aquí */}
            <input type={showNewPassword ? "text" : "password"} placeholder="Confirmar contraseña" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} style={{ paddingRight: "40px" }} required minLength={8}/>
          </div>
          <button type="submit">Actualizar y Entrar</button>
        </form>
      )}
    </div>
  );
}