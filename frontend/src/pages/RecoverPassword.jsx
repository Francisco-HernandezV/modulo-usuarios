import { useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";

function RecoverPassword() {
  const [email, setEmail] = useState("");
  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [nuevaPass, setNuevaPass] = useState("");
  const [confirmarPass, setConfirmarPass] = useState("");
  const [step, setStep] = useState(1);
  const [mensaje, setMensaje] = useState("");

  // Paso 1: buscar correo
  const buscarPregunta = async (e) => {
    e.preventDefault();
    setMensaje("");
    try {
      const res = await api.post("/users/recover", { email });
      setPregunta(res.data.pregunta);
      setStep(2);
    } catch (error) {
      setMensaje("❌ Correo no encontrado");
    }
  };

  // Paso 2: validar respuesta
  const validarRespuesta = async (e) => {
    e.preventDefault();
    setMensaje("");
    try {
      const res = await api.post("/users/recover/validate", { email, respuesta });
      if (res.status === 200) {
        setStep(3);
      }
    } catch (error) {
      setMensaje("❌ Respuesta secreta incorrecta");
    }
  };

  // Paso 3: actualizar contraseña
  const actualizarPassword = async (e) => {
    e.preventDefault();
    setMensaje("");
    if (nuevaPass !== confirmarPass) {
      setMensaje("⚠️ Las contraseñas no coinciden");
      return;
    }

    try {
      await api.post("/users/recover/reset", { email, nueva_password: nuevaPass });
      setMensaje("✅ Contraseña actualizada correctamente");
      setStep(1);
      setEmail("");
      setRespuesta("");
      setNuevaPass("");
      setConfirmarPass("");
    } catch (error) {
      setMensaje("❌ Error al actualizar la contraseña");
    }
  };

  return (
    <div>
      <h2>Recuperar Contraseña</h2>

      {step === 1 && (
        <form onSubmit={buscarPregunta}>
          <input
            type="email"
            placeholder="Ingresa tu correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          /><br />
          <button type="submit">Continuar</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={validarRespuesta}>
          <p><b>Pregunta secreta:</b> {pregunta}</p>
          <input
            type="text"
            placeholder="Ingresa tu respuesta secreta"
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            required
          /><br />
          <button type="submit">Verificar</button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={actualizarPassword}>
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={nuevaPass}
            onChange={(e) => setNuevaPass(e.target.value)}
            required
          /><br />
          <input
            type="password"
            placeholder="Confirmar nueva contraseña"
            value={confirmarPass}
            onChange={(e) => setConfirmarPass(e.target.value)}
            required
          /><br />
          <button type="submit">Cambiar contraseña</button>
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