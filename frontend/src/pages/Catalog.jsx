import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/Breadcrumbs";
import { products } from "../assets/products";
import "./Home.css"; // Reutilizamos estilos del Home para las tarjetas

function Catalog() {
  const { filtro } = useParams(); // Puede ser: 'hombre', 'mujer', 'ofertas', 'todo'
  const navigate = useNavigate();

  // 1. Filtrar productos según la URL
  const filteredProducts = products.filter((p) => {
    if (filtro === "todo") return true;
    if (filtro === "ofertas") return p.esOferta === true;
    return p.categoria === filtro || p.categoria === "unisex";
  });

  // 2. Agrupar productos por TIPO (Pantalones, Playeras, etc.)
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const tipo = product.tipo || "Otros";
    if (!acc[tipo]) {
      acc[tipo] = [];
    }
    acc[tipo].push(product);
    return acc;
  }, {});

  // Scroll al inicio al cargar
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [filtro]);

  // Títulos bonitos
  const titles = {
    hombre: "Colección Hombre",
    mujer: "Colección Mujer",
    ofertas: "Ofertas Especiales",
    todo: "Catálogo Completo"
  };

  return (
    <>
      <Navbar />
      <Breadcrumbs 
        links={[{ name: "Inicio", url: "/" }]} 
        current={titles[filtro] || "Catálogo"} 
      />

      <main className="main-content">
        <div className="section-header">
          <h2 className="section-title">{titles[filtro] || "Productos"}</h2>
        </div>

        {/* Si no hay productos */}
        {filteredProducts.length === 0 && (
          <div style={{color: "white", textAlign: "center", padding: "50px"}}>
            <h3>No hay productos en esta categoría por el momento.</h3>
          </div>
        )}

        {/* 3. Renderizar por GRUPOS (Categorías) */}
        {Object.entries(groupedProducts).map(([tipo, items]) => (
          <div key={tipo} style={{ marginBottom: "60px" }}>
            {/* Subtítulo del tipo de prenda (Ej: Playeras) */}
            <h3 style={{ 
              color: "#8b949e", 
              textTransform: "uppercase", 
              letterSpacing: "2px", 
              marginBottom: "20px",
              borderBottom: "1px solid #30363d",
              paddingBottom: "10px",
              display: "inline-block"
            }}>
              {tipo}
            </h3>

            <div className="product-grid">
              {items.map((p) => (
                <div 
                  key={p.id} 
                  className="product-card" 
                  onClick={() => navigate(`/producto/${p.id}`)} 
                >
                  <div className="image-wrapper">
                    <img src={p.imagen} alt={p.nombre} />
                    {p.esOferta && <span className="tag-new" style={{background: "#f59e0b", color: "black"}}>Oferta</span>}
                    {!p.esOferta && <span className="tag-new">Nuevo</span>}
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
                          alert("Añadido al carrito");
                        }}
                      >
                        Añadir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      <Footer />
    </>
  );
}

export default Catalog;