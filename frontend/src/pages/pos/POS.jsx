import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import VendedorLayout from "../../components/VendedorLayout";
import api from "../../services/api";

const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const IconUser = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconX = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

export default function POS() {
  const rol = localStorage.getItem("rol");
  const Layout = (rol === "rol_admin" || rol === "rol_gestor_inventario") ? AdminLayout : VendedorLayout;

  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [cliente, setCliente] = useState(null); 

  // Modales y Pagos
  const [showPago, setShowPago] = useState(false);
  const [showClientes, setShowClientes] = useState(false);
  const [pagosRealizados, setPagosRealizados] = useState([]); // [{metodo, monto}]
  const [metodoActual, setMetodoActual] = useState("Efectivo");
  const [montoInput, setMontoInput] = useState("");
  const [busquedaCli, setBusquedaCli] = useState("");
  const [clientesRes, setClientesRes] = useState([]);
  const [procesando, setProcesando] = useState(false);

  // Búsqueda de productos
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (busqueda.trim().length > 1) {
        try {
          const res = await api.get(`/ventas/buscar-producto?q=${busqueda}`);
          setResultados(res.data);
        } catch (err) { console.error(err); }
      } else { setResultados([]); }
    }, 300);
    return () => clearTimeout(delay);
  }, [busqueda]);

  // Búsqueda de clientes
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (busquedaCli.trim().length > 1) {
        try {
          const res = await api.get(`/ventas/buscar-cliente?q=${busquedaCli}`);
          setClientesRes(res.data);
        } catch (err) { console.error(err); }
      } else { setClientesRes([]); }
    }, 300);
    return () => clearTimeout(delay);
  }, [busquedaCli]);

  const agregarAlCarrito = (p) => {
    setCarrito(prev => {
      const ex = prev.find(i => i.variante_id === p.variante_id);
      if (ex) return prev.map(i => i.variante_id === p.variante_id ? {...i, cantidad: i.cantidad + 1} : i);
      return [...prev, { ...p, cantidad: 1 }];
    });
    setBusqueda("");
  };

  const total = carrito.reduce((acc, i) => acc + (Number(i.precio) * i.cantidad), 0);
  const pagado = pagosRealizados.reduce((acc, p) => acc + p.monto, 0);
  const restante = Math.max(0, total - pagado);

  const agregarPago = () => {
    if (!montoInput || Number(montoInput) <= 0) return;
    setPagosRealizados([...pagosRealizados, { metodo: metodoActual, monto: Number(montoInput) }]);
    setMontoInput("");
  };

  const finalizarVenta = async () => {
    setProcesando(true);
    try {
      const payload = {
        cliente_id: cliente?.id || null,
        items: carrito.map(i => ({ variante_id: i.variante_id, cantidad: i.cantidad })),
        pagos: pagosRealizados
      };
      const res = await api.post("/ventas/procesar", payload);
      alert(`✅ Venta Exitosa #${res.data.venta_id}`);
      setCarrito([]); setCliente(null); setShowPago(false); setPagosRealizados([]);
    } catch (err) {
      alert(err.response?.data?.message || "Error al procesar.");
    } finally { setProcesando(false); }
  };

  return (
    <Layout pageTitle="Punto de Venta">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: "20px", height: "calc(100vh - 180px)" }}>
        
        {/* PANEL IZQUIERDO */}
        <div style={{ display: "flex", flexDirection: "column", gap: "15px", overflow: "hidden" }}>
          <div className="adm-stat-card" style={{ padding: "12px" }}>
            <input className="adm-input" placeholder="Buscar producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} autoFocus />
          </div>
          <div className="adm-table-wrap" style={{ flex: 1, overflowY: "auto" }}>
            {resultados.length > 0 && (
              <table className="adm-table">
                <thead><tr><th>Producto</th><th>SKU</th><th>Stock</th><th>Precio</th></tr></thead>
                <tbody>
                  {resultados.map(r => (
                    <tr key={r.variante_id} onClick={() => agregarAlCarrito(r)} style={{ cursor: "pointer" }}>
                      <td>{r.producto_nombre} ({r.color}/{r.talla})</td>
                      <td>{r.sku}</td>
                      <td>{r.stock_disponible}</td>
                      <td style={{fontWeight: 700}}>${Number(r.precio).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: TICKET */}
        <div className="adm-stat-card" style={{ padding: 0, flexDirection: "column", borderLeft: "4px solid var(--color-accent)", overflow: "hidden" }}>
          <div style={{ padding: "15px", borderBottom: "1px solid #30363d", background: "rgba(255,255,255,0.02)", display: "flex", justifyContent: "space-between" }}>
            <span>{cliente ? cliente.nombre : "Público General"}</span>
            <button className="adm-btn-sm" onClick={() => setShowClientes(true)}>Asignar</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {carrito.map(item => (
              <div key={item.variante_id} style={{ padding: "10px", borderBottom: "1px solid #30363d", display: "flex", justifyContent: "space-between" }}>
                <div style={{fontSize: 13}}><strong>{item.cantidad}x</strong> {item.producto_nombre}</div>
                <div>${(item.precio * item.cantidad).toFixed(2)}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "20px", background: "#0d1117" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "24px", fontWeight: "900", marginBottom: "15px" }}>
              <span>TOTAL</span><span style={{ color: "var(--color-accent)" }}>${total.toFixed(2)}</span>
            </div>
            <button className="adm-btn adm-btn-primary" style={{ width: "100%", padding: "15px" }} disabled={carrito.length === 0} onClick={() => setShowPago(true)}>CONTINUAR AL PAGO</button>
          </div>
        </div>
      </div>

      {/* MODAL CLIENTES */}
      {showClientes && (
        <div className="adm-modal-overlay">
          <div className="adm-modal" style={{ maxWidth: "450px" }}>
            <div className="adm-modal-header"><h3>Asignar Cliente</h3><button className="adm-modal-close" onClick={() => setShowClientes(false)}><IconX /></button></div>
            <div className="adm-modal-body">
              <input className="adm-input" placeholder="Buscar cliente..." value={busquedaCli} onChange={e => setBusquedaCli(e.target.value)} autoFocus />
              <div style={{ marginTop: "15px", maxHeight: "250px", overflowY: "auto" }}>
                {clientesRes.map(c => (
                  <div key={c.id} onClick={() => { setCliente(c); setShowClientes(false); }} style={{ padding: "10px", borderBottom: "1px solid #30363d", cursor: "pointer" }} className="adm-nav-item">
                    {c.nombre} <br /><small>{c.telefono}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAGO MULTIFORMA */}
      {showPago && (
        <div className="adm-modal-overlay">
          <div className="adm-modal" style={{ maxWidth: "450px" }}>
            <div className="adm-modal-header"><h3>Finalizar Venta</h3><button className="adm-modal-close" onClick={() => setShowPago(false)}><IconX /></button></div>
            <div className="adm-modal-body">
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <p style={{ margin: 0, color: "#8b949e" }}>Total a Liquidar</p>
                <h2 style={{ fontSize: "32px", color: "var(--color-accent)" }}>${total.toFixed(2)}</h2>
              </div>

              {/* Lista de pagos realizados */}
              <div style={{ marginBottom: "20px" }}>
                {pagosRealizados.map((p, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", background: "#0d1117", padding: "8px", borderRadius: "5px", marginBottom: "5px" }}>
                    <span>{p.metodo}</span>
                    <span>${p.monto.toFixed(2)} <button onClick={() => setPagosRealizados(pagosRealizados.filter((_, i) => i !== idx))} style={{color: "red", background: "none", border: "none"}}>✕</button></span>
                  </div>
                ))}
              </div>

              {/* Formulario para añadir pago */}
              {restante > 0 && (
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "15px", borderRadius: "10px" }}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <select className="adm-select" value={metodoActual} onChange={e => setMetodoActual(e.target.value)}>
                      <option value="Efectivo">Efectivo</option>
                      <option value="T. Débito">T. Débito</option>
                      <option value="T. Crédito">T. Crédito</option>
                      <option value="Transferencia">Transferencia</option>
                    </select>
                    <input type="number" className="adm-input" value={montoInput} onChange={e => setMontoInput(e.target.value)} placeholder={restante.toFixed(2)} />
                  </div>
                  <button className="adm-btn adm-btn-ghost" style={{ width: "100%", marginTop: "10px" }} onClick={agregarPago}>+ Agregar Pago</button>
                </div>
              )}

              <div style={{ marginTop: "20px", textAlign: "right", fontSize: "18px" }}>
                Restante: <span style={{ fontWeight: "bold", color: restante === 0 ? "#10b981" : "#ef4444" }}>${restante.toFixed(2)}</span>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-primary" style={{ width: "100%" }} onClick={finalizarVenta} disabled={restante > 0 || procesando}>
                {procesando ? "Procesando..." : "Confirmar Venta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}