import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../services/api";
import "../styles/theme.css";

function UserProfile() {
  const [user, setUser] = useState({
    nombre: "",
    email: ""
  });
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);

  // Cargar datos
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/users/profile");
        setUser({
          nombre: res.data.nombre || "",
          email: res.data.email || ""
        });
      } catch (error) {
        console.error("Error cargando perfil", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMensaje("");
    try {
      await api.put("/users/profile", user);
      setMensaje("✅ Perfil actualizado con éxito");
    } catch (error) {
      setMensaje(error.response?.data?.message || "❌ Error al actualizar perfil");
    }
  };

  if (loading) return <div style={{padding:"50px", textAlign:"center", color:"white"}}>Cargando perfil...</div>;

  return (
    <>
      <Navbar />
      <div className="main-content">
        <div className="profile-wrapper">
          <div className="profile-header">
            <h2 className="section-title">Mi Perfil</h2>
            <p style={{color: "#8b949e"}}>Gestiona tu información personal</p>
          </div>

          <form onSubmit={handleUpdate}>
            {/* Nombre */}
            <div className="form-group">
              <label>Nombre Completo</label>
              <input 
                type="text" 
                name="nombre" 
                value={user.nombre} 
                onChange={handleChange} 
              />
            </div>

            {/* Email (Editable) */}
            <div className="form-group">
              <label>Correo Electrónico</label>
              <input 
                type="email" 
                name="email" 
                value={user.email} 
                onChange={handleChange} 
              />
            </div>

            <button type="submit" className="btn-primary">Guardar Cambios</button>
            
            {mensaje && (
              <p style={{marginTop: "15px", color: mensaje.includes("✅") ? "#10b981" : "#ef4444", fontWeight: "bold"}}>
                {mensaje}
              </p>
            )}
          </form>

          <div style={{marginTop: "40px", borderTop: "1px solid #30363d", paddingTop: "20px"}}>
             <h3 style={{color: "white", fontSize: "1.1rem"}}>Seguridad</h3>
             <a href="/recover" style={{color: "#3b82f6", textDecoration: "underline", fontSize: "0.9rem"}}>
               ¿Quieres cambiar tu contraseña?
             </a>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default UserProfile;