import { useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";

function RecoverPassword() {
  const [email, setEmail] = useState("");
  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [nuevaPass, setNuevaPass] = useState("");
  const [step, setStep] = useState(1);
  const [mensaje, setMensaje] = useState("");

  const buscarPregunta = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/users/recover", { email });
      setPregunta(res.data.pregunta);
      setStep(2);
    } catch (error) {
      setMensaje("Correo no encontrado ❌");
    }
  };

  const validarRespuesta = async (e) => {
    e.preventDefault();
    try {
      await api.post("/users/recover/validate", { email, respuesta, nuevaPass });
      setMensaje("Contraseña actualizada ✅");
    } catch (error) {
      setMensaje("Respuesta incorrecta ❌");
    }
  };

  return (
    <div>
      <h2>Recuperar Contraseña</h2>

      {step === 1 && (
        <form onSubmit={buscarPregunta}>
          <input
            type="email"
            placeholder="Ingresa tu correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          /><br />
          <button type="submit">Buscar pregunta</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={validarRespuesta}>
          <p><b>Pregunta:</b> {pregunta}</p>
          <input
            type="text"
            placeholder="Respuesta secreta"
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            required
          /><br />
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={nuevaPass}
            onChange={(e) => setNuevaPass(e.target.value)}
            required
          /><br />
          <button type="submit">Actualizar contraseña</button>
        </form>
      )}

      {mensaje && <p>{mensaje}</p>}

      <div>
        <Link to="/">Volver al inicio</Link>
      </div>
    </div>
  );
}

export default RecoverPassword;
