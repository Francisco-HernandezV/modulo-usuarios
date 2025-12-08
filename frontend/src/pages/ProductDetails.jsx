import "./ProductDetails.css";
import { useParams } from "react-router-dom";
import { products } from "../assets/products";

function ProductDetails() {
  const { id } = useParams();
  const product = products.find((p) => p.id == id);

  return (
    <div className="container">

      <button className="back-btn" onClick={() => history.back()}>
        ← Regresar
      </button>

      <h1>{product.nombre}</h1>

      <img src={product.imagen} className="img" />

      <p className="desc">{product.descripcion}</p>

      <h2>${product.precio}</h2>

      <button className="buy-btn">Comprar</button>
    </div>
  );
}

export default ProductDetails;
