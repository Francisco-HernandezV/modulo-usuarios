import React from "react";
import { Link } from "react-router-dom";
import "../styles/theme.css"; // Importamos estilos globales

function Breadcrumbs({ links = [], current }) {
  return (
    <div className="breadcrumbs">
      {/* Mapeamos los enlaces anteriores (Ej: Inicio / Productos) */}
      {links.map((link, index) => (
        <span key={index} className="breadcrumb-item">
          <Link to={link.url}>{link.name}</Link>
          <span className="separator">/</span>
        </span>
      ))}
      
      {/* Página actual (Texto blanco, sin enlace) */}
      <span className="current">{current}</span>
    </div>
  );
}

export default Breadcrumbs;