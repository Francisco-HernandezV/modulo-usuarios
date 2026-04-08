import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import VendedorLayout from "../../components/VendedorLayout";
import api from "../../services/api";

export default function HistorialVentas() {
  const rol = localStorage.getItem("rol");
  const Layout = (rol === "rol_admin" || rol === "rol_gestor_inventario") ? AdminLayout : VendedorLayout;

  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarVentas = async () => {
    try {
      const res = await api.get("/ventas/historial");
      setVentas(res.data);
    } catch (err) { console.error("Error al cargar ventas:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargarVentas(); }, []);

  const descargarPDF = (id) => {
    window.open(`${import.meta.env.VITE_API_URL}/ventas/ticket/${id}/pdf`, '_blank');
  };

  const enviarWhatsApp = (v) => {
    if (!v.cliente_tel) return alert("El cliente no tiene teléfono registrado.");
    const msg = `Hola ${v.cliente_nombre}, gracias por tu compra en DanElement. Folio: #${v.id}, Total: $${v.total}.`;
    window.open(`https://wa.me/${v.cliente_tel.replace(/\s/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <Layout pageTitle="Historial de Ventas" breadcrumb="Mis Ventas">
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Vendedor</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ventas.map(v => (
              <tr key={v.id}>
                <td style={{ fontWeight: "bold" }}>#{v.id}</td>
                {/* CORRECCIÓN: v.creado_en en lugar de v.fecha_venta */}
                <td style={{ fontSize: "12px" }}>{v.creado_en ? new Date(v.creado_en).toLocaleString() : '—'}</td>
                <td>{v.cliente_nombre || "Público General"}</td>
                <td>{v.vendedor_nombre}</td>
                <td style={{ color: "var(--color-accent)", fontWeight: "bold" }}>${Number(v.total).toFixed(2)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="adm-btn-sm" onClick={() => descargarPDF(v.id)} title="Descargar PDF">📄</button>
                    <button className="adm-btn-sm" onClick={() => enviarWhatsApp(v)} title="WhatsApp">💬</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ventas.length === 0 && !loading && <div className="adm-empty">No hay ventas registradas.</div>}
      </div>
    </Layout>
  );
}