import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"; // 👈 1. Importa Navigate
import Login from "./pages/Login";
import Register from "./pages/Register";
import RecoverPassword from "./pages/RecoverPassword";
import AccountActivation from "./pages/AccountActivation";
import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* 👇 2. Agrega esta línea para redirigir la raíz ("/") al login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Home público */}
        <Route path="/Home" element={<Home />} />

        {/* Detalle del producto */}
        <Route path="/producto/:id" element={<ProductDetails />} />

        {/* Tus rutas actuales */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recover" element={<RecoverPassword />} />
        <Route path="/activate/:token" element={<AccountActivation />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;