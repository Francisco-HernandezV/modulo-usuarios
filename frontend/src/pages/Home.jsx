import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../services/api";
import "./Home.css";
import { useSearch } from "../context/SearchContext"; 

function Home() {
  const navigate = useNavigate();
  const { searchTerm } = useSearch();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const res = await api.get("/admin/productos");
        // Filtramos solo productos activos y adaptamos los keys de la BD al frontend
        const prods = res.data.filter(p => p.activo).map(p => ({
          ...p,
          precio: p.precio_base,
          imagen: p.imagen || "https://via.placeholder.com/400x400?text=DanElement+Product", 
          esOferta: false 
        }));
        setProducts(prods);
      } catch (error) {
        console.error("Error al cargar productos desde el API", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProductos();
  }, []);

  const filteredProducts = products.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return p.nombre.toLowerCase().includes(term) || 
           (p.descripcion && p.descripcion.toLowerCase().includes(term));
  });

  const displayProducts = searchTerm ? filteredProducts : products.slice(0, 8);

  return (
    <>
      <Navbar />

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
          {!searchTerm && (
            <span className="view-all" onClick={() => navigate('/catalogo/todo')} style={{cursor: "pointer"}}>
              Ver catálogo completo &rarr;
            </span>
          )}
        </div>

        {loading ? (
          <div style={{color: "white", textAlign: "center", padding: "80px 20px"}}>
             <h3>Conectando con la base de datos...</h3>
          </div>
        ) : displayProducts.length === 0 ? (
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
          <section className="product-grid">
            {displayProducts.map((p) => (
              <div key={p.id} className="product-card" onClick={() => navigate(`/producto/${p.id}`)}>
                <div className="image-wrapper">
                  <img src={p.imagen} alt={p.nombre} />
                  {p.esOferta ? (
                    <span className="tag-new" style={{background: "#f59e0b", color: "black"}}>Oferta</span>
                  ) : (
                    <span className="tag-new">Nuevo</span>
                  )}
                </div>
                <div className="card-info">
                  <h3>{p.nombre}</h3>
                  <p className="short-desc">
                    {p.descripcion ? p.descripcion.substring(0, 45) + "..." : "Edición limitada."}
                  </p>
                  <div className="card-footer">
                    <span className="price">${p.precio}</span>
                    <button className="add-btn" onClick={(e) => {
                        e.stopPropagation();
                        alert("¡Producto añadido al carrito!");
                    }}>
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