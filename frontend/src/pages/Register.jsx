import { useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";
import "../styles/theme.css";

function Register() {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    pregunta_secreta: "",
    respuesta_secreta: "",
  });
  
  // Estado para mensajes generales (ej. éxito)
  const [mensaje, setMensaje] = useState("");
  // Estado objeto para errores específicos por campo
  const [errores, setErrores] = useState({});

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Limpiar el error de este campo cuando el usuario empiece a escribir
    if (errores[e.target.name]) {
      setErrores({ ...errores, [e.target.name]: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setErrores({}); // Limpiar errores previos

    try {
      const response = await api.post("/users/register", form);
      setMensaje("✅ Registro exitoso. Revisa tu correo para activar la cuenta.");
      setForm({
        nombre: "",
        email: "",
        password: "",
        pregunta_secreta: "",
        respuesta_secreta: "",
      });
    } catch (error) {
      // 1. Si el backend nos manda un array de errores específicos (validaciones)
      if (error.response?.data?.errors) {
        const erroresBackend = {};
        error.response.data.errors.forEach((err) => {
          // 'path' es el nombre del campo (ej: "email", "password")
          erroresBackend[err.path] = err.msg;
        });
        setErrores(erroresBackend);
        setMensaje("❌ Por favor corrige los errores indicados.");
      } 
      // 2. Si es un error genérico (ej. "Usuario ya existe")
      else {
        setMensaje(error.response?.data?.message || "❌ Error al registrar usuario");
      }
    }
  };

  const preguntasSecretas = [
    "¿Cuál es el nombre de tu primera mascota?",
    "¿Cuál es tu comida favorita?",
    "¿Cuál es el nombre de tu mejor amigo de la infancia?",
    "¿En qué ciudad naciste?",
    "¿Cuál fue tu primer videojuego?",
    "¿Cuál es el nombre de tu profesor favorito?",
  ];

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
            // Si hay error, borde rojo (puedes añadir clase CSS si prefieres)
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

        {/* PASSWORD */}
        <div style={{ marginBottom: "15px" }}>
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            value={form.password}
            onChange={handleChange}
            style={errores.password ? { borderColor: "red", marginBottom: "5px" } : {}}
          />
          {errores.password && <small style={{ color: "red", display: "block", textAlign: "left" }}>{errores.password}</small>}
        </div>

        {/* PREGUNTA SECRETA */}
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="pregunta_secreta" style={{display: "block", textAlign: "left", marginBottom: "5px"}}>Selecciona una pregunta secreta:</label>
          <select
            name="pregunta_secreta"
            value={form.pregunta_secreta}
            onChange={handleChange}
            style={errores.pregunta_secreta ? { borderColor: "red", marginBottom: "5px" } : {}}
          >
            <option value="">-- Selecciona una pregunta --</option>
            {preguntasSecretas.map((pregunta, i) => (
              <option key={i} value={pregunta}>
                {pregunta}
              </option>
            ))}
          </select>
          {errores.pregunta_secreta && <small style={{ color: "red", display: "block", textAlign: "left" }}>{errores.pregunta_secreta}</small>}
        </div>

        {/* RESPUESTA SECRETA */}
        <div style={{ marginBottom: "15px" }}>
          <input
            type="text"
            name="respuesta_secreta"
            placeholder="Tu respuesta secreta"
            value={form.respuesta_secreta}
            onChange={handleChange}
            style={errores.respuesta_secreta ? { borderColor: "red", marginBottom: "5px" } : {}}
          />
          {errores.respuesta_secreta && <small style={{ color: "red", display: "block", textAlign: "left" }}>{errores.respuesta_secreta}</small>}
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