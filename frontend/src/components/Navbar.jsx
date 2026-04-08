import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import "../styles/theme.css";
import { useSearch } from "../context/SearchContext";

const SearchIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>);
const CartIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>);
const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>);

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null); 
  
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const { searchTerm, setSearchTerm } = useSearch();

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') {
        navigate('/');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const rol = localStorage.getItem("rol"); 
    setIsLoggedIn(!!token);
    setUserRole(rol);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/users/logout");
    } catch (error) {
      console.error("Error logout", error);
    } finally {
      localStorage.clear(); // Limpiamos todo de una vez
      setIsLoggedIn(false);
      setUserRole(null);
      setShowDropdown(false);
      navigate("/");
      globalThis.location.reload(); 
    }
  };

  return (
    <>
      <header className="header">
        <Link to="/" className="logo">DAN ELEMENT</Link>
        <div className="search-wrapper">
          <label htmlFor="navbar-search" className="sr-only" style={{display: 'none'}}>Buscar</label>
          <input 
            id="navbar-search"
            type="text" 
            className="search-input" 
            placeholder="Buscar productos..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            onKeyDown={handleSearchSubmit} 
          />
          <button className="search-btn" onClick={() => navigate('/')} aria-label="Ejecutar búsqueda" type="button">
            <SearchIcon />
          </button>
        </div>
        <div className="actions">
          <div 
            className="user-menu-container" 
            ref={dropdownRef}
            onMouseEnter={() => setShowDropdown(true)}
            onMouseLeave={() => setShowDropdown(false)}
            onKeyDown={(e) => e.key === 'Enter' && setShowDropdown(!showDropdown)}
            tabIndex={0}
            role="button"
            aria-haspopup="menu"
            aria-expanded={showDropdown}
            aria-label="Menú de usuario"
            style={{ cursor: 'pointer' }}
          >
            <div className="icon-link">
              <UserIcon />
            </div>
            {showDropdown && (
              <div className="dropdown-menu">
                {isLoggedIn ? (
                  <>
                    {/* ── SECCIÓN DINÁMICA SEGÚN ROL ── */}
                    
                    {/* Si es ADMIN */}
                    {userRole === "rol_admin" && (
                      <Link to="/admin" className="dropdown-item staff-link">
                        ⚙️ Panel Admin
                      </Link>
                    )}

                    {/* Si es VENDEDOR */}
                    {userRole === "rol_vendedor" && (
                      <Link to="/vendedor" className="dropdown-item staff-link">
                        🛒 Punto de Venta
                      </Link>
                    )}

                    {/* Si es GESTOR DE INVENTARIO */}
                    {userRole === "rol_gestor_inventario" && (
                      <Link to="/admin/inventario" className="dropdown-item staff-link">
                        📦 Gestión Inventario
                      </Link>
                    )}

                    <div style={{ borderTop: "1px solid #30363d", margin: "5px 0" }}></div>

                    <Link to="/profile" className="dropdown-item">👤 Mi Perfil</Link>
                    
                    <button 
                        onClick={handleLogout} 
                        className="dropdown-item" 
                        style={{color: "#ef4444", cursor: 'pointer', background: 'none', border: 'none', width: '100%', textAlign: 'left'}}
                        type="button"
                    >
                      🚪 Cerrar sesión
                    </button>
                  </>
                ) : (
                  <Link to="/login" className="dropdown-item">🔐 Iniciar sesión</Link>
                )}
              </div>
            )}
          </div>
          <button 
            className="cart-container icon-link" 
            aria-label="Ver carrito"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            type="button"
          >
            <CartIcon />
            <span className="cart-badge">3</span>
          </button>
        </div>
      </header>
      <nav className="nav-bar">
        <Link to="/" className={location.pathname === "/" ? "active" : ""}>Inicio</Link>
        <Link to="/catalogo/hombre" className={location.pathname.includes("hombre") ? "active" : ""}>Hombre</Link>
        <Link to="/catalogo/mujer" className={location.pathname.includes("mujer") ? "active" : ""}>Mujer</Link>
        <Link to="/catalogo/ofertas" className={`sale-link ${location.pathname.includes("ofertas") ? "active" : ""}`}>Ofertas</Link>
      </nav>
    </>
  );
}

export default Navbar;