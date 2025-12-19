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
  // 15 minutos en milisegundos
  const INACTIVITY_LIMIT = 15 * 60 * 1000; 

  useEffect(() => {
    let timeout;

    // 👇 ESTA ES LA FUNCIÓN CORRECTA (se llama logoutUser)
    const logoutUser = () => {
      if (localStorage.getItem("token")) {
        console.log("Sesión expirada por inactividad");
        localStorage.removeItem("token");
        navigate("/login");
        window.location.reload(); // Recarga para asegurar limpieza
      }
    };

    const resetTimer = () => {
      // Si hay token, reiniciamos contador
      if (localStorage.getItem("token")) {
        clearTimeout(timeout);
        // 👇 AQUÍ ESTABA EL ERROR: Antes decía handleLogout, debe decir logoutUser
        timeout = setTimeout(logoutUser, INACTIVITY_LIMIT);
      }
    };

    // Eventos
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keypress", resetTimer);
    window.addEventListener("click", resetTimer);
    window.addEventListener("scroll", resetTimer);

    resetTimer();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keypress", resetTimer);
      window.removeEventListener("click", resetTimer);
      window.removeEventListener("scroll", resetTimer);
    };
  }, [navigate]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      {/* El manejador de inactividad debe estar AQUÍ dentro */}
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