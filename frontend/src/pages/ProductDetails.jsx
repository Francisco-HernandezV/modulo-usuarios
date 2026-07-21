import React, { useState, useEffect } from "react";
import "./ProductDetails.css";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/Breadcrumbs";
import qrImage from "../assets/qr.jpg";
import { cldUrl, PLACEHOLDER } from "../utils/cloudinary";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imagenActiva, setImagenActiva] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        // Una sola llamada: producto + galería completa
        const res = await api.get(`/admin/productos/${id}/detalle`);
        setProduct({
          ...res.data,
          precio: res.data.precio_base,
          categoria_display: res.data.categoria_nombre || "Colección General",
        });
        setImagenActiva(0);
      } catch (error) {
        console.error("Error al obtener detalle de producto", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const estadoStyle = {
    minHeight: "80vh", display: "flex", alignItems: "center",
    justifyContent: "center", backgroundColor: "#0f1115", color: "white",
  };

  if (loading) return <div style={estadoStyle}>Cargando detalles...</div>;
  if (!product) return <div className="not-found" style={estadoStyle}>Producto no encontrado</div>;

  const imagenes = product.imagenes || [];
  const principal = imagenes[imagenActiva]?.url;

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
            <img
              src={principal ? cldUrl(principal, "w_900") : PLACEHOLDER}
              className="details-main-img"
              alt={product.nombre}
            />

            {/* Miniaturas: solo aparecen si hay más de una foto */}
            {imagenes.length > 1 && (
              <div style={{ display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap" }}>
                {imagenes.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setImagenActiva(idx)}
                    style={{
                      padding: 0, borderRadius: "8px", overflow: "hidden", cursor: "pointer",
                      border: `2px solid ${idx === imagenActiva ? "#3b82f6" : "#30363d"}`,
                      background: "transparent", lineHeight: 0,
                    }}
                  >
                    <img
                      src={cldUrl(img.url, "w_160,h_160,c_fill")}
                      alt={`${product.nombre} vista ${idx + 1}`}
                      style={{ width: "64px", height: "64px", objectFit: "cover", display: "block" }}
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="details-content">
            <div className="details-header-row">
              <div className="details-text">
                <span className="details-category">{product.categoria_display}</span>
                <h1>{product.nombre}</h1>
                <div className="details-price">${product.precio}</div>
                <p className="details-description">
                  {product.descripcion || "Este producto no cuenta con descripción detallada en este momento."}
                </p>
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