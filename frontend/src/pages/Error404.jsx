import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/Breadcrumbs";
import { Link } from "react-router-dom";
import "./Home.css"; // Importamos para usar las clases .error-*

function Error404() {
  return (
    <>
      <Navbar />
      
      {/* Breadcrumbs: Inicio / Error 404 */}
      <Breadcrumbs links={[{ name: "Inicio", url: "/" }]} current="Página no encontrada" />

      <main className="error-main">
        <div className="error-container">
          <h1 className="error-code">404</h1>
          <h2 className="error-title">ESTILO EXTRAVIADO</h2>
          <p className="error-description">
            Parece que esta prenda no está en nuestro inventario o el enlace se rompió en la pasarela.
          </p>
          <div className="error-actions">
            <Link to="/" className="cta-button">Ir al Inicio</Link>
            <a href="/#catalogo" className="btn-secondary">Ver Colección</a>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default Error404;