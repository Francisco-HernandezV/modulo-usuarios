import React from "react";
import "../styles/theme.css";

function Footer() {
  return (
    <footer className="site-footer">
        <div className="footer-content">
            <div className="footer-column">
                <div className="logo logo-footer">DANTELEMENT</div>
                <p>Redefiniendo el estilo urbano con calidad y exclusividad. Envíos dentro de Huejutla, San Feli y Jaltocán.</p>
            </div>
            <div className="footer-column">
                <h4>Navegación</h4>
                <a href="#">Inicio</a>
                <a href="#">Hombre</a>
                <a href="#">Mujer</a>
                <a href="#">Ofertas</a>
            </div>
            <div className="footer-column">
                <h4>Ayuda</h4>
                <a href="#">Envíos y Devoluciones</a>
                <a href="#">Guía de Tallas</a>
                <a href="#">Contacto</a>
            </div>
            <div className="footer-column">
                <h4>Síguenos</h4>
                <div className="social-icons">
                     <a href="#">FB</a>
                     <a href="#">IG</a>
                     <a href="#">X</a>
                </div>
            </div>
        </div>
        <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} DantElement. Todos los derechos reservados.</p>
        </div>
    </footer>
  );
}

export default Footer;