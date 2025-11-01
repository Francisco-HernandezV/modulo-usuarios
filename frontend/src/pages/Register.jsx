import { useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";

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
      setMensaje("Registro exitoso ✅ Revisa tu correo para activar la cuenta.");
      console.log(response.data);
    } catch (error) {
      setMensaje(error.response?.data?.message || "Error al registrar ❌");
    }
  };

  return (
    <div>
      <h2>Registro de Usuario</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" name="nombre" placeholder="Nombre" onChange={handleChange} required /><br />
        <input type="email" name="email" placeholder="Correo" onChange={handleChange} required /><br />
        <input type="password" name="password" placeholder="Contraseña" onChange={handleChange} required /><br />
        <input type="text" name="pregunta_secreta" placeholder="Pregunta secreta" onChange={handleChange} required /><br />
        <input type="text" name="respuesta_secreta" placeholder="Respuesta secreta" onChange={handleChange} required /><br />
        <button type="submit">Registrarse</button>
      </form>

      {mensaje && <p>{mensaje}</p>}

      <div>
        <Link to="/">¿Ya tienes cuenta? Inicia sesión</Link>
      </div>
    </div>
  );
}

export default Register;
