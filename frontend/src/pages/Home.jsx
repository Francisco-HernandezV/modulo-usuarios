import React from "react";
import "./Home.css";
import { products } from "../assets/products";
import { useNavigate } from "react-router-dom";

// Iconos SVG como componentes para mantener el código limpio
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);
const CartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
);
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
);

function Home() {
  const navigate = useNavigate();

  const verProducto = (id) => {
    navigate(`/producto/${id}`);
  };

  return (
    <div className="home-container">
      {/* HEADER STICKY */}
      <header className="header">
        <div className="logo">DANTELEMENT</div>

        <div className="search-wrapper">
          <input type="text" className="search-input" placeholder="Buscar..." />
          <button className="search-btn"><SearchIcon /></button>
        </div>

        <div className="actions">
          <a href="/register" className="icon-link"><UserIcon /></a>
          <div className="cart-container">
            <span className="icon-link"><CartIcon /></span>
            <span className="cart-badge">2</span>
          </div>
        </div>
      </header>

      {/* NAV CATEGORÍAS */}
      <nav className="nav-bar">
        <a href="#" className="active">Todo</a>
        <a href="#">Hoodies</a>
        <a href="#">Pantalones</a>
        <a href="#">Accesorios</a>
        <a href="#" className="sale-link">OFERTAS 🔥</a>
      </nav>

      {/* HERO SECTION (BANNER) */}
      <section className="hero">
        <div className="hero-content">
          <h1>STREETWEAR EVOLUCIONADO</h1>
          <p>La nueva colección 2024 ya está disponible.</p>
        </div>
      </section>

      {/* GRID DE PRODUCTOS */}
      <main className="main-content">
        <h2 className="section-title">Últimos Lanzamientos</h2>
        
        <section className="product-grid">
          {products.map((p) => (
            <div key={p.id} className="product-card" onClick={() => verProducto(p.id)}>
              <div className="image-wrapper">
                <img src={p.imagen} alt={p.nombre} />
                <span className="tag-new">Nuevo</span>
              </div>
              
              <div className="card-info">
                <h3>{p.nombre}</h3>
                <div className="card-footer">
                  <span className="price">${p.precio}</span>
                  <button className="add-btn">Ver</button>
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default Home;