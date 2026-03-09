import React, { useState, useEffect } from "react";
import "./ProductDetails.css";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/Breadcrumbs";
import qrImage from "../assets/qr.jpg";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await api.get("/admin/productos");
        const found = res.data.find(p => p.id === parseInt(id));
        if (found) {
          setProduct({
            ...found,
            precio: found.precio_base,
            imagen: found.imagen || "https://via.placeholder.com/400x400?text=DanElement+Product",
            categoria_display: found.categoria_nombre || "Colección General"
          });
        }
      } catch (error) {
        console.error("Error al obtener detalle de producto", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) return <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0f1115", color: "white" }}>Cargando detalles...</div>;
  if (!product) return <div className="not-found" style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0f1115", color: "white" }}>Producto no encontrado</div>;

  return (
    <>
      <Navbar />
      <div className="page-wrapper">
        <Breadcrumbs 
          links={[{ name: "Inicio", url: "/" }, { name: "Catálogo", url: "/catalogo/todo" }]} 
          current={product.nombre} 
        />
        
        <div className="details-card">
          <div className="details-image-container">
            <img src={product.imagen} className="details-main-img" alt={product.nombre} />
          </div>

          <div className="details-content">
            <div className="details-header-row">
              <div className="details-text">
                <span className="details-category">{product.categoria_display}</span>
                <h1>{product.nombre}</h1>
                <div className="details-price">${product.precio}</div>
                <p className="details-description">{product.descripcion || "Este producto no cuenta con descripción detallada en este momento."}</p>
              </div>
              <div className="details-qr">
                <img src={qrImage} alt="QR Code" />
                <span>Escanear</span>
              </div>
            </div>
            
            <div className="details-actions">
              <button className="details-add-btn" onClick={() => alert("Añadido al carrito")}>
                Añadir al carrito
              </button>
            </div>
          </div>
        </div>

        <button className="back-link" onClick={() => navigate(-1)}>
          ← Volver al catálogo
        </button>
      </div>
      <Footer />
    </>
  );
}

export default ProductDetails;