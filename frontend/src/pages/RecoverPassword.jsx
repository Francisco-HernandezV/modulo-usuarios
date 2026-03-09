import { useState } from "react";
import api from "../services/api";
import { Link, useNavigate } from "react-router-dom";
import "../styles/theme.css";

// CAMBIOS:
// - Eliminado el Paso 2 de "selección de método" (pregunta vs correo)
// - Eliminado el Paso 3 de "responder pregunta secreta"
// - El flujo ahora es directo: Email → Código por correo → Nueva contraseña
// - Pasos: 1 (email) → 2 (código) → 3 (nueva contraseña)

function RecoverPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [nuevaPass, setNuevaPass] = useState("");
  const [confirmarPass, setConfirmarPass] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  // PASO 1: Enviar código al correo
  const handleSendEmail = async (e) => {
    e.preventDefault();
    setMensaje("");
    setEnviando(true);
    try {
      await api.post("/users/recover/send-email", { email });
      setStep(2);
      setMensaje("✅ Código enviado. Revisa tu correo (incluyendo spam).");
    } catch (error) {
      setMensaje(error.response?.data?.message || "❌ Error al enviar el correo. Intenta más tarde.");
    } finally {
      setEnviando(false);
    }
  };

  // PASO 2: Validar código
  const handleValidateToken = async (e) => {
    e.preventDefault();
    setMensaje("");
    try {
      await api.post("/users/recover/validate-token", { token });
      setStep(3);
      setMensaje("");
    } catch (error) {
      setMensaje("❌ Código inválido o expirado");
    }
  };

  // PASO 3: Cambiar contraseña
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
        setMensaje(error.response?.data?.message || "❌ Error al actualizar");
      }
    }
  };

  const EyeIconOpen = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
  );
  
  const EyeIconClosed = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
  );

  return (
    <div className="form-container">
      <h2>Recuperar Contraseña</h2>

      {/* ── PASO 1: INGRESAR CORREO ── */}
      {step === 1 && (
        <form onSubmit={handleSendEmail}>
          <p style={{ fontSize: "14px", color: "#888", marginBottom: "15px" }}>
            Ingresa tu correo y te enviaremos un código de 6 dígitos.
          </p>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar Código"}
          </button>
        </form>
      )}

      {/* ── PASO 2: INGRESAR CÓDIGO ── */}
      {step === 2 && (
        <form onSubmit={handleValidateToken}>
          <p className="pregunta-texto" style={{ textAlign: "center" }}>
            Hemos enviado un código a <b>{email}</b>.<br />
            Cópialo y pégalo aquí:
          </p>
          <input
            type="text"
            placeholder="Código de 6 dígitos"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            maxLength={6}
            required
          />
          <button type="submit">Verificar Código</button>
          <button 
            type="button" 
            onClick={() => { setStep(1); setMensaje(""); }}
            style={{ marginTop: "10px", background: "transparent", color: "#888", border: "1px solid #555" }}
          >
            ← Cambiar correo / Reenviar
          </button>
        </form>
      )}

      {/* ── PASO 3: NUEVA CONTRASEÑA ── */}
      {step === 3 && (
        <form onSubmit={handleResetPassword}>
          <h3 style={{ marginBottom: "15px" }}>Crea tu nueva contraseña</h3>
          
          {/* Nueva Contraseña */}
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

          {/* Confirmar Contraseña */}
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

      {/* MENSAJES */}
      {mensaje && !mensaje.includes("✅") && (
        <p className="mensaje-error">{mensaje}</p>
      )}
      {mensaje && mensaje.includes("✅") && (
        <p className="mensaje-exito">{mensaje}</p>
      )}

      <div className="links">
        <Link to="/login">Volver al inicio de sesión</Link>
      </div>
    </div>
  );
}

export default RecoverPassword;
