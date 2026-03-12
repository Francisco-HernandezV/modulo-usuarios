import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SearchProvider } from "./context/SearchContext";
import Home            from "./pages/Home";
import Catalog         from "./pages/Catalog";
import ProductDetails  from "./pages/ProductDetails";
import Login           from "./pages/Login";
import Register        from "./pages/Register";
import RecoverPassword from "./pages/RecoverPassword";
import AccountActivation from "./pages/AccountActivation";
import UserProfile     from "./pages/UserProfile";
import ProtectedRoute  from "./components/ProtectedRoute";
import Error404 from "./pages/Error404";
import Error500 from "./pages/Error500";
import Error400 from "./pages/Error400";
import AdminDashboard  from "./pages/admin/AdminDashboard";
import AdminCategorias from "./pages/admin/AdminCategorias";
import AdminProductos  from "./pages/admin/AdminProductos";
import AdminClientes   from "./pages/admin/AdminClientes";
import AdminInventario from "./pages/admin/AdminInventario";
import AdminRespaldos from "./pages/admin/AdminRespaldos";

function App() {
  return (
    <SearchProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"                  element={<Home />} />
          <Route path="/catalogo/:filtro"  element={<Catalog />} />
          <Route path="/producto/:id"      element={<ProductDetails />} />
          <Route path="/login"             element={<Login />} />
          <Route path="/register"          element={<Register />} />
          <Route path="/recover"           element={<RecoverPassword />} />
          <Route path="/activar/:token"    element={<AccountActivation />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            }
          />
          <Route path="/admin"             element={<AdminDashboard />} />
          <Route path="/admin/categorias"  element={<AdminCategorias />} />
          <Route path="/admin/productos"   element={<AdminProductos />} />
          <Route path="/admin/clientes"    element={<AdminClientes />} />
          <Route path="/admin/inventario"  element={<AdminInventario />} />
          <Route path="/error-400"         element={<Error400 />} />
          <Route path="/error-500"         element={<Error500 />} />
          <Route path="/admin/respaldos"   element={<AdminRespaldos />} />
          <Route path="*"                  element={<Error404 />} />
        </Routes>
      </BrowserRouter>
    </SearchProvider>
  );
}

export default App;