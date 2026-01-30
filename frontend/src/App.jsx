import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RecoverPassword from "./pages/RecoverPassword";
import AccountActivation from "./pages/AccountActivation";
import Home from "./pages/Home";
import UserProfile from "./pages/UserProfile";
import ProductDetails from "./pages/ProductDetails";
import ProtectedRoute from "./components/ProtectedRoute";

// Importamos las páginas de error
import Error404 from "./pages/Error404";
import Error500 from "./pages/Error500"; // Podrías usarlo en un catch global si quisieras
import Error400 from "./pages/Error400";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta Raíz */}
        <Route path="/" element={<Home />} />
        
        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recover" element={<RecoverPassword />} />
        <Route path="/activar/:token" element={<AccountActivation />} />
        
        {/* Protegidas */}
        <Route 
          path="/producto/:id" 
          element={
            <ProtectedRoute>
              <ProductDetails />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          } 
        />
        
        <Route path="*" element={<Error404 />} />
        
        {/* Rutas directas para probar (opcional) */}
        <Route path="/error-500" element={<Error500 />} />
        <Route path="/error-400" element={<Error400 />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;