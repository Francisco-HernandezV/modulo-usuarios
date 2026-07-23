import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import VendedorLayout from "../../components/VendedorLayout";
import api from "../../services/api";
import { useConfig } from "../../context/ConfigContext";
import RiesgoApartado from "../../components/RiesgoApartado";
import SegmentoCliente from "../../components/SegmentoCliente";

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

  // ── Modo Apartado ──
  const { config } = useConfig();
  const [modo, setModo] = useState("venta"); // 'venta' | 'apartado'
  const [showApartado, setShowApartado] = useState(false);
  const [anticipo, setAnticipo] = useState("");
  const [metodoAnticipo, setMetodoAnticipo] = useState("Efectivo");
  const [procesandoApartado, setProcesandoApartado] = useState(false);

  const diasApartado = Number(config?.dias_apartado) || 7;
  const fechaLimiteApartado = new Date(Date.now() + diasApartado * 86400000);

  // ── Estado de Caja (Corte diario) ──
  const [cajaAbierta, setCajaAbierta] = useState(null); // null = cargando
  const [montoInicial, setMontoInicial] = useState("");
  const [abriendoCaja, setAbriendoCaja] = useState(false);

  useEffect(() => {
    api.get("/ventas/caja/estado")
      .then(res => setCajaAbierta(!!res.data.abierta))
      .catch(() => setCajaAbierta(false));
  }, []);

  const abrirCaja = async () => {
    const monto = Number(montoInicial);
    if (montoInicial === "" || Number.isNaN(monto) || monto < 0) {
      alert("Ingresa un monto inicial válido (puede ser 0).");
      return;
    }
    setAbriendoCaja(true);
    try {
      await api.post("/ventas/caja/apertura", { monto_inicial: monto });
      setCajaAbierta(true);
      setMontoInicial("");
    } catch (err) {
      alert(err.response?.data?.message || "Error al abrir la caja.");
    } finally {
      setAbriendoCaja(false);
    }
  };

  // Búsqueda de productos
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (busqueda.trim().length > 1) {
        try {
          const res = await api.get(`/ventas/buscar-producto?q=${busqueda}&_t=${Date.now()}`);
          setResultados(res.data);
        } catch (err) { console.error(err); }
      } else { setResultados([]); }
    }, 300);
    return () => clearTimeout(delay);
  }, [busqueda]);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (busquedaCli.trim().length > 1) {
        try {
          const res = await api.get(`/ventas/buscar-cliente?q=${busquedaCli}&_t=${Date.now()}`);
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
  const cambio = Math.max(0, pagado - total);

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

  // ── APARTADO: registra la reserva con anticipo opcional ──
  const generarApartado = async () => {
    if (!cliente) { alert("Debes asignar un cliente para generar un apartado."); return; }
    const anticipoNum = Number(anticipo) || 0;
    if (anticipoNum > total) { alert("El anticipo no puede ser mayor al total."); return; }

    setProcesandoApartado(true);
    try {
      const payload = {
        cliente_id: cliente.id,
        items: carrito.map(i => ({ variante_id: i.variante_id, cantidad: i.cantidad })),
        anticipo: anticipoNum,
        metodo_anticipo: metodoAnticipo,
      };
      const res = await api.post("/ventas/apartados", payload);
      const vence = res.data.fecha_limite ? new Date(res.data.fecha_limite).toLocaleDateString("es-MX") : "—";
      alert(`✅ Apartado #${res.data.apartado_id} registrado.\nVence: ${vence}\nSaldo: $${Number(res.data.saldo).toFixed(2)}`);
      setCarrito([]); setCliente(null); setShowApartado(false); setAnticipo(""); setModo("venta");
    } catch (err) {
      alert(err.response?.data?.message || "Error al registrar el apartado.");
    } finally {
      setProcesandoApartado(false);
    }
  };

  return (
    <Layout pageTitle="Punto de Venta">
      {/* Barra de estado de caja */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", padding: "10px 16px", borderRadius: "10px", border: "1px solid var(--border-color)", background: cajaAbierta ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", color: cajaAbierta ? "#10b981" : "#ef4444" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: cajaAbierta ? "#10b981" : "#ef4444", display: "inline-block" }}></span>
          {cajaAbierta === null ? "Verificando caja..." : cajaAbierta ? "Caja abierta" : "Caja cerrada — abre la caja para poder cobrar"}
        </span>
        <Link to="/caja" className="adm-btn adm-btn-ghost adm-btn-sm">Corte de caja →</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: "24px", height: "calc(100vh - 190px)" }}>
        
        {/* PANEL IZQUIERDO: BÚSQUEDA */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", overflow: "hidden" }}>
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
        <div className="adm-stat-card" style={{ padding: 0, flexDirection: "column", borderLeft: `4px solid ${modo === "apartado" ? "var(--color-yellow)" : "var(--color-accent)"}`, overflow: "hidden", alignItems: "stretch" }}>

          {/* Selector de modo: Venta directa o Apartado */}
          <div style={{ display: "flex", padding: "10px", gap: "8px", borderBottom: "1px solid #30363d" }}>
            {[
              { key: "venta", label: "🛒 Venta" },
              { key: "apartado", label: "📌 Apartado" },
            ].map(m => (
              <button
                key={m.key}
                type="button"
                onClick={() => setModo(m.key)}
                style={{
                  flex: 1, padding: "8px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer",
                  border: `1px solid ${modo === m.key ? (m.key === "apartado" ? "var(--color-yellow)" : "var(--color-accent)") : "#30363d"}`,
                  background: modo === m.key ? (m.key === "apartado" ? "rgba(245,158,11,0.15)" : "rgba(59,130,246,0.15)") : "transparent",
                  color: modo === m.key ? (m.key === "apartado" ? "var(--color-yellow)" : "var(--color-accent)") : "#8b949e",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div style={{ padding: "16px 20px", borderBottom: "1px solid #30363d", background: "rgba(255,255,255,0.02)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "11px", color: "#8b949e", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "2px" }}>Cliente Asignado</span>
              <span style={{ fontWeight: "bold", fontSize: "15px", color: "white" }}>{cliente ? cliente.nombre : "Público General"}</span>
              
              {/* COMPONENTE ML: Muestra si el cliente es VIP, Frecuente, etc. */}
              {cliente && <SegmentoCliente clienteId={cliente.id} />}
              
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

          <div style={{ padding: "24px", background: "var(--bg-card, #161b22)", borderTop: "1px solid var(--border-color, #30363d)", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "16px" }}>
              <span style={{ fontSize: "16px", fontWeight: "bold", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "1px" }}>TOTAL</span>
              <span style={{ fontSize: "28px", fontWeight: "900", color: modo === "apartado" ? "var(--color-yellow)" : "var(--color-accent)", lineHeight: 1 }}>${total.toFixed(2)}</span>
            </div>
            {modo === "apartado" && (
              <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "10px", textAlign: "center" }}>
                📅 Vence el {fechaLimiteApartado.toLocaleDateString("es-MX")} · {diasApartado} días de vigencia
              </div>
            )}
            {modo === "venta" ? (
              <button className="adm-btn adm-btn-primary" style={{ width: "100%", padding: "16px", fontSize: "15px", letterSpacing: "1px", justifyContent: "center", borderRadius: "10px" }} disabled={carrito.length === 0 || !cajaAbierta} onClick={() => setShowPago(true)}>
                {cajaAbierta ? "CONTINUAR AL PAGO" : "CAJA CERRADA"}
              </button>
            ) : (
              <button className="adm-btn" style={{ width: "100%", padding: "16px", fontSize: "15px", letterSpacing: "1px", justifyContent: "center", borderRadius: "10px", background: "var(--color-yellow)", color: "#000", fontWeight: 800 }} disabled={carrito.length === 0 || !cajaAbierta} onClick={() => { if (!cliente) { alert("Asigna un cliente para el apartado."); return; } setAnticipo(""); setShowApartado(true); }}>
                {cajaAbierta ? "GENERAR APARTADO" : "CAJA CERRADA"}
              </button>
            )}
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

              {cambio > 0 && (
                <div style={{ marginTop: "10px", textAlign: "right", fontSize: "20px", padding: "15px", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)", borderRadius: "8px" }}>
                  Cambio a entregar: <span style={{ fontWeight: "bold", color: "var(--color-yellow)" }}>${cambio.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={finalizarVenta} disabled={restante > 0 || procesando}>
                {procesando ? "Procesando..." : "Confirmar Venta y Cobrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL APARTADO */}
      {showApartado && (
        <div className="adm-modal-overlay">
          <div className="adm-modal" style={{ maxWidth: "440px" }}>
            <div className="adm-modal-header">
              <h3>Generar Apartado</h3>
              <button className="adm-modal-close" onClick={() => setShowApartado(false)}><IconX /></button>
            </div>
            <div className="adm-modal-body">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "13px" }}>
                <span style={{ color: "#8b949e" }}>Cliente</span>
                <span style={{ fontWeight: "bold" }}>{cliente?.nombre}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "13px" }}>
                <span style={{ color: "#8b949e" }}>Total del apartado</span>
                <span style={{ fontWeight: "bold" }}>${total.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "18px", fontSize: "13px" }}>
                <span style={{ color: "#8b949e" }}>Vence</span>
                <span style={{ fontWeight: "bold", color: "var(--color-yellow)" }}>
                  {fechaLimiteApartado.toLocaleDateString("es-MX")} ({diasApartado} días)
                </span>
              </div>

              <div style={{ background: "rgba(15,17,21,0.5)", padding: "15px", borderRadius: "10px", border: "1px solid #30363d" }}>
                <label style={{ fontSize: "12px", color: "#8b949e", textTransform: "uppercase", marginBottom: "8px", display: "block" }}>
                  Anticipo inicial (opcional)
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <select className="adm-select" value={metodoAnticipo} onChange={e => setMetodoAnticipo(e.target.value)}>
                    <option value="Efectivo">Efectivo</option>
                    <option value="T. Débito">T. Débito</option>
                    <option value="T. Crédito">T. Crédito</option>
                    <option value="Transferencia">Transferencia</option>
                  </select>
                  <input type="number" min="0" className="adm-input" value={anticipo}
                    onChange={e => setAnticipo(e.target.value)} placeholder="0.00" />
                </div>
                <small style={{ color: "#8b949e", fontSize: 11, marginTop: 8, display: "block" }}>
                  Puedes dejar $0 y registrar abonos después. El saldo se liquida durante la vigencia.
                </small>
              </div>

              <div style={{ marginTop: "16px", textAlign: "right", fontSize: "16px" }}>
                Saldo tras anticipo:{" "}
                <span style={{ fontWeight: "bold", color: "var(--color-accent)" }}>
                  ${Math.max(0, total - (Number(anticipo) || 0)).toFixed(2)}
                </span>
              </div>

              {/* COMPONENTE ML: Barra de probabilidad de cancelación */}
              <div style={{ marginTop: "20px" }}>
                <RiesgoApartado
                  clienteId={cliente?.id}
                  total={total}
                  anticipo={Number(anticipo) || 0}
                  diasDePlazo={diasApartado}
                />
              </div>

            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setShowApartado(false)}>Cancelar</button>
              <button className="adm-btn adm-btn-primary" onClick={generarApartado} disabled={procesandoApartado}>
                {procesandoApartado ? "Registrando..." : "Confirmar Apartado"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS-F1: MODAL OBLIGATORIO DE APERTURA DE CAJA */}
      {cajaAbierta === false && (
        <div className="adm-modal-overlay">
          <div className="adm-modal" style={{ maxWidth: 400 }}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">🔓 Abrir caja</h3>
            </div>
            <div className="adm-modal-body">
              <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16, lineHeight: 1.6 }}>
                Para poder cobrar necesitas registrar el <strong>fondo inicial</strong> (efectivo base para dar cambio).
                La caja del día debe estar abierta.
              </p>
              <div className="adm-form-group">
                <label>Monto inicial en efectivo</label>
                <input type="number" min="0" className="adm-input" value={montoInicial}
                  onChange={e => setMontoInicial(e.target.value)} placeholder="0.00" autoFocus
                  style={{ textAlign: "right", fontSize: "1.3rem", fontWeight: "bold" }}
                  onKeyDown={e => { if (e.key === "Enter") abrirCaja(); }} />
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={abrirCaja} disabled={abriendoCaja}>
                {abriendoCaja ? "Abriendo..." : "Abrir caja y empezar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}