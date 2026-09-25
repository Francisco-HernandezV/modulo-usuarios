import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SearchProvider } from "./context/SearchContext";
import { ConfigProvider } from "./context/ConfigContext";

// ── VISTA INICIAL (carga inmediata: es la primera pantalla / LCP) ──
import Home             from "./pages/Home";
import ProtectedRoute   from "./components/ProtectedRoute";

// ── VISTAS PÚBLICAS (carga diferida) ──
const Catalog           = lazy(() => import("./pages/Catalog"));
const ProductDetails    = lazy(() => import("./pages/ProductDetails"));
const Login             = lazy(() => import("./pages/Login"));
const Register          = lazy(() => import("./pages/Register"));
const RecoverPassword   = lazy(() => import("./pages/RecoverPassword"));
const AccountActivation = lazy(() => import("./pages/AccountActivation"));

// ── VISTAS PRIVADAS / USUARIO ──
const UserProfile       = lazy(() => import("./pages/UserProfile"));

// ── ERRORES ──
const Error404 = lazy(() => import("./pages/Error404"));
const Error500 = lazy(() => import("./pages/Error500"));
const Error400 = lazy(() => import("./pages/Error400"));

// ── VISTAS ADMINISTRADOR ──
const AdminDashboard    = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminCatalogos    = lazy(() => import("./pages/admin/AdminCatalogos"));
const AdminProductos    = lazy(() => import("./pages/admin/AdminProductos"));
const AdminClientes     = lazy(() => import("./pages/admin/AdminClientes"));
const AdminInventario   = lazy(() => import("./pages/admin/AdminInventario"));
const AdminRespaldos    = lazy(() => import("./pages/admin/AdminRespaldos"));
const AdminEmpleados    = lazy(() => import("./pages/admin/AdminEmpleados"));
const AdminPredictivo   = lazy(() => import("./pages/admin/AdminPredictivo"));
const AdminReportes     = lazy(() => import("./pages/admin/AdminReportes"));
const AdminConfiguracion = lazy(() => import("./pages/admin/AdminConfiguracion"));
const IngresoMercancia  = lazy(() => import("./pages/admin/IngresoMercancia"));

// ── VISTAS PUNTO DE VENTA (POS) ──
const POS               = lazy(() => import("./pages/pos/POS"));
const HistorialVentas   = lazy(() => import("./pages/pos/HistorialVentas"));
const GestionApartados  = lazy(() => import("./pages/pos/GestionApartados"));
const CorteCaja         = lazy(() => import("./pages/pos/CorteCaja"));

// ── PIN (Alexa) ──
const ChangePin          = lazy(() => import("./pages/ChangePin"));
const AsignarPinVendedor = lazy(() => import("./pages/admin/AsignarPinVendedor"));

// Indicador ligero mientras se descarga el chunk de la ruta solicitada.
function RouteFallback() {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="spinner" aria-label="Cargando" />
    </div>
  );
}

function App() {
  return (
    <ConfigProvider>
    <SearchProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
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

          {/* ── RUTAS PRIVADAS BÁSICAS (Cualquier usuario logueado) ── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile"     element={<UserProfile />} />
            <Route path="/cambiar-pin" element={<ChangePin />} />
          </Route>

          {/* ── 🛡️ RUTAS PROTEGIDAS STRICTAS (Solo Staff) ── */}
          <Route element={<ProtectedRoute rolesPermitidos={["rol_admin", "rol_vendedor", "rol_gestor_inventario"]} />}>
            <Route path="/admin"                     element={<AdminDashboard />} />
            <Route path="/admin/catalogos"           element={<AdminCatalogos />} />
            <Route path="/admin/productos"           element={<AdminProductos />} />
            <Route path="/admin/clientes"            element={<AdminClientes />} />
            <Route path="/admin/inventario"          element={<AdminInventario />} />
            <Route path="/admin/inventario/ingreso"  element={<IngresoMercancia />} />
            <Route path="/admin/respaldos"           element={<AdminRespaldos />} />
            <Route path="/admin/empleados"           element={<AdminEmpleados />} />
            <Route path="/admin/historial"           element={<HistorialVentas />} />
            <Route path="/admin/predictivo"          element={<AdminPredictivo />} />
            <Route path="/admin/reportes"            element={<AdminReportes />} />
          </Route>

          {/* ── ⚙️ CONFIGURACIÓN (Solo Administrador) ── */}
          <Route element={<ProtectedRoute rolesPermitidos={["rol_admin"]} />}>
            <Route path="/admin/configuracion" element={<AdminConfiguracion />} />
          </Route>

          {/* ── 🔑 ASIGNAR PIN A VENDEDORES (Solo Admin) ── */}
          <Route element={<ProtectedRoute rolesPermitidos={["rol_admin"]} />}>
            <Route path="/admin/asignar-pin" element={<AsignarPinVendedor />} />
          </Route>

          {/* ── 🛒 MÓDULO PUNTO DE VENTA (COMPARTIDO) ── */}
          <Route element={<ProtectedRoute rolesPermitidos={["rol_admin", "rol_vendedor"]} />}>
            <Route path="/pos" element={<POS />} />
            <Route path="/apartados" element={<GestionApartados />} />
            <Route path="/caja" element={<CorteCaja />} />
          </Route>

          {/* ── 💰 RUTA ESPECÍFICA PARA VENDEDORES ── */}
          <Route element={<ProtectedRoute rolesPermitidos={["rol_vendedor"]} />}>
            <Route path="/vendedor"           element={<POS />} />
            <Route path="/vendedor/clientes"  element={<AdminClientes />} />
            <Route path="/vendedor/historial" element={<HistorialVentas />} />
          </Route>

          {/* Fallback para URLs no encontradas */}
          <Route path="*" element={<Error404 />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </SearchProvider>
    </ConfigProvider>
  );
}

export default App;
