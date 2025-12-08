import "./ProductDetails.css";
import { useParams } from "react-router-dom";
import { products } from "../assets/products";
import qrImage from "../assets/qr.jpg";

function ProductDetails() {
  const { id } = useParams();
  const product = products.find((p) => p.id == id);

  return (
    <div className="container">

      <button className="back-btn" onClick={() => history.back()}>
        ← Regresar
      </button>

      <h1>{product.nombre}</h1>

      {/* Imagen principal del producto */}
      <img src={product.imagen} className="img" alt={product.nombre} />

      {/* Descripción */}
      <p className="desc">{product.descripcion}</p>

      {/* Imagen del QR */}
      <h3>Código QR del producto:</h3>
      <img src={qrImage} className="qr-img" alt="QR del producto" />

      <h2>${product.precio}</h2>

      <button className="buy-btn">Comprar</button>
    </div>
  );
}

export default ProductDetails;
