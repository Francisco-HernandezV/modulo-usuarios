import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { products } from "../assets/products";
import "./Home.css"; // <--- AQUÍ ESTÁ EL CAMBIO CLAVE

function Home() {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />

      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1>ESTILO SIN LÍMITES</h1>
          <p>Descubre la nueva colección de gorras y accesorios urbanos.</p>
          <a href="#catalogo" className="cta-button">Ver Colección</a>
        </div>
      </section>

      <main className="main-content" id="catalogo">
        <div className="section-header">
          <h2 className="section-title">Últimos Lanzamientos</h2>
          <span className="view-all" style={{cursor: "pointer"}}>Ver todo &rarr;</span>
        </div>

        <section className="product-grid">
          {products.map((p) => (
            <div 
              key={p.id} 
              className="product-card" 
              onClick={() => navigate(`/producto/${p.id}`)} 
            >
              <div className="image-wrapper">
                <img src={p.imagen} alt={p.nombre} />
                <span className="tag-new">Nuevo</span>
              </div>

              <div className="card-info">
                <h3>{p.nombre}</h3>
                <p className="short-desc">
                  {p.descripcion ? p.descripcion.substring(0, 25) + "..." : "Edición limitada."}
                </p>

                <div className="card-footer">
                  <span className="price">${p.precio}</span>
                  <button 
                    className="add-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      alert("Añadido al carrito");
                    }}
                  >
                    Añadir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Home;