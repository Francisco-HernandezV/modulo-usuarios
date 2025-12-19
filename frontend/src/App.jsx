import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RecoverPassword from "./pages/RecoverPassword";
import AccountActivation from "./pages/AccountActivation";
import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails";
import ProtectedRoute from "./components/ProtectedRoute";
function InactivityHandler() {
  const navigate = useNavigate();
  const INACTIVITY_LIMIT = 15 * 60 * 1000; 

  useEffect(() => {
    let timeout;
    const resetTimer = () => {
      if (localStorage.getItem("token")) {
        clearTimeout(timeout);
        timeout = setTimeout(logoutUser, INACTIVITY_LIMIT);
      }
    };
    const logoutUser = () => {
      if (localStorage.getItem("token")) {
        console.log("Sesión expirada");
        localStorage.removeItem("token");
        navigate("/login");
      }
    };
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    resetTimer();
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
    };
  }, [navigate]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <InactivityHandler />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
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

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recover" element={<RecoverPassword />} />
        <Route path="/activar/:token" element={<AccountActivation />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;