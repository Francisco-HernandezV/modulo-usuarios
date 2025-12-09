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
        
        {/* Columna Izquierda: Imagen + Botón Volver */}
        <div className="product-image-container">
          <img src={product.imagen} className="main-img" alt={product.nombre} />
          
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Volver
          </button>
        </div>

        {/* Columna Derecha: Información */}
        <div className="product-info">
          
          {/* --- NUEVO ENCABEZADO: Texto a la izq, QR a la der --- */}
          <div className="product-header">
            <div className="header-text">
              <span className="category-tag">Moda Urbana</span>
              <h1>{product.nombre}</h1>
              
              <div className="price-container">
                <span className="currency">$</span>
                <span className="amount">{product.precio}</span>
              </div>
            </div>

            {/* QR movido aquí y más grande */}
            <div className="qr-header-container">
              <img src={qrImage} className="qr-img-large" alt="Código QR" />
              <span>Escanear</span>
            </div>
          </div>

          <p className="description">{product.descripcion}</p>

          {/* (Sección QR antigua eliminada de aquí) */}

          <div className="actions">
            <button className="buy-btn">
              Añadir al Carrito
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

export default ProductDetails;