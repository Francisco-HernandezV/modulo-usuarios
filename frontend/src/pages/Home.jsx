import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { products } from "../assets/products"; 
import "./Home.css"; 
import { useSearch } from "../context/SearchContext"; // <--- Importamos

function Home() {
  const navigate = useNavigate();
  const { searchTerm } = useSearch(); // <--- Obtenemos el texto

  // --- LÓGICA DE FILTRADO ---
  const filteredProducts = products.filter((p) => {
    if (!searchTerm) return true; // Si no hay búsqueda, muestra todo
    const term = searchTerm.toLowerCase();
    // Busca por Nombre O por Descripción
    return p.nombre.toLowerCase().includes(term) || 
           (p.descripcion && p.descripcion.toLowerCase().includes(term));
  });

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
          {/* Mostramos título dinámico */}
          <h2 className="section-title">
            {searchTerm ? `Resultados para: "${searchTerm}"` : "Últimos Lanzamientos"}
          </h2>
          <span className="view-all" onClick={() => console.log("Ver todo")}>Ver todo &rarr;</span>
        </div>

        {/* Si no hay productos, mostramos un mensaje */}
        {filteredProducts.length === 0 ? (
          <div style={{color: "white", textAlign: "center", padding: "50px"}}>
             <h3>No encontramos productos que coincidan con tu búsqueda. 😔</h3>
             <p>Intenta con "Gorra", "Pantalón" o "Shirt".</p>
          </div>
        ) : (
          <section className="product-grid">
            {/* Mapeamos filteredProducts en lugar de products */}
            {filteredProducts.map((p) => (
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
                    {p.descripcion ? p.descripcion.substring(0, 30) + "..." : "Edición limitada."}
                  </p>

                  <div className="card-footer">
                    <span className="price">${p.precio}</span>
                    <button 
                      className="add-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        alert("¡Producto añadido al carrito!");
                      }}
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}

export default Home;