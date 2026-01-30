import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/Breadcrumbs";
import "./Home.css"; 

function Error500() {
  return (
    <>
      <Navbar />
      <Breadcrumbs links={[{ name: "Inicio", url: "/" }]} current="Error del Servidor" />

      <main className="error-main">
        <div className="error-container">
          <h1 className="error-code">500</h1>
          <h2 className="error-title">SISTEMA SOBRECARGADO</h2>
          <p className="error-description">
            Nuestros servidores han tenido un corto circuito por exceso de flow.
            Estamos trabajando para restablecer la conexión lo antes posible.
          </p>
          <div className="error-actions">
            <a href="/" className="cta-button">Reintentar</a>
            <a href="#" className="btn-secondary">Soporte</a>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default Error500;