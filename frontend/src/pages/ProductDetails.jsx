import React from "react";
import "./ProductDetails.css";
import { useParams, useNavigate } from "react-router-dom";
import { products } from "../assets/products";
import qrImage from "../assets/qr.jpg";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = products.find((p) => p.id == id);

  if (!product) return <div className="not-found">Producto no encontrado</div>;

  return (
    <div className="page-wrapper">
      <div className="product-card">
        
        {/* Columna Izquierda: Imagen */}
        <div className="product-image-container">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Volver
          </button>
          <img src={product.imagen} className="main-img" alt={product.nombre} />
        </div>

        {/* Columna Derecha: Información */}
        <div className="product-info">
          <span className="category-tag">Moda Urbana</span>
          <h1>{product.nombre}</h1>
          
          <div className="price-container">
            <span className="currency">$</span>
            <span className="amount">{product.precio}</span>
          </div>

          <p className="description">{product.descripcion}</p>

          <div className="actions">
            <button className="buy-btn">
              Añadir al Carrito
            </button>
          </div>

          <div className="qr-section">
            <p>Escanea para ver en móvil:</p>
            <img src={qrImage} className="qr-img" alt="QR del producto" />
          </div>
        </div>

      </div>
    </div>
  );
}

export default ProductDetails;