import React from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types"; // <-- Importamos PropTypes
import "../styles/theme.css"; 

function Breadcrumbs({ links = [], current }) {
  return (
    <div className="breadcrumbs">
      {/* Usamos link.url como key en lugar de index */}
      {links.map((link) => (
        <span key={link.url} className="breadcrumb-item">
          <Link to={link.url}>{link.name}</Link>
          <span className="separator">/</span>
        </span>
      ))}
      
      {/* Página actual */}
      <span className="current">{current}</span>
    </div>
  );
}

// <-- Validación de PropTypes para links y current
Breadcrumbs.propTypes = {
  links: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      url: PropTypes.string.isRequired
    })
  ),
  current: PropTypes.string.isRequired
};

export default Breadcrumbs;