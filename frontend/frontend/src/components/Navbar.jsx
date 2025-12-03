import { Link } from "react-router-dom";
import "../styles/theme.css";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-logo">DanElement Boutique</div>
      <div className="nav-links">
        <Link to="/">Inicio</Link>
        <Link to="/register">Registro</Link>
        <Link to="/recover">Recuperar Contraseña</Link>
      </div>
    </nav>
  );
}

export default Navbar;
