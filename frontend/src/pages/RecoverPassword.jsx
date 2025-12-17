import { useState } from "react";
import api from "../services/api";
import { Link, useNavigate } from "react-router-dom";
import "../styles/theme.css";

function RecoverPassword() {
  const navigate = useNavigate();
  
  // Estados del flujo
  const [step, setStep] = useState(1); // 1:Email, 2:Opciones, 3:Pregunta, 4:ResetPassword, 5:LinkEnviado
  
  // Datos
  const [email, setEmail] = useState("");
  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [token, setToken] = useState(""); // Token (ya sea del correo o generado por respuesta secreta)
  
  // Campos de nueva contraseña
  const [nuevaPass, setNuevaPass] = useState("");
  const [confirmarPass, setConfirmarPass] = useState("");
  
  const [mensaje, setMensaje] = useState("");

  // PASO 1: Ingresar Correo y buscar si existe
  const handleCheckEmail = async (e) => {
    e.preventDefault();
    setMensaje("");
    try {
      const res = await api.post("/users/recover/check", { email });
      setPregunta(res.data.pregunta);
      setStep(2); // Pasar a selección de opciones
    } catch (error) {
      setMensaje(error.response?.data?.message || "❌ Correo no encontrado");
    }
  };

  // OPCIÓN A: Enviar Correo
  const handleSendEmail = async () => {
    try {
      await api.post("/users/recover/send-email", { email });
      setStep(5); // Pantalla final de correo enviado
    } catch (error) {
      setMensaje("Error al enviar el correo");
    }
  };

  // OPCIÓN B: Validar Respuesta Secreta
  const handleVerifyAnswer = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/users/recover/answer", { email, respuesta });
      // Si es correcto, el backend nos da un TOKEN temporal
      setToken(res.data.token);
      setStep(4); // Pasar directo a cambiar contraseña
    } catch (error) {
      setMensaje("❌ Respuesta incorrecta");
    }
  };

  // PASO FINAL: Cambiar Contraseña (usando el token obtenido)
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (nuevaPass !== confirmarPass) {
      setMensaje("⚠️ Las contraseñas no coinciden");
      return;
    }

    try {
      await api.post("/users/recover/reset", { 
        token, // Usamos el token que nos dio la respuesta secreta
        nueva_password: nuevaPass 
      });
      setMensaje("✅ Contraseña actualizada correctamente");
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
       // Manejo de errores de validación de contraseña (array)
       if (error.response?.data?.errors) {
         setMensaje(error.response.data.errors[0].msg);
       } else {
         setMensaje(error.response?.data?.message || "Error al actualizar");
       }
    }
  };

  return (
    <div className="form-container">
      <h2>Recuperar Contraseña</h2>

      {/* --- PASO 1: EMAIL --- */}
      {step === 1 && (
        <form onSubmit={handleCheckEmail}>
          <input
            type="email"
            placeholder="Ingresa tu correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit">Continuar</button>
        </form>
      )}

      {/* --- PASO 2: SELECCIÓN DE MÉTODO --- */}
      {step === 2 && (
        <div style={{ textAlign: "center" }}>
          <p>¿Cómo deseas recuperar tu contraseña?</p>
          
          <button 
            onClick={() => setStep(3)} 
            style={{ marginBottom: "10px", backgroundColor: "#333" }}
          >
            🔐 Usar Pregunta Secreta
          </button>
          
          <button 
            onClick={handleSendEmail} 
            style={{ backgroundColor: "#0d47a1" }}
          >
            📧 Enviar Enlace al Correo
          </button>
        </div>
      )}

      {/* --- PASO 3: RESPONDER PREGUNTA --- */}
      {step === 3 && (
        <form onSubmit={handleVerifyAnswer}>
          <p className="pregunta-texto">
            <b>Pregunta:</b> {pregunta}
          </p>
          <input
            type="text"
            placeholder="Tu respuesta secreta"
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            required
          />
          <button type="submit">Verificar Respuesta</button>
          <button 
            type="button" 
            onClick={() => setStep(2)} 
            style={{ marginTop: "10px", background: "transparent", color: "#888", border: "1px solid #555" }}
          >
            Atrás
          </button>
        </form>
      )}

      {/* --- PASO 4: CAMBIAR CONTRASEÑA (Desde Pregunta Secreta) --- */}
      {step === 4 && (
        <form onSubmit={handleResetPassword}>
          <h3>Crea tu nueva contraseña</h3>
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={nuevaPass}
            onChange={(e) => setNuevaPass(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirmar nueva contraseña"
            value={confirmarPass}
            onChange={(e) => setConfirmarPass(e.target.value)}
            required
          />
          <button type="submit">Actualizar Contraseña</button>
        </form>
      )}

      {/* --- PASO 5: CORREO ENVIADO --- */}
      {step === 5 && (
        <div>
          <p className="mensaje-exito">
            ✅ Correo enviado con éxito. Revisa tu bandeja de entrada y sigue el enlace.
          </p>
        </div>
      )}

      {/* MENSAJES DE ERROR GLOBALES */}
      {mensaje && !mensaje.includes("✅") && (
        <p className="mensaje-error">{mensaje}</p>
      )}
      
      {mensaje && mensaje.includes("✅") && step !== 5 && (
        <p className="mensaje-exito">{mensaje}</p>
      )}

      <div className="links">
        <Link to="/login">Volver al inicio</Link>
      </div>
    </div>
  );
}

export default RecoverPassword;