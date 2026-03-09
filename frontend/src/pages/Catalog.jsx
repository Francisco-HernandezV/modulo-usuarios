import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/Breadcrumbs";
import api from "../services/api";
import "./Home.css";

function Catalog() {
  const { filtro } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchProductos = async () => {
      setLoading(true);
      try {
        const res = await api.get("/admin/productos");
        const prods = res.data.filter(p => p.activo).map(p => ({
          ...p,
          precio: p.precio_base,
          imagen: p.imagen || "https://via.placeholder.com/400x400?text=DanElement+Product",
          esOferta: false,
          categoria_normalizada: p.categoria_nombre ? p.categoria_nombre.toLowerCase() : "unisex",
          tipo: p.categoria_nombre || "Otros"
        }));
        setProducts(prods);
      } catch (error) {
        console.error("Error al cargar productos", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProductos();
  }, [filtro]);

  const filteredProducts = products.filter((p) => {
    if (filtro === "todo") return true;
    if (filtro === "ofertas") return p.esOferta === true;
    // Permite clasificar de forma blanda si la categoría coincide con hombre/mujer de la url
    return p.categoria_normalizada.includes(filtro) || p.categoria_normalizada === "unisex";
  });

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const tipo = product.tipo || "Otros";
    if (!acc[tipo]) acc[tipo] = [];
    acc[tipo].push(product);
    return acc;
  }, {});

  const titles = {
    hombre: "Colección Hombre",
    mujer: "Colección Mujer",
    ofertas: "Ofertas Especiales",
    todo: "Catálogo Completo"
  };

  return (
    <>
      <Navbar />
      <Breadcrumbs links={[{ name: "Inicio", url: "/" }]} current={titles[filtro] || "Catálogo"} />

      <main className="main-content">
        <div className="section-header">
          <h2 className="section-title">{titles[filtro] || "Productos"}</h2>
        </div>

        {loading ? (
          <div style={{ color: "white", textAlign: "center", padding: "50px" }}>
            <h3>Sincronizando con base de datos...</h3>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{color: "white", textAlign: "center", padding: "50px"}}>
            <h3>No hay productos en esta categoría por el momento.</h3>
          </div>
        ) : (
          Object.entries(groupedProducts).map(([tipo, items]) => (
            <div key={tipo} style={{ marginBottom: "60px" }}>
              <h3 style={{ color: "#8b949e", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "20px", borderBottom: "1px solid #30363d", paddingBottom: "10px", display: "inline-block" }}>
                {tipo}
              </h3>
              <div className="product-grid">
                {items.map((p) => (
                  <div key={p.id} className="product-card" onClick={() => navigate(`/producto/${p.id}`)} >
                    <div className="image-wrapper">
                      <img src={p.imagen} alt={p.nombre} />
                      {p.esOferta ? <span className="tag-new" style={{background: "#f59e0b", color: "black"}}>Oferta</span> : <span className="tag-new">Nuevo</span>}
                    </div>
                    <div className="card-info">
                      <h3>{p.nombre}</h3>
                      <p className="short-desc">
                        {p.descripcion ? p.descripcion.substring(0, 30) + "..." : "Edición limitada."}
                      </p>
                      <div className="card-footer">
                        <span className="price">${p.precio}</span>
                        <button className="add-btn" onClick={(e) => { e.stopPropagation(); alert("Añadido al carrito"); }}>
                          Añadir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
      <Footer />
    </>
  );
}

export default Catalog;