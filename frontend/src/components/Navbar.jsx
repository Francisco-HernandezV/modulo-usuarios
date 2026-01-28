import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/theme.css";

// Iconos SVG
const SearchIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>);
const CartIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>);
const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>);

function Navbar() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Verificar si existe token al cargar
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/users/logout");
    } catch (error) {
      console.error("Error logout", error);
    } finally {
      localStorage.removeItem("token");
      setIsLoggedIn(false);
      setShowDropdown(false);
      navigate("/"); // Redirigir a Home
      window.location.reload(); 
    }
  };

  return (
    <>
      <header className="header">
        <Link to="/" className="logo">DANTELEMENT</Link>

        <div className="search-wrapper">
          <input type="text" className="search-input" placeholder="Buscar productos..." />
          <button className="search-btn"><SearchIcon /></button>
        </div>

        <div className="actions">
          {/* USER DROPDOWN */}
          <div 
            className="user-menu-container" 
            ref={dropdownRef}
            onMouseEnter={() => setShowDropdown(true)}
            onMouseLeave={() => setShowDropdown(false)}
          >
            <div className="icon-link">
              <UserIcon />
            </div>

            {showDropdown && (
              <div className="dropdown-menu">
                {isLoggedIn ? (
                  <>
                    <Link to="/profile" className="dropdown-item">👤 Mi Perfil</Link>
                    <div onClick={handleLogout} className="dropdown-item" style={{color: "#ef4444"}}>
                      🚪 Cerrar sesión
                    </div>
                  </>
                ) : (
                  <Link to="/login" className="dropdown-item">🔐 Iniciar sesión</Link>
                )}
              </div>
            )}
          </div>

          <div className="cart-container icon-link">
            <CartIcon />
            <span className="cart-badge">3</span>
          </div>
        </div>
      </header>

      <nav className="nav-bar">
        <Link to="/" className="active">Inicio</Link>
        <Link to="#">Hombre</Link>
        <Link to="#">Mujer</Link>
        <Link to="#" className="sale-link">Ofertas</Link>
      </nav>
    </>
  );
}

export default Navbar;