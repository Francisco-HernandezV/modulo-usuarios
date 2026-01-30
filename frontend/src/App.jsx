import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SearchProvider } from "./context/SearchContext"; // <--- IMPORTANTE

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
    <SearchProvider> {/* <--- ENVOLVEMOS TODO AQUÍ */}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/recover" element={<RecoverPassword />} />
          <Route path="/activar/:token" element={<AccountActivation />} />
          
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

          {/* Rutas de Error */}
          <Route path="*" element={<Error404 />} />
          <Route path="/error-400" element={<Error400 />} />
          <Route path="/error-500" element={<Error500 />} />

        </Routes>
      </BrowserRouter>
    </SearchProvider>
  );
}

export default App;