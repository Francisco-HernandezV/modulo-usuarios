import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SearchProvider } from "./context/SearchContext";

// ── Páginas Principales (existentes) ──────────────────────
import Home            from "./pages/Home";
import Catalog         from "./pages/Catalog";
import ProductDetails  from "./pages/ProductDetails";

// ── Páginas de Usuario / Auth (existentes) ─────────────────
import Login           from "./pages/Login";
import Register        from "./pages/Register";
import RecoverPassword from "./pages/RecoverPassword";
import AccountActivation from "./pages/AccountActivation";
import UserProfile     from "./pages/UserProfile";

// ── Componentes de Seguridad (existentes) ──────────────────
import ProtectedRoute  from "./components/ProtectedRoute";

// ── Páginas de Error (existentes) ─────────────────────────
import Error404 from "./pages/Error404";
import Error500 from "./pages/Error500";
import Error400 from "./pages/Error400";

// ── Panel Administrativo (NUEVOS — Entregables Febrero) ────
import AdminDashboard  from "./pages/admin/AdminDashboard";
import AdminCategorias from "./pages/admin/AdminCategorias";
import AdminProductos  from "./pages/admin/AdminProductos";
import AdminClientes   from "./pages/admin/AdminClientes";
import AdminInventario from "./pages/admin/AdminInventario";

function App() {
  return (
    <SearchProvider>
      <BrowserRouter>
        <Routes>

          {/* ── RUTAS PÚBLICAS DE TIENDA (sin cambios) ────── */}
          <Route path="/"                  element={<Home />} />
          <Route path="/catalogo/:filtro"  element={<Catalog />} />
          <Route path="/producto/:id"      element={<ProductDetails />} />

          {/* ── RUTAS DE AUTENTICACIÓN (sin cambios) ─────── */}
          <Route path="/login"             element={<Login />} />
          <Route path="/register"          element={<Register />} />
          <Route path="/recover"           element={<RecoverPassword />} />
          <Route path="/activar/:token"    element={<AccountActivation />} />

          {/* ── RUTAS PROTEGIDAS — Usuario (sin cambios) ──── */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            }
          />

          {/* ── PANEL ADMINISTRATIVO ─────────────────────────
              ⚠️  TEMPORAL: Sin autenticación para desarrollo.
              TODO: Envolver en <AdminRoute> antes de producción.
          ──────────────────────────────────────────────────── */}
          <Route path="/admin"             element={<AdminDashboard />} />
          <Route path="/admin/categorias"  element={<AdminCategorias />} />
          <Route path="/admin/productos"   element={<AdminProductos />} />
          <Route path="/admin/clientes"    element={<AdminClientes />} />
          <Route path="/admin/inventario"  element={<AdminInventario />} />

          {/* ── RUTAS DE ERROR (sin cambios) ─────────────── */}
          <Route path="/error-400"         element={<Error400 />} />
          <Route path="/error-500"         element={<Error500 />} />
          <Route path="*"                  element={<Error404 />} />

        </Routes>
      </BrowserRouter>
    </SearchProvider>
  );
}

export default App;