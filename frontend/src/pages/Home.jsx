import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { products } from "../assets/products"; 
import "./Home.css"; 
import { useSearch } from "../context/SearchContext"; 

function Home() {
  const navigate = useNavigate();
  const { searchTerm } = useSearch(); // Obtenemos lo que el usuario escribe en el Navbar

  // --- LÓGICA DE FILTRADO ---
  const filteredProducts = products.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return p.nombre.toLowerCase().includes(term) || 
           (p.descripcion && p.descripcion.toLowerCase().includes(term));
  });

  // Si no buscan nada, mostramos solo los primeros 8 como "Últimos Lanzamientos"
  const displayProducts = searchTerm ? filteredProducts : products.slice(0, 8);

  return (
    <>
      <Navbar />

      {/* Hero Section: Solo aparece si NO están buscando nada */}
      {!searchTerm && (
        <section className="hero">
          <div className="hero-overlay"></div>
          <div className="hero-content">
            <h1>ESTILO SIN LÍMITES</h1>
            <p>Descubre la nueva colección de gorras y accesorios urbanos.</p>
            <button onClick={() => navigate('/catalogo/todo')} className="cta-button">
              Ver Colección
            </button>
          </div>
        </section>
      )}

      <main className="main-content" id="catalogo">
        
        <div className="section-header">
          <h2 className="section-title">
            {searchTerm ? `Resultados para: "${searchTerm}"` : "Últimos Lanzamientos"}
          </h2>
          
          {/* Enlace "Ver todo" que lleva al catálogo completo (solo si no buscan) */}
          {!searchTerm && (
            <span 
              className="view-all" 
              onClick={() => navigate('/catalogo/todo')} 
              style={{cursor: "pointer"}}
            >
              Ver catálogo completo &rarr;
            </span>
          )}
        </div>

        {/* Mensaje si la búsqueda no arroja resultados */}
        {displayProducts.length === 0 ? (
          <div style={{color: "white", textAlign: "center", padding: "80px 20px"}}>
             <h3>No encontramos coincidencias para "{searchTerm}" 😔</h3>
             <p style={{color: "#8b949e"}}>Prueba con otra palabra clave o revisa nuestro catálogo completo.</p>
             <button 
                onClick={() => navigate('/catalogo/todo')} 
                className="add-btn" 
                style={{marginTop: "20px", background: "#3b82f6", border: "none", width: "auto", display: "inline-block"}}
             >
               Ver todo el catálogo
             </button>
          </div>
        ) : (
          /* GRID DE PRODUCTOS */
          <section className="product-grid">
            {displayProducts.map((p) => (
              <div 
                key={p.id} 
                className="product-card" 
                onClick={() => navigate(`/producto/${p.id}`)} 
              >
                {/* IMAGEN: Fondo blanco */}
                <div className="image-wrapper">
                  <img src={p.imagen} alt={p.nombre} />
                  
                  {/* Etiqueta dinámica: Oferta (Amarillo) o Nuevo (Azul) */}
                  {p.esOferta ? (
                    <span className="tag-new" style={{background: "#f59e0b", color: "black"}}>Oferta</span>
                  ) : (
                    <span className="tag-new">Nuevo</span>
                  )}
                </div>

                {/* INFORMACIÓN */}
                <div className="card-info">
                  <h3>{p.nombre}</h3>
                  <p className="short-desc">
                    {p.descripcion ? p.descripcion.substring(0, 45) + "..." : "Edición limitada."}
                  </p>

                  {/* FOOTER: Precio a la izquierda, Botón a la derecha */}
                  <div className="card-footer">
                    <span className="price">${p.precio}</span>
                    <button 
                      className="add-btn"
                      onClick={(e) => {
                        e.stopPropagation(); // Evita entrar al detalle al hacer clic
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