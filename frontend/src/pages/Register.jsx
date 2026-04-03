import { useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";
import "../styles/theme.css";

function Register() {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    telefono_contacto: "", 
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [errores, setErrores] = useState({});

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errores[e.target.name]) {
      setErrores({ ...errores, [e.target.name]: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setErrores({});

    try {
      await api.post("/users/register", form);
      setMensaje("✅ Registro exitoso. Revisa tu correo para activar la cuenta.");
      setForm({ nombre: "", email: "", password: "", telefono_contacto: "" });
    } catch (error) {
      if (error.response?.data?.errors) {
        const erroresBackend = {};
        error.response.data.errors.forEach((err) => {
          erroresBackend[err.path] = err.msg;
        });
        setErrores(erroresBackend);
        setMensaje("❌ Por favor corrige los errores indicados.");
      } else {
        setMensaje(error.response?.data?.message || "❌ Error al registrar usuario");
      }
    }
  };

  return (
    <div className="form-container">
      <h2>Registro de Usuario</h2>

      <form onSubmit={handleSubmit}>
        
        {/* NOMBRE */}
        <div style={{ marginBottom: "15px" }}>
          <input
            type="text"
            name="nombre"
            placeholder="Nombre completo"
            value={form.nombre}
            onChange={handleChange}
            style={errores.nombre ? { borderColor: "red", marginBottom: "5px" } : {}}
          />
          {errores.nombre && <small style={{ color: "red", display: "block", textAlign: "left" }}>{errores.nombre}</small>}
        </div>

        {/* EMAIL */}
        <div style={{ marginBottom: "15px" }}>
          <input
            type="email"
            name="email"
            placeholder="Correo electrónico"
            value={form.email}
            onChange={handleChange}
            style={errores.email ? { borderColor: "red", marginBottom: "5px" } : {}}
          />
          {errores.email && <small style={{ color: "red", display: "block", textAlign: "left" }}>{errores.email}</small>}
        </div>

        {/* TELÉFONO */}
        <div style={{ marginBottom: "15px" }}>
          <input
            type="tel"
            name="telefono_contacto"
            placeholder="Teléfono (10 dígitos)"
            maxLength="10"
            value={form.telefono_contacto}
            onChange={handleChange}
            style={errores.telefono_contacto ? { borderColor: "red", marginBottom: "5px" } : {}}
          />
          {errores.telefono_contacto && <small style={{ color: "red", display: "block", textAlign: "left" }}>{errores.telefono_contacto}</small>}
        </div>

        {/* PASSWORD CON OJITO */}
        <div style={{ marginBottom: "15px", position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Contraseña"
            value={form.password}
            onChange={handleChange}
            style={errores.password ? { borderColor: "red", marginBottom: "5px", paddingRight: "40px" } : { paddingRight: "40px" }}
          />
          
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "10px",
              top: "22px",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              width: "auto",
              color: "#888"
            }}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
            )}
          </button>

          {errores.password && <small style={{ color: "red", display: "block", textAlign: "left" }}>{errores.password}</small>}
        </div>

        <button type="submit">Registrarse</button>
      </form>

      {mensaje && (
        <p className={mensaje.includes("✅") ? "mensaje-exito" : "mensaje-error"}>
          {mensaje}
        </p>
      )}

      <div className="links">
        <Link to="/">¿Ya tienes cuenta? Inicia sesión</Link>
      </div>
    </div>
  );
}

export default Register;