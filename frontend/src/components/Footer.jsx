import React from "react";
import "../styles/theme.css";
import { useConfig } from "../context/ConfigContext";

function Footer() {
  const { config } = useConfig();

  const nombre = config?.nombre_tienda || "DAN ELEMENT";

  const redes = [
    { key: "facebook",  label: "FB", url: config?.facebook },
    { key: "instagram", label: "IG", url: config?.instagram },
    { key: "tiktok",    label: "TT", url: config?.tiktok },
    { key: "twitter",   label: "X",  url: config?.twitter },
  ].filter((r) => r.url);

  const contactos = [
    config?.telefono_1 && { label: "Tel", value: config.telefono_1, href: `tel:${config.telefono_1.replace(/\s/g, "")}` },
    config?.telefono_2 && { label: "Tel", value: config.telefono_2, href: `tel:${config.telefono_2.replace(/\s/g, "")}` },
    config?.whatsapp && { label: "WhatsApp", value: config.whatsapp, href: `https://wa.me/${config.whatsapp.replace(/\D/g, "")}` },
    config?.email_contacto && { label: "Correo", value: config.email_contacto, href: `mailto:${config.email_contacto}` },
  ].filter(Boolean);

  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-column">
          {config?.logo ? (
            <img src={config.logo} alt={nombre} className="logo-footer-img" />
          ) : (
            <div className="logo logo-footer">{nombre}</div>
          )}
          <p>Redefiniendo el estilo urbano con calidad y exclusividad. Envíos dentro de Huejutla, San Feli y Jaltocán.</p>
          {config?.ubicacion && (
            <p className="footer-ubicacion">
              📍 {config.maps_url ? (
                <a href={config.maps_url} target="_blank" rel="noopener noreferrer">{config.ubicacion}</a>
              ) : config.ubicacion}
            </p>
          )}
        </div>

        <div className="footer-column">
          <h4>Navegación</h4>
          <a href="/">Inicio</a>
          <a href="/catalogo/hombre">Hombre</a>
          <a href="/catalogo/mujer">Mujer</a>
          <a href="/catalogo/ofertas">Ofertas</a>
        </div>

        <div className="footer-column">
          <h4>Contacto</h4>
          {contactos.length > 0 ? (
            contactos.map((c, i) => (
              <a key={i} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                {c.value}
              </a>
            ))
          ) : (
            <>
              <a href="/">Envíos y Devoluciones</a>
              <a href="/">Guía de Tallas</a>
              <a href="/">Contacto</a>
            </>
          )}
        </div>

        <div className="footer-column">
          <h4>Síguenos</h4>
          <div className="social-icons">
            {redes.length > 0 ? (
              redes.map((r) => (
                <a key={r.key} href={r.url} target="_blank" rel="noopener noreferrer" aria-label={r.key}>
                  {r.label}
                </a>
              ))
            ) : (
              <>
                <a href="/">FB</a>
                <a href="/">IG</a>
                <a href="/">X</a>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} {nombre}. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}

export default Footer;
