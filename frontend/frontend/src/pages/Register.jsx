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
  const [mensaje, setMensaje] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/users/register", form);
      setMensaje("✅ Registro exitoso. Revisa tu correo para activar la cuenta.");
      console.log(response.data);
    } catch (error) {
      setMensaje(error.response?.data?.message || "❌ Error al registrar usuario");
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
        <input
          type="text"
          name="nombre"
          placeholder="Nombre completo"
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Correo electrónico"
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Contraseña"
          onChange={handleChange}
          required
        />

        <label htmlFor="pregunta_secreta">Selecciona una pregunta secreta:</label>
        <select
          name="pregunta_secreta"
          value={form.pregunta_secreta}
          onChange={handleChange}
          required
        >
          <option value="">-- Selecciona una pregunta --</option>
          {preguntasSecretas.map((pregunta, i) => (
            <option key={i} value={pregunta}>
              {pregunta}
            </option>
          ))}
        </select>

        <input
          type="text"
          name="respuesta_secreta"
          placeholder="Tu respuesta secreta"
          onChange={handleChange}
          required
        />

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
