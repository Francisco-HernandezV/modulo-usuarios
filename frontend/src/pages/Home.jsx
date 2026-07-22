import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import PropTypes from "prop-types";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../services/api";
import "./Home.css";
import { useSearch } from "../context/SearchContext";
import { cldUrl } from "../utils/cloudinary";

const ProductStatusBadge = ({ esOferta }) => {
    if (esOferta) return <span className="tag-new" style={{background: "#f59e0b", color: "black"}}>Oferta</span>;
    return <span className="tag-new">Nuevo</span>;
};

ProductStatusBadge.propTypes = {
    esOferta: PropTypes.bool.isRequired
};

function Home() {
  const navigate = useNavigate();
  const { searchTerm } = useSearch();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const res = await api.get("/admin/productos");
        const prods = res.data.filter(p => p.activo).map(p => ({
          ...p,
          precio: p.precio_base,
          imagen: p.imagen || null,
          esOferta: false 
        }));
        setProducts(prods);
      } catch (error) {
        console.error("Error al cargar productos", error);
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
           (p.descripcion?.toLowerCase().includes(term));
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
            <button onClick={() => navigate('/catalogo/todo')} className="cta-button" type="button">
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
            <button 
              className="view-all" 
              onClick={() => navigate('/catalogo/todo')} 
              style={{cursor: "pointer", background: 'none', border: 'none', color: '#9ca3af', fontSize: '0.9rem'}}
              type="button"
            >
              Ver catálogo completo &rarr;
            </button>
          )}
        </div>
        {loading ? (
          <div className="state-block">
             <div className="spinner"></div>
             <h3>Cargando productos...</h3>
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="state-block">
             <h3>No encontramos coincidencias para "{searchTerm}" 😔</h3>
             <p>Prueba con otra palabra clave o revisa nuestro catálogo completo.</p>
             <button
                onClick={() => navigate('/catalogo/todo')}
                className="add-btn"
                style={{marginTop: "8px", background: "#3b82f6", border: "none", width: "auto", display: "inline-block"}}
                type="button"
             >
               Ver todo el catálogo
             </button>
          </div>
        ) : (
          <section className="product-grid">
            {displayProducts.map((p) => (
              <Link
                key={p.id} 
                to={`/producto/${p.id}`}
                className="product-card"
              >
                <div className="image-wrapper">
                  <img src={cldUrl(p.imagen, "w_400,h_400,c_fill")} alt={p.nombre} loading="lazy" />
                  <ProductStatusBadge esOferta={p.esOferta} />
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
                    }} type="button">
                      Añadir
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

export default Home;