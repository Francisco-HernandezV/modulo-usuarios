import "./Home.css";
import { products } from "../assets/products";
import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  const verProducto = (id) => {
    navigate(`/producto/${id}`);
  };

  return (
    <>
      {/* HEADER */}
      <header className="header">

        <div className="logo">DANTELEMENT</div>

        <div className="search-container">
          <input type="text" placeholder="Buscar productos..." />
          <span className="search-icon">🔍</span>
        </div>

        <div className="actions">
          <a href="/register" className="action-link">Registrarse</a>
          <span className="cart-icon">🛒</span>
          <a href="#" className="action-link">Más…</a>
        </div>

      </header>

      {/* NAV */}
      <nav className="nav-links">
        <a href="#">Categorías</a>
        <a href="#">Ofertas</a>
        <a href="#">Novedades</a>
      </nav>

      {/* PRODUCTOS */}
      <section className="product-grid">
        {products.map((p) => (
          <div key={p.id} className="product-card">
            <img src={p.imagen} alt={p.nombre} />
            <h3>{p.nombre}</h3>
            <p className="price">${p.precio}</p>
            <button onClick={() => verProducto(p.id)}>Ver más</button>
          </div>
        ))}
      </section>
    </>
  );
}

export default Home;
