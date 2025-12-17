import { useState } from "react";
import api from "../services/api";
import { Link, useNavigate } from "react-router-dom";
import "../styles/theme.css";

function RecoverPassword() {
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [token, setToken] = useState(""); 
  
  const [nuevaPass, setNuevaPass] = useState("");
  const [confirmarPass, setConfirmarPass] = useState("");

  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  
  const [mensaje, setMensaje] = useState("");

  const handleCheckEmail = async (e) => {
    e.preventDefault();
    setMensaje(""); 
    try {
      const res = await api.post("/users/recover/check", { email });
      setPregunta(res.data.pregunta);
      setStep(2); 
    } catch (error) {
      setMensaje(error.response?.data?.message || "❌ Correo no encontrado");
    }
  };

  const handleSendEmail = async () => {
    setMensaje(""); 
    try {
      await api.post("/users/recover/send-email", { email });
      setStep(5); 
    } catch (error) {
      console.error(error);
      setMensaje("Error al enviar el correo. Intenta más tarde.");
    }
  };

  const handleVerifyAnswer = async (e) => {
    e.preventDefault();
    setMensaje(""); 
    try {
      const res = await api.post("/users/recover/answer", { email, respuesta });
      setToken(res.data.token);
      setStep(4); 
    } catch (error) {
      setMensaje("❌ Respuesta incorrecta");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMensaje(""); 
    if (nuevaPass !== confirmarPass) {
      setMensaje("⚠️ Las contraseñas no coinciden");
      return;
    }

    try {
      await api.post("/users/recover/reset", { 
        token, 
        nueva_password: nuevaPass 
      });
      setMensaje("✅ Contraseña actualizada correctamente");
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
       if (error.response?.data?.errors) {
         setMensaje(error.response.data.errors[0].msg);
       } else {
         setMensaje(error.response?.data?.message || "Error al actualizar");
       }
    }
  };

  // Iconos SVG reutilizables para mantener el código limpio
  const EyeIconOpen = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
  );
  
  const EyeIconClosed = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
  );

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
            onClick={() => { setStep(3); setMensaje(""); }} 
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
            onClick={() => { setStep(2); setMensaje(""); }}
            style={{ marginTop: "10px", background: "transparent", color: "#888", border: "1px solid #555" }}
          >
            Atrás
          </button>
        </form>
      )}

      {/* --- PASO 4: CAMBIAR CONTRASEÑA --- */}
      {step === 4 && (
        <form onSubmit={handleResetPassword}>
          <h3>Crea tu nueva contraseña</h3>
          
          {/* Nueva Contraseña - Usando la clase CSS */}
          <div className="password-wrapper">
            <input
              type={showNewPass ? "text" : "password"}
              placeholder="Nueva contraseña"
              value={nuevaPass}
              onChange={(e) => setNuevaPass(e.target.value)}
              required
            />
            <button
              type="button"
              className="eye-btn"
              onClick={() => setShowNewPass(!showNewPass)}
            >
              {showNewPass ? <EyeIconOpen /> : <EyeIconClosed />}
            </button>
          </div>

          {/* Confirmar Contraseña - Usando la clase CSS */}
          <div className="password-wrapper">
            <input
              type={showConfirmPass ? "text" : "password"}
              placeholder="Confirmar contraseña" 
              value={confirmarPass}
              onChange={(e) => setConfirmarPass(e.target.value)}
              required
            />
            <button
              type="button"
              className="eye-btn"
              onClick={() => setShowConfirmPass(!showConfirmPass)}
            >
              {showConfirmPass ? <EyeIconOpen /> : <EyeIconClosed />}
            </button>
          </div>

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