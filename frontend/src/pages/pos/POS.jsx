import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import VendedorLayout from "../../components/VendedorLayout";
import api from "../../services/api";

const IconTrash = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
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
  const [pagosRealizados, setPagosRealizados] = useState([]);
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

  // ── LÓGICA DEL CARRITO ──
  const agregarAlCarrito = (p) => {
    if (p.stock_disponible <= 0) return;

    setCarrito(prev => {
      const ex = prev.find(i => i.variante_id === p.variante_id);
      if (ex) {
        if (ex.cantidad >= p.stock_disponible) {
          alert("Límite de stock alcanzado para este producto.");
          return prev;
        }
        return prev.map(i => i.variante_id === p.variante_id ? {...i, cantidad: i.cantidad + 1} : i);
      }
      return [...prev, { ...p, cantidad: 1 }];
    });
    setBusqueda("");
  };

  const incrementarCantidad = (variante_id, stock_disponible) => {
    setCarrito(prev => prev.map(item => {
      if (item.variante_id === variante_id) {
        if (item.cantidad >= stock_disponible) {
          alert("No puedes agregar más, límite de stock alcanzado.");
          return item;
        }
        return { ...item, cantidad: item.cantidad + 1 };
      }
      return item;
    }));
  };

  const decrementarCantidad = (variante_id) => {
    setCarrito(prev => prev.map(item => {
      if (item.variante_id === variante_id && item.cantidad > 1) {
        return { ...item, cantidad: item.cantidad - 1 };
      }
      return item;
    }));
  };

  const eliminarDelCarrito = (variante_id) => {
    setCarrito(prev => prev.filter(item => item.variante_id !== variante_id));
  };

  // ── LÓGICA DE PAGOS ──
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: "24px", height: "calc(100vh - 140px)" }}>
        
        {/* PANEL IZQUIERDO: BÚSQUEDA */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", overflow: "hidden" }}>
          {/* 🔥 Corrección de Layout: display block para usar todo el ancho */}
          <div className="adm-stat-card" style={{ padding: "16px", display: "block" }}>
            <input className="adm-input" placeholder="Buscar producto por nombre o SKU..." value={busqueda} onChange={e => setBusqueda(e.target.value)} autoFocus />
          </div>
          <div className="adm-table-wrap" style={{ flex: 1, overflowY: "auto", border: "1px solid var(--border-color)" }}>
            {resultados.length > 0 ? (
              <table className="adm-table">
                <thead><tr><th>Producto</th><th>SKU</th><th>Stock</th><th>Precio</th></tr></thead>
                <tbody>
                  {resultados.map(r => {
                    const sinStock = r.stock_disponible <= 0;
                    return (
                      <tr 
                        key={r.variante_id} 
                        onClick={() => !sinStock && agregarAlCarrito(r)} 
                        style={{ 
                          cursor: sinStock ? "not-allowed" : "pointer", 
                          opacity: sinStock ? 0.4 : 1,
                          background: sinStock ? "rgba(239, 68, 68, 0.05)" : "transparent"
                        }}
                      >
                        <td>
                          <div style={{ fontWeight: "bold" }}>{r.producto_nombre}</div>
                          <div style={{ fontSize: "11px", color: "#8b949e", marginTop: "2px" }}>Talla: {r.talla} | Color: {r.color}</div>
                        </td>
                        <td style={{ fontFamily: "monospace", color: "#8b949e" }}>{r.sku}</td>
                        <td>
                          {sinStock 
                            ? <span className="adm-badge adm-badge-red">Agotado</span> 
                            : <span style={{ fontWeight: "bold" }}>{r.stock_disponible}</span>
                          }
                        </td>
                        <td style={{fontWeight: 700, color: sinStock ? "#8b949e" : "white"}}>${Number(r.precio).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
               <div style={{ padding: "40px", textAlign: "center", color: "#8b949e" }}>
                 Usa el buscador superior para escanear SKU o escribir el nombre de un producto.
               </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: TICKET */}
        {/* 🔥 Corrección de Layout: alignItems stretch obliga a usar todo el ancho */}
        <div className="adm-stat-card" style={{ padding: 0, flexDirection: "column", borderLeft: "4px solid var(--color-accent)", overflow: "hidden", alignItems: "stretch" }}>
          
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #30363d", background: "rgba(255,255,255,0.02)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "11px", color: "#8b949e", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "2px" }}>Cliente Asignado</span>
              <span style={{ fontWeight: "bold", fontSize: "15px", color: "white" }}>{cliente ? cliente.nombre : "Público General"}</span>
            </div>
            <button className="adm-btn-sm adm-btn-ghost" style={{ border: "1px solid #4b5563" }} onClick={() => setShowClientes(true)}>
              {cliente ? "Cambiar" : "Asignar"}
            </button>
          </div>
          
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {carrito.length === 0 ? (
               <div style={{ textAlign: "center", color: "#8b949e", marginTop: "60px" }}>
                 <div style={{ fontSize: "48px", opacity: 0.2, marginBottom: "16px" }}>🛒</div>
                 El carrito está vacío
               </div>
            ) : (
              carrito.map(item => (
                <div key={item.variante_id} style={{ padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", marginBottom: "12px", border: "1px solid #30363d", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: "bold", color: "white", lineHeight: 1.3 }}>{item.producto_nombre}</div>
                      <div style={{ fontSize: "12px", color: "#8b949e", marginTop: "4px" }}>Talla: {item.talla} | Color: {item.color}</div>
                    </div>
                    {/* 🔥 Botón de basura con tamaño fijo */}
                    <button 
                      onClick={() => eliminarDelCarrito(item.variante_id)} 
                      title="Quitar producto"
                      style={{ flexShrink: 0, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", cursor: "pointer", width: "32px", height: "32px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                    >
                      <IconTrash />
                    </button>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed #30363d", paddingTop: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", background: "#0d1117", borderRadius: "8px", padding: "4px 6px", border: "1px solid #30363d" }}>
                      <button 
                        onClick={() => decrementarCantidad(item.variante_id)} 
                        disabled={item.cantidad <= 1}
                        style={{ background: "none", border: "none", color: item.cantidad <= 1 ? "#4b5563" : "white", cursor: item.cantidad <= 1 ? "not-allowed" : "pointer", padding: "0 8px", fontSize: "18px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >-</button>
                      
                      <span style={{ fontSize: "14px", fontWeight: "bold", minWidth: "24px", textAlign: "center", color: "white" }}>
                        {item.cantidad}
                      </span>
                      
                      <button 
                        onClick={() => incrementarCantidad(item.variante_id, item.stock_disponible)} 
                        disabled={item.cantidad >= item.stock_disponible}
                        style={{ background: "none", border: "none", color: item.cantidad >= item.stock_disponible ? "#4b5563" : "white", cursor: item.cantidad >= item.stock_disponible ? "not-allowed" : "pointer", padding: "0 8px", fontSize: "18px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >+</button>
                    </div>
                    
                    <div style={{ fontSize: "16px", fontWeight: "900", color: "var(--color-accent)" }}>
                      ${(item.precio * item.cantidad).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 🔥 Total y botón a pantalla completa horizontalmente */}
          <div style={{ padding: "24px", background: "var(--bg-card, #161b22)", borderTop: "1px solid var(--border-color, #30363d)", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "16px" }}>
              <span style={{ fontSize: "16px", fontWeight: "bold", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "1px" }}>TOTAL</span>
              <span style={{ fontSize: "28px", fontWeight: "900", color: "var(--color-accent)", lineHeight: 1 }}>${total.toFixed(2)}</span>
            </div>
            <button className="adm-btn adm-btn-primary" style={{ width: "100%", padding: "16px", fontSize: "15px", letterSpacing: "1px", justifyContent: "center", borderRadius: "10px" }} disabled={carrito.length === 0} onClick={() => setShowPago(true)}>
              CONTINUAR AL PAGO
            </button>
          </div>
        </div>
      </div>

      {/* MODAL CLIENTES */}
      {showClientes && (
        <div className="adm-modal-overlay">
          <div className="adm-modal" style={{ maxWidth: "450px" }}>
            <div className="adm-modal-header"><h3>Asignar Cliente</h3><button className="adm-modal-close" onClick={() => setShowClientes(false)}><IconX /></button></div>
            <div className="adm-modal-body">
              <input className="adm-input" placeholder="Buscar cliente por nombre o correo..." value={busquedaCli} onChange={e => setBusquedaCli(e.target.value)} autoFocus />
              <div style={{ marginTop: "15px", maxHeight: "250px", overflowY: "auto" }}>
                <div onClick={() => { setCliente(null); setShowClientes(false); }} style={{ padding: "10px", borderBottom: "1px solid #30363d", cursor: "pointer", color: "#3b82f6", fontWeight: "bold" }} className="adm-nav-item">
                  Público General (Sin asignar)
                </div>
                {clientesRes.map(c => (
                  <div key={c.id} onClick={() => { setCliente(c); setShowClientes(false); }} style={{ padding: "10px", borderBottom: "1px solid #30363d", cursor: "pointer" }} className="adm-nav-item">
                    {c.nombre} <br /><small style={{ color: "#8b949e" }}>{c.telefono || c.email}</small>
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
                <h2 style={{ fontSize: "32px", color: "var(--color-accent)", margin: "5px 0 0 0" }}>${total.toFixed(2)}</h2>
              </div>

              {pagosRealizados.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontSize: "12px", color: "#8b949e", textTransform: "uppercase", marginBottom: "8px", display: "block" }}>Pagos Registrados</label>
                  {pagosRealizados.map((p, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", background: "rgba(255,255,255,0.05)", padding: "10px 12px", borderRadius: "6px", marginBottom: "6px", alignItems: "center" }}>
                      <span style={{ fontWeight: "bold" }}>{p.metodo}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span>${p.monto.toFixed(2)}</span>
                        <button onClick={() => setPagosRealizados(pagosRealizados.filter((_, i) => i !== idx))} style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "none", borderRadius: "4px", padding: "4px 8px", cursor: "pointer" }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {restante > 0 && (
                <div style={{ background: "rgba(15,17,21,0.5)", padding: "15px", borderRadius: "10px", border: "1px solid #30363d" }}>
                  <label style={{ fontSize: "12px", color: "#8b949e", textTransform: "uppercase", marginBottom: "8px", display: "block" }}>Añadir Pago</label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <select className="adm-select" value={metodoActual} onChange={e => setMetodoActual(e.target.value)}>
                      <option value="Efectivo">Efectivo</option>
                      <option value="T. Débito">T. Débito</option>
                      <option value="T. Crédito">T. Crédito</option>
                      <option value="Transferencia">Transferencia</option>
                    </select>
                    <input type="number" className="adm-input" value={montoInput} onChange={e => setMontoInput(e.target.value)} placeholder={restante.toFixed(2)} />
                  </div>
                  <button className="adm-btn adm-btn-ghost" style={{ width: "100%", marginTop: "10px", justifyContent: "center" }} onClick={agregarPago}>+ Ingresar Monto</button>
                </div>
              )}

              <div style={{ marginTop: "20px", textAlign: "right", fontSize: "18px", padding: "15px", background: restante === 0 ? "rgba(16,185,129,0.1)" : "transparent", borderRadius: "8px" }}>
                Restante: <span style={{ fontWeight: "bold", color: restante === 0 ? "#10b981" : "#ef4444" }}>${restante.toFixed(2)}</span>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={finalizarVenta} disabled={restante > 0 || procesando}>
                {procesando ? "Procesando..." : "Confirmar Venta y Cobrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}