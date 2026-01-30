import React from "react";
import "./ProductDetails.css";
import { useParams, useNavigate } from "react-router-dom";
import { products } from "../assets/products";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/Breadcrumbs"; // <--- IMPORTAR
import qrImage from "../assets/qr.jpg";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = products.find((p) => p.id == id);

  if (!product) return <div className="not-found">Producto no encontrado</div>;

  return (
    <>
      <Navbar />
      
      <div className="page-wrapper">
        
        {/* --- COMPONENTE BREADCRUMBS --- */}
        {/* Le pasamos la ruta previa (Inicio) y el nombre del producto actual */}
        <Breadcrumbs 
          links={[
            { name: "Inicio", url: "/" },
            { name: "Catálogo", url: "/" } 
          ]}
          current={product.nombre}
        />

        {/* TARJETA PRINCIPAL */}
        <div className="details-card">
          
          {/* COLUMNA IZQUIERDA: IMAGEN */}
          <div className="details-image-container">
            <img src={product.imagen} className="details-main-img" alt={product.nombre} />
          </div>

          {/* COLUMNA DERECHA: CONTENIDO */}
          <div className="details-content">
            
            <div className="details-header-row">
              <div className="details-text">
                <span className="details-category">Streetwear Collection</span>
                <h1>{product.nombre}</h1>
                <div className="details-price">${product.precio}</div>
                <p className="details-description">{product.descripcion}</p>
              </div>

              <div className="details-qr">
                <img src={qrImage} alt="QR Code" />
                <span>Escanear</span>
              </div>
            </div>

            <div className="details-actions">
              <button 
                className="details-add-btn"
                onClick={() => alert("Añadido al carrito")}
              >
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