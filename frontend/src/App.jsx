import { BrowserRouter, Routes, Route } from "react-router-dom";
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

        {/* Home público */}
        <Route path="/" element={<Home />} />

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
