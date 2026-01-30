import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/Breadcrumbs";
import { Link } from "react-router-dom";
import "./Home.css"; 

function Error400() {
  return (
    <>
      <Navbar />
      <Breadcrumbs links={[{ name: "Inicio", url: "/" }]} current="Error de Solicitud" />

      <main className="error-main">
        <div className="error-container">
          <h1 className="error-code">400</h1>
          <h2 className="error-title">ERROR DE ETIQUETADO</h2>
          <p className="error-description">
            Tu navegador envió una solicitud que no podemos procesar.
            Es como intentar pagar una gorra con una etiqueta que no coincide. Intenta refrescar.
          </p>
          <div className="error-actions">
            <Link to="/" className="cta-button">Volver al Inicio</Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default Error400;