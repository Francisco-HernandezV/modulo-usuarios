import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RecoverPassword from "./pages/RecoverPassword";
import AccountActivation from "./pages/AccountActivation";
import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails";
import ProtectedRoute from "./components/ProtectedRoute";

// Componente para manejar inactividad dentro del Router
function InactivityHandler() {
  const navigate = useNavigate();
  const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutos

  useEffect(() => {
    let timeout;

    // Función para cerrar sesión por inactividad
    const logoutUser = () => {
      if (localStorage.getItem("token")) {
        console.log("Sesión expirada por inactividad");
        localStorage.removeItem("token"); // Borrar token
        navigate("/login"); // Redirigir al login
      }
    };

    const resetTimer = () => {
      // Si hay token (usuario logueado), reiniciamos el contador
      if (localStorage.getItem("token")) {
        clearTimeout(timeout);
        timeout = setTimeout(logoutUser, INACTIVITY_LIMIT);
      }
    };

    // Escuchar eventos de actividad
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keypress", resetTimer);
    window.addEventListener("click", resetTimer);
    window.addEventListener("scroll", resetTimer);

    // Iniciar el temporizador al cargar
    resetTimer();

    // Limpieza al desmontar
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keypress", resetTimer);
      window.removeEventListener("click", resetTimer);
      window.removeEventListener("scroll", resetTimer);
    };
  }, [navigate]);

  return null; // Este componente es invisible
}

function App() {
  return (
    <BrowserRouter>
      {/* El manejador de inactividad debe estar dentro del Router */}
      <InactivityHandler />
      
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Rutas Protegidas */}
        <Route 
          path="/Home" 
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/producto/:id" 
          element={
            <ProtectedRoute>
              <ProductDetails />
            </ProtectedRoute>
          } 
        />

        {/* Rutas Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recover" element={<RecoverPassword />} />
        <Route path="/activar/:token" element={<AccountActivation />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;