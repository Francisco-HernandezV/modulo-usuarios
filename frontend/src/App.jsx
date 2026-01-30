import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SearchProvider } from "./context/SearchContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import RecoverPassword from "./pages/RecoverPassword";
import AccountActivation from "./pages/AccountActivation";
import Home from "./pages/Home";
import UserProfile from "./pages/UserProfile";
import ProductDetails from "./pages/ProductDetails";
import ProtectedRoute from "./components/ProtectedRoute";

import Error404 from "./pages/Error404";
import Error500 from "./pages/Error500";
import Error400 from "./pages/Error400";

function App() {
  return (
    <SearchProvider>
      <BrowserRouter>
        <Routes>
          {/* --- RUTAS PÚBLICAS (Cualquiera puede entrar) --- */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/recover" element={<RecoverPassword />} />
          <Route path="/activar/:token" element={<AccountActivation />} />
          <Route path="/producto/:id" element={<ProductDetails />} />
          
          {/* --- RUTAS PROTEGIDAS (Solo usuarios logueados) --- */}
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } 
          />

          {/* --- RUTAS DE ERROR --- */}
          <Route path="/error-400" element={<Error400 />} />
          <Route path="/error-500" element={<Error500 />} />
          <Route path="*" element={<Error404 />} />

        </Routes>
      </BrowserRouter>
    </SearchProvider>
  );
}

export default App;