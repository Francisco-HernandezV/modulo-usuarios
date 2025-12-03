import "../styles/theme.css";

function Footer() {
  return (
    <footer className="footer">
      <p>© {new Date().getFullYear()} Mi Proyecto. Todos los derechos reservados.</p>
    </footer>
  );
}

export default Footer;
