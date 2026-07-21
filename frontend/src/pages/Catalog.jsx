import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import PropTypes from "prop-types";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/Breadcrumbs";
import api from "../services/api";
import { cldUrl, PLACEHOLDER } from "../utils/cloudinary";
import "./Home.css";

const ProductTag = ({ esOferta }) => {
  if (esOferta) {
    return <span className="tag-new" style={{ background: "#f59e0b", color: "black" }}>Oferta</span>;
  }
  return <span className="tag-new">Nuevo</span>;
};

ProductTag.propTypes = {
  esOferta: PropTypes.bool.isRequired
};

const categoryTitleStyle = {
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: "2px",
  marginBottom: "20px",
  borderBottom: "1px solid #30363d",
  paddingBottom: "10px",
  display: "inline-block"
};

function Catalog() {
  const { filtro } = useParams();
  // ← ELIMINA ESTA LÍNEA: const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // ... el resto del código está bien

  useEffect(() => {
    globalThis.scrollTo(0, 0);
    const fetchProductos = async () => {
      setLoading(true);
      try {
        const res = await api.get("/admin/productos");
        const prods = res.data.filter(p => p.activo).map(p => ({
          ...p,
          precio: p.precio_base,
          // p.imagen viene del backend: es la URL de Cloudinary marcada como portada
          imagen: p.imagen ? cldUrl(p.imagen, "w_600,h_600,c_fill") : PLACEHOLDER,
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
          <div className="state-block">
            <div className="spinner"></div>
            <h3>Cargando productos...</h3>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="state-block">
            <h3>No hay productos en esta categoría por el momento.</h3>
            <p>Vuelve pronto o revisa otras categorías.</p>
          </div>
        ) : (
          Object.entries(groupedProducts).map(([tipo, items]) => (
            <div key={tipo} style={{ marginBottom: "60px" }}>
              <h3 style={categoryTitleStyle}>
                {tipo}
              </h3>
              <div className="product-grid">
                {items.map((p) => (
                  <Link
                    key={p.id} 
                    to={`/producto/${p.id}`}
                    className="product-card"
                  >
                    <div className="image-wrapper">
                      <img src={p.imagen} alt={p.nombre} loading="lazy" />
                      <ProductTag esOferta={p.esOferta} />
                    </div>
                    <div className="card-info">
                      <h3>{p.nombre}</h3>
                      <p className="short-desc">
                        {p.descripcion ? p.descripcion.substring(0, 30) + "..." : "Edición limitada."}
                      </p>
                      <div className="card-footer">
                        <span className="price">${p.precio}</span>
                        <button className="add-btn" onClick={(e) => { e.stopPropagation(); alert("Añadido al carrito"); }} type="button">
                          Añadir
                        </button>
                      </div>
                    </div>
                  </Link>
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