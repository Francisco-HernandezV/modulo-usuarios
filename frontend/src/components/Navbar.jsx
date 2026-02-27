import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import "../styles/theme.css";
import { useSearch } from "../context/SearchContext";

// Iconos SVG
const SearchIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>);
const CartIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>);
const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>);

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation(); // Para saber en qué ruta estamos
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  
  // --- LÓGICA DE BÚSQUEDA ---
  const { searchTerm, setSearchTerm } = useSearch();

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') {
        navigate('/'); // Al buscar, vamos al Home para ver resultados
    }
  };

  useEffect(() => {
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
      navigate("/");
      window.location.reload(); 
    }
  };

  return (
    <>
      <header className="header">
        <Link to="/" className="logo">DANTELEMENT</Link>

        {/* INPUT DE BÚSQUEDA */}
        <div className="search-wrapper">
          <input 
            type="text" 
            className="search-input" 
            placeholder="Buscar productos..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            onKeyDown={handleSearchSubmit} 
          />
          <button className="search-btn" onClick={() => navigate('/')}>
            <SearchIcon />
          </button>
        </div>

        {/* ACCIONES (USER / CART) */}
        <div className="actions">
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

      {/* --- NAV SECUNDARIO (CORREGIDO) --- */}
      <nav className="nav-bar">
        {/* Inicio actúa como vista principal */}
        <Link to="/" className={location.pathname === "/" ? "active" : ""}>Inicio</Link>
        
        {/* Categorías específicas */}
        <Link to="/catalogo/hombre" className={location.pathname.includes("hombre") ? "active" : ""}>Hombre</Link>
        <Link to="/catalogo/mujer" className={location.pathname.includes("mujer") ? "active" : ""}>Mujer</Link>
        
        {/* Ofertas destacadas */}
        <Link to="/catalogo/ofertas" className={`sale-link ${location.pathname.includes("ofertas") ? "active" : ""}`}>Ofertas</Link>
        
        {/* SE ELIMINÓ "VER TODO" DE AQUÍ */}
      </nav>
    </>
  );
}

export default Navbar;