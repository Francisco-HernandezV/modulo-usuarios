import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SearchProvider } from "./context/SearchContext";

// ── VISTAS PÚBLICAS ──
import Home             from "./pages/Home";
import Catalog          from "./pages/Catalog";
import ProductDetails   from "./pages/ProductDetails";
import Login            from "./pages/Login";
import Register         from "./pages/Register";
import RecoverPassword  from "./pages/RecoverPassword";
import AccountActivation from "./pages/AccountActivation";

// ── VISTAS PRIVADAS / USUARIO ──
import UserProfile      from "./pages/UserProfile";
import ProtectedRoute   from "./components/ProtectedRoute";

// ── ERRORES ──
import Error404 from "./pages/Error404";
import Error500 from "./pages/Error500";
import Error400 from "./pages/Error400";

// ── VISTAS ADMINISTRADOR ──
import AdminDashboard   from "./pages/admin/AdminDashboard";
import AdminCatalogos   from "./pages/admin/AdminCatalogos";
import AdminProductos   from "./pages/admin/AdminProductos";
import AdminClientes    from "./pages/admin/AdminClientes";
import AdminInventario  from "./pages/admin/AdminInventario";
import AdminRespaldos   from "./pages/admin/AdminRespaldos";
import AdminMonitor     from "./components/AdminMonitor"; 
import AdminEmpleados   from "./pages/admin/AdminEmpleados";
import AdminPredictivo from "./pages/admin/AdminPredictivo";
import AdminReportes from './pages/admin/AdminReportes';

// ── VISTAS PUNTO DE VENTA (POS) ──
import POS              from "./pages/pos/POS";
import HistorialVentas  from "./pages/pos/HistorialVentas";

function App() {
  return (
    <SearchProvider>
      <BrowserRouter>
        <Routes>
          {/* ── RUTAS PÚBLICAS ── */}
          <Route path="/"                   element={<Home />} />
          <Route path="/catalogo/:filtro"   element={<Catalog />} />
          <Route path="/producto/:id"       element={<ProductDetails />} />
          <Route path="/login"              element={<Login />} />
          <Route path="/register"           element={<Register />} />
          <Route path="/recover"            element={<RecoverPassword />} />
          <Route path="/activar/:token"     element={<AccountActivation />} />
          <Route path="/error-400"          element={<Error400 />} />
          <Route path="/error-500"          element={<Error500 />} />

          {/* ── RUTAS PRIVADAS BÁSICAS (Clientes y Admins) ── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<UserProfile />} />
          </Route>

          {/* ── 🛡️ RUTAS PROTEGIDAS STRICTAS (Solo Staff) ── */}
          <Route element={<ProtectedRoute rolesPermitidos={["rol_admin", "rol_vendedor", "rol_gestor_inventario"]} />}>
            <Route path="/admin"              element={<AdminDashboard />} />
            <Route path="/admin/catalogos"    element={<AdminCatalogos />} />
            <Route path="/admin/productos"    element={<AdminProductos />} />
            <Route path="/admin/clientes"     element={<AdminClientes />} />
            <Route path="/admin/inventario"   element={<AdminInventario />} />
            <Route path="/admin/respaldos"    element={<AdminRespaldos />} />
            <Route path="/admin/monitor"      element={<AdminMonitor />} />
            <Route path="/admin/empleados"    element={<AdminEmpleados />} /> 
            {/* El admin también puede ver el historial de ventas global */}
            <Route path="/admin/historial"    element={<HistorialVentas />} />
            <Route path="/admin/predictivo" element={<AdminPredictivo />} />
            <Route path="/admin/reportes" element={<AdminReportes />} />
          </Route>
          
          {/* ── 🛒 MÓDULO PUNTO DE VENTA (COMPARTIDO) ── */}
          <Route element={<ProtectedRoute rolesPermitidos={["rol_admin", "rol_vendedor"]} />}>
              <Route path="/pos" element={<POS />} />
          </Route>

          {/* ── 💰 RUTA ESPECÍFICA PARA VENDEDORES ── */}
          <Route element={<ProtectedRoute rolesPermitidos={["rol_vendedor"]} />}>
              <Route path="/vendedor" element={<POS />} />
              <Route path="/vendedor/clientes" element={<AdminClientes />} />
              <Route path="/vendedor/historial" element={<HistorialVentas />} />
          </Route>

          {/* Fallback para URLs no encontradas */}
          <Route path="*"                   element={<Error404 />} />
        </Routes>
      </BrowserRouter>
    </SearchProvider>
  );
}

export default App;