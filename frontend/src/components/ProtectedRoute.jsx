import { Navigate, Outlet } from "react-router-dom";
import PropTypes from "prop-types";

const ProtectedRoute = ({ children, rolesPermitidos }) => {
  const token = localStorage.getItem("token");
  const rol = localStorage.getItem("rol");

  // Si no hay token, lo mandamos directo al login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Si se definieron roles permitidos y el usuario NO tiene uno de ellos, lo regresamos a la tienda
  if (rolesPermitidos && rolesPermitidos.length > 0 && !rolesPermitidos.includes(rol)) {
    return <Navigate to="/" replace />;
  }

  // Si pasa las pruebas, renderizamos el contenido
  return children ? children : <Outlet />;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node,
  rolesPermitidos: PropTypes.arrayOf(PropTypes.string)
};

export default ProtectedRoute;