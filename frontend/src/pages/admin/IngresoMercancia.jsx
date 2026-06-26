import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import api from "../../services/api";
import "../../styles/theme.css";

const IconX = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconPlus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconMinus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconTrash = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>;
const IconArrowRight = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const IconArrowLeft = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconRefresh = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
const IconBack = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;

const fmt = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);

export default function IngresoMercancia() {
  const navigate = useNavigate();

  const [paso, setPaso] = useState(1);
  const [cabecera, setCabecera] = useState({ origen_mercancia: "", nota_referencia: "" });
  
  // productos del lote: array de { producto_id, producto_nombre, costo_unitario, nuevo_precio_venta,
  //   precio_sugerido, costo_promedio_actual, costo_promedio_nuevo, stock_total_actual,
  //   matriz_data: { tallas, colores, variantes }, celdas: { "tallaId-colorId": cantidad } }
  const [productosLote, setProductosLote] = useState([]);
  
  const [busqueda, setBusqueda] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [alert, setAlert] = useState(null);
  
  // Estado para el modal de confirmación de eliminación de producto
  const [productoARemover, setProductoARemover] = useState(null);
  
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4500);
    return () => clearTimeout(t);
  }, [alert]);

  // Búsqueda de productos con debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (busqueda.trim().length < 2) {
      setResultadosBusqueda([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/inventario/buscar-producto?q=${encodeURIComponent(busqueda)}`);
        // Filtrar los ya agregados al lote
        const idsAgregados = new Set(productosLote.map(p => p.producto_id));
        setResultadosBusqueda(res.data.filter(p => !idsAgregados.has(p.id)));
      } catch (err) {
        console.error("Error busqueda:", err);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [busqueda, productosLote]);

  // Helpers numéricos
  const blockInvalidChars = (e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); };
  const blockInvalidCharsInt = (e) => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); };
  const validarDecimal = (val) => val === "" || /^\d+(\.\d{0,2})?$/.test(val);
  const validarEntero = (val) => val === "" || /^\d+$/.test(val);

  // ── Agregar producto al lote ──
  const agregarProductoALote = async (producto) => {
    try {
      const res = await api.get(`/inventario/producto/${producto.id}/matriz`);
      const matrizData = res.data;
      
      const nuevoProducto = {
        producto_id: producto.id,
        producto_nombre: matrizData.producto.nombre,
        precio_actual_producto: matrizData.producto.precio_base,
        costo_promedio_actual: matrizData.producto.costo_promedio_actual,
        stock_total_actual: matrizData.producto.stock_total_actual,
        matriz_data: matrizData,
        // Datos editables
        costo_unitario: "",
        nuevo_precio_venta: "",
        precio_sugerido: null,
        costo_promedio_nuevo: null,
        celdas: {} // clave "tallaId-colorId" → cantidad (string)
      };
      
      setProductosLote(prev => [...prev, nuevoProducto]);
      setBusqueda("");
      setResultadosBusqueda([]);
    } catch (err) {
      console.error("Error matriz:", err);
      setAlert({ type: "error", msg: "Error al cargar la matriz del producto." });
    }
  };

  // ── Quitar producto del lote ──
  const quitarProducto = (producto_id) => {
    setProductosLote(prev => prev.filter(p => p.producto_id !== producto_id));
  };

  // ── Evaluar si se muestra confirmación o se quita directo ──
  const intentarQuitarProducto = (prod) => {
    const piezas = totalPiezasProducto(prod);
    const costo = Number(prod.costo_unitario) || 0;
    
    if (piezas > 0 || costo > 0) {
      // Tiene datos capturados, mostramos confirmación
      setProductoARemover(prod);
    } else {
      // Está vacío, lo borramos directo
      quitarProducto(prod.producto_id);
    }
  };

  const confirmarQuitarProducto = () => {
    if (productoARemover) {
      quitarProducto(productoARemover.producto_id);
      setProductoARemover(null);
    }
  };

  // ── Actualizar cantidad de una celda de la matriz ──
  const actualizarCelda = (producto_id, talla_id, color_id, valor) => {
    if (!validarEntero(valor)) return;
    const key = `${talla_id}-${color_id}`;
    setProductosLote(prev => prev.map(p => {
      if (p.producto_id !== producto_id) return p;
      const nuevasCeldas = { ...p.celdas };
      if (valor === "" || valor === "0") {
        delete nuevasCeldas[key];
      } else {
        nuevasCeldas[key] = valor;
      }
      return { ...p, celdas: nuevasCeldas };
    }));
  };

  // ── Calcular total piezas de un producto del lote ──
  const totalPiezasProducto = (producto) => {
    return Object.values(producto.celdas).reduce((acc, c) => acc + (Number(c) || 0), 0);
  };

  // ── Recalcular sugerencia (costo prom nuevo + precio sugerido) ──
  const recalcularSugerencia = async (producto_id) => {
    const prod = productosLote.find(p => p.producto_id === producto_id);
    if (!prod) return;
    
    const piezas = totalPiezasProducto(prod);
    const costo = Number(prod.costo_unitario);
    
    if (piezas <= 0 || !costo || costo <= 0) {
      setProductosLote(prev => prev.map(p => {
        if (p.producto_id !== producto_id) return p;
        return { ...p, costo_promedio_nuevo: null, precio_sugerido: null };
      }));
      return;
    }
    
    try {
      const res = await api.post("/inventario/calcular-sugerencia", {
        producto_id,
        total_piezas: piezas,
        costo_unitario: costo
      });
      
      setProductosLote(prev => prev.map(p => {
        if (p.producto_id !== producto_id) return p;
        const sugerido = res.data.precio_sugerido;
        return {
          ...p,
          costo_promedio_nuevo: res.data.costo_promedio_nuevo,
          precio_sugerido: sugerido,
          // Si nunca se ha tocado el precio o estaba vacío, pre-carga sugerido
          nuevo_precio_venta: (p.nuevo_precio_venta === "" || p.nuevo_precio_venta === null) 
            ? String(sugerido) 
            : p.nuevo_precio_venta
        };
      }));
    } catch (err) {
      console.error("Error sugerencia:", err);
    }
  };

  // Recalcular automáticamente cuando cambia costo o celdas
  useEffect(() => {
    productosLote.forEach(p => {
      const piezas = totalPiezasProducto(p);
      if (piezas > 0 && Number(p.costo_unitario) > 0) {
        recalcularSugerencia(p.producto_id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    productosLote.map(p => `${p.producto_id}:${p.costo_unitario}:${Object.values(p.celdas).join(',')}`).join('|')
  ]);

  // ── Restaurar precio sugerido ──
  const restaurarSugerido = (producto_id) => {
    setProductosLote(prev => prev.map(p => {
      if (p.producto_id !== producto_id || p.precio_sugerido === null) return p;
      return { ...p, nuevo_precio_venta: String(p.precio_sugerido) };
    }));
  };

  // ── Actualizar campos del producto (costo o precio) ──
  const actualizarCampoProducto = (producto_id, campo, valor) => {
    if (!validarDecimal(valor)) return;
    setProductosLote(prev => prev.map(p => {
      if (p.producto_id !== producto_id) return p;
      return { ...p, [campo]: valor };
    }));
  };

  // ── Validaciones ──
  const productoValido = (p) => {
    return totalPiezasProducto(p) > 0 
      && Number(p.costo_unitario) >= 0 
      && p.costo_unitario !== ""
      && Number(p.nuevo_precio_venta) > 0;
  };
  
  const puedeAvanzarPaso2 = () => {
    return productosLote.length > 0 && productosLote.every(productoValido);
  };

  // ── Total del lote ──
  const totalLote = productosLote.reduce((acc, p) => {
    const piezas = totalPiezasProducto(p);
    const costo = Number(p.costo_unitario) || 0;
    return acc + (piezas * costo);
  }, 0);
  
  const totalPiezasLote = productosLote.reduce((acc, p) => acc + totalPiezasProducto(p), 0);

  // ── Registrar entrada final ──
  const handleRegistrar = async () => {
    if (enviando) return;
    setEnviando(true);
    try {
      const payload = {
        origen_mercancia: cabecera.origen_mercancia,
        nota_referencia: cabecera.nota_referencia,
        productos: productosLote.map(p => ({
          producto_id: p.producto_id,
          costo_unitario: Number(p.costo_unitario),
          nuevo_precio_venta: Number(p.nuevo_precio_venta),
          variantes: Object.entries(p.celdas)
            .filter(([_, cant]) => Number(cant) > 0)
            .map(([key, cant]) => {
              const [talla_id, color_id] = key.split('-').map(Number);
              const variante = p.matriz_data.variantes.find(v => v.talla_id === talla_id && v.color_id === color_id);
              return {
                variante_id: variante.variante_id,
                cantidad: Number(cant)
              };
            })
        }))
      };
      
      const res = await api.post("/inventario/entradas", payload);
      navigate("/admin/inventario", { state: { alert: { type: "success", msg: res.data.message } } });
    } catch (err) {
      setAlert({ type: "error", msg: err.response?.data?.message || "Error al registrar la entrada." });
      setEnviando(false);
    }
  };

  // ── Estilos compartidos ──
  const inputStyle = { 
    width: "100%", padding: "10px 12px", borderRadius: "6px", 
    border: "1px solid #374151", background: "#0d1117", 
    color: "white", outline: "none", fontSize: "13px", boxSizing: "border-box"
  };
  const labelStyle = { display: "block", marginBottom: "6px", color: "#d1d5db", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" };

  return (
    <AdminLayout pageTitle="Ingreso de Mercancía" breadcrumb="Inventario / Ingreso">
      
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <button className="adm-btn adm-btn-ghost" onClick={() => navigate("/admin/inventario")} type="button">
          <IconBack /> Volver al Inventario
        </button>
        
        {/* INDICADOR DE PASOS */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {["Origen", "Productos", "Confirmación"].map((label, idx) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: "26px", height: "26px", borderRadius: "50%",
                background: paso > idx + 1 ? "#10b981" : paso === idx + 1 ? "#3b82f6" : "#374151",
                color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", fontWeight: "bold"
              }}>
                {paso > idx + 1 ? "✓" : idx + 1}
              </div>
              <span style={{ fontSize: "12px", color: paso >= idx + 1 ? "white" : "#9ca3af", fontWeight: paso === idx + 1 ? 700 : 500 }}>
                {label}
              </span>
              {idx < 2 && <div style={{ width: "24px", height: "2px", background: paso > idx + 1 ? "#10b981" : "#374151" }} />}
            </div>
          ))}
        </div>
      </div>

      {alert && (
        <div className={`adm-alert ${alert.type === "success" ? "adm-alert-success" : "adm-alert-error"}`} style={{ marginBottom: "16px" }}>
          {alert.type === "success" ? "✓" : "✕"} {alert.msg}
        </div>
      )}

      {/* ═════════════ PASO 1: ORIGEN ═════════════ */}
      {paso === 1 && (
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: "12px", padding: "28px", maxWidth: "700px", margin: "0 auto" }}>
          <h3 style={{ color: "white", marginTop: 0, marginBottom: "8px", fontSize: "18px" }}>📦 Origen del lote</h3>
          <p style={{ color: "#9ca3af", marginBottom: "24px", fontSize: "13px" }}>
            Captura el origen de este lote de mercancía. Esta información se guarda para auditoría.
          </p>

          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Origen de la mercancía</label>
            <input
              type="text"
              placeholder="Ej. Bazar CDMX, Mercado Lagunilla, Proveedor X..."
              value={cabecera.origen_mercancia}
              onChange={e => setCabecera({ ...cabecera, origen_mercancia: e.target.value })}
              style={inputStyle}
              maxLength={150}
              autoFocus
            />
            <small style={{ color: "#6b7280", fontSize: "11px", marginTop: "5px", display: "block" }}>
              Campo libre. Indica de dónde provino esta mercancía.
            </small>
          </div>

          <div style={{ marginBottom: "28px" }}>
            <label style={labelStyle}>Nota o folio de referencia (opcional)</label>
            <input
              type="text"
              placeholder="Ej. Factura #1234, Remisión, Ticket..."
              value={cabecera.nota_referencia}
              onChange={e => setCabecera({ ...cabecera, nota_referencia: e.target.value })}
              style={inputStyle}
              maxLength={150}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button className="adm-btn adm-btn-ghost" onClick={() => navigate("/admin/inventario")} type="button">
              Cancelar
            </button>
            <button className="adm-btn adm-btn-primary" onClick={() => setPaso(2)} type="button">
              Siguiente <IconArrowRight />
            </button>
          </div>
        </div>
      )}

      {/* ═════════════ PASO 2: MATRIZ DE PRODUCTOS ═════════════ */}
      {paso === 2 && (
        <div>
          {/* Buscador Principal */}
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: "12px", padding: "20px", marginBottom: "20px", position: "relative" }}>
            <label style={labelStyle}>Buscar producto por nombre</label>
            <input
              id="buscador-productos"
              type="text"
              placeholder="Escribe al menos 2 caracteres (ej. 'Playera', 'Sombrero')..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={inputStyle}
              autoFocus
            />
            <small style={{ color: "#6b7280", fontSize: "11px", marginTop: "6px", display: "block" }}>
              Busca y selecciona un modelo. Puedes buscar varias veces para agregar distintos modelos a este mismo ingreso.
            </small>
            
            {resultadosBusqueda.length > 0 && (
              <div style={{ position: "absolute", top: "calc(100% - 10px)", left: "20px", right: "20px", background: "#161b22", border: "1px solid #3b82f6", borderRadius: "8px", marginTop: "4px", maxHeight: "280px", overflowY: "auto", zIndex: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
                {resultadosBusqueda.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => agregarProductoALote(r)}
                    style={{
                      width: "100%", textAlign: "left", padding: "12px 16px",
                      background: "transparent", border: "none",
                      borderBottom: "1px solid #30363d", color: "white",
                      cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(59,130,246,0.1)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "14px" }}>{r.nombre}</div>
                      <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "3px" }}>
                        {r.categoria_nombre || "Sin categoría"} {r.marca_nombre && ` · ${r.marca_nombre}`}
                      </div>
                    </div>
                    <div style={{ fontSize: "11px", color: "#9ca3af", textAlign: "right" }}>
                      <div>{r.total_variantes} variantes</div>
                      <div>Stock: <strong style={{ color: "white" }}>{r.stock_total_actual}</strong></div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lista de modelos agregados al lote */}
          {productosLote.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", background: "#161b22", borderRadius: "12px", border: "1px dashed #374151" }}>
              <div style={{ fontSize: "40px", opacity: 0.3, marginBottom: "12px" }}>📋</div>
              <p style={{ color: "#9ca3af", fontSize: "14px", margin: 0 }}>Aún no has agregado modelos al lote.</p>
              <p style={{ color: "#6b7280", fontSize: "12px", marginTop: "6px" }}>Usa el buscador de arriba para empezar.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {productosLote.map(prod => (
                <ProductoMatriz
                  key={prod.producto_id}
                  prod={prod}
                  onQuitar={() => intentarQuitarProducto(prod)}
                  onCelda={(t, c, v) => actualizarCelda(prod.producto_id, t, c, v)}
                  onCampo={(campo, val) => actualizarCampoProducto(prod.producto_id, campo, val)}
                  onRestaurar={() => restaurarSugerido(prod.producto_id)}
                  totalPiezas={totalPiezasProducto(prod)}
                  inputStyle={inputStyle}
                  labelStyle={labelStyle}
                  blockInvalidChars={blockInvalidChars}
                  blockInvalidCharsInt={blockInvalidCharsInt}
                  esValido={productoValido(prod)}
                />
              ))}

              {/* Botón dinámico para invitar a agregar MÁS modelos */}
              <div 
                onClick={() => document.getElementById("buscador-productos").focus()}
                style={{ 
                  textAlign: "center", padding: "20px", border: "2px dashed #3b82f6", 
                  borderRadius: "12px", cursor: "pointer", background: "rgba(59,130,246,0.05)",
                  transition: "background 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(59,130,246,0.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(59,130,246,0.05)"}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#3b82f6", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <IconPlus />
                  </div>
                  <span style={{ color: "#3b82f6", fontWeight: "bold", fontSize: "14px" }}>Agregar otro modelo a este resurtimiento</span>
                </div>
              </div>

              {/* Total del lote */}
              <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "10px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "#9ca3af", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>Total invertido en el lote</div>
                  <div style={{ color: "#9ca3af", fontSize: "12px", marginTop: "2px" }}>
                    {productosLote.length} modelos · {totalPiezasLote} piezas
                  </div>
                </div>
                <span style={{ color: "#10b981", fontSize: "24px", fontWeight: "900" }}>{fmt(totalLote)}</span>
              </div>
            </div>
          )}

          {/* Navegación */}
          <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", gap: "10px" }}>
            <button className="adm-btn adm-btn-ghost" onClick={() => setPaso(1)} type="button">
              <IconArrowLeft /> Regresar
            </button>
            <button 
              className="adm-btn adm-btn-primary" 
              onClick={() => setPaso(3)} 
              type="button"
              disabled={!puedeAvanzarPaso2()}
              style={{
                opacity: !puedeAvanzarPaso2() ? 0.5 : 1,
                cursor: !puedeAvanzarPaso2() ? "not-allowed" : "pointer"
              }}
            >
              Siguiente <IconArrowRight />
            </button>
          </div>
        </div>
      )}

      {/* ═════════════ PASO 3: CONFIRMACIÓN ═════════════ */}
      {paso === 3 && (
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: "12px", padding: "24px", marginBottom: "16px" }}>
            <h3 style={{ color: "white", marginTop: 0, marginBottom: "20px", fontSize: "16px", textTransform: "uppercase", letterSpacing: "1px" }}>Resumen del Ingreso</h3>
            
            {/* Cabecera del resumen */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
              <div>
                <div style={{ color: "#9ca3af", fontSize: "11px", textTransform: "uppercase", marginBottom: "3px" }}>Origen</div>
                <div style={{ color: "white", fontSize: "13px" }}>{cabecera.origen_mercancia || "— Sin origen —"}</div>
              </div>
              <div>
                <div style={{ color: "#9ca3af", fontSize: "11px", textTransform: "uppercase", marginBottom: "3px" }}>Nota/Folio</div>
                <div style={{ color: "white", fontSize: "13px" }}>{cabecera.nota_referencia || "—"}</div>
              </div>
            </div>

            {/* KPIs del lote */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", padding: "16px 0", borderTop: "1px solid #30363d", borderBottom: "1px solid #30363d", marginBottom: "20px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "26px", fontWeight: "900", color: "#3b82f6" }}>{productosLote.length}</div>
                <div style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase" }}>Productos</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "26px", fontWeight: "900", color: "white" }}>{totalPiezasLote}</div>
                <div style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase" }}>Piezas totales</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "26px", fontWeight: "900", color: "#10b981" }}>{fmt(totalLote)}</div>
                <div style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase" }}>Total Lote</div>
              </div>
            </div>

            {/* Detalle por producto */}
            {productosLote.map(p => {
              const piezas = totalPiezasProducto(p);
              const subtotal = piezas * Number(p.costo_unitario);
              const celdasArr = Object.entries(p.celdas)
                .filter(([_, c]) => Number(c) > 0)
                .map(([key, cant]) => {
                  const [talla_id, color_id] = key.split('-').map(Number);
                  const talla = p.matriz_data.tallas.find(t => t.id === talla_id);
                  const color = p.matriz_data.colores.find(c => c.id === color_id);
                  return { talla, color, cantidad: cant };
                });
              
              return (
                <div key={p.producto_id} style={{ background: "#0d1117", border: "1px solid #30363d", borderRadius: "8px", padding: "16px", marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", gap: "10px", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: "bold", color: "white", fontSize: "15px" }}>{p.producto_nombre}</div>
                      <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "3px" }}>
                        {piezas} piezas · Costo {fmt(Number(p.costo_unitario))} c/u
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "11px", color: "#9ca3af" }}>Nuevo precio venta</div>
                      <div style={{ fontSize: "16px", color: "#3b82f6", fontWeight: "bold" }}>{fmt(Number(p.nuevo_precio_venta))}</div>
                    </div>
                  </div>

                  {/* Lista compacta de variantes */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                    {celdasArr.map((c, i) => (
                      <span key={i} style={{ background: "#161b22", border: "1px solid #30363d", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: c.color.codigo_hex, border: "1px solid #4b5563" }} />
                        <strong>{c.talla.valor}</strong> · {c.color.nombre} × <strong style={{ color: "#3b82f6" }}>{c.cantidad}</strong>
                      </span>
                    ))}
                  </div>

                  <div style={{ textAlign: "right", fontSize: "12px", color: "#9ca3af", borderTop: "1px dashed #30363d", paddingTop: "8px" }}>
                    Subtotal: <span style={{ color: "white", fontWeight: "bold", fontSize: "14px", marginLeft: "6px" }}>{fmt(subtotal)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "8px", padding: "12px 16px", fontSize: "12px", color: "#fbbf24", marginBottom: "20px" }}>
            ⚠️ Al confirmar, se actualizará el stock de las variantes, el costo promedio ponderado y el precio de venta de los productos afectados (todas sus variantes).
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
            <button className="adm-btn adm-btn-ghost" onClick={() => setPaso(2)} type="button" disabled={enviando}>
              <IconArrowLeft /> Regresar
            </button>
            <button 
              className="adm-btn adm-btn-primary" 
              onClick={handleRegistrar} 
              type="button"
              disabled={enviando}
              style={{
                background: enviando ? "#6b7280" : "#10b981",
                borderColor: enviando ? "#6b7280" : "#10b981",
                cursor: enviando ? "not-allowed" : "pointer",
                minWidth: "200px",
                justifyContent: "center"
              }}
            >
              <IconCheck /> {enviando ? "Registrando..." : "Confirmar Ingreso"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE PRODUCTO */}
      {productoARemover && (
        <div className="adm-modal-overlay" onClick={() => setProductoARemover(null)}>
          <div className="adm-modal" style={{ maxWidth: "400px" }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">¿Eliminar del lote?</h3>
              <button className="adm-modal-close" onClick={() => setProductoARemover(null)} type="button"><IconX /></button>
            </div>
            <div className="adm-modal-body">
              <p style={{ fontSize: "14px", color: "#9ca3af", lineHeight: 1.6, marginBottom: "20px" }}>
                Ya has capturado información (costos o piezas) para el modelo <strong style={{color: "white"}}>{productoARemover.producto_nombre}</strong>. Si lo eliminas, perderás esta captura.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button className="adm-btn adm-btn-ghost" onClick={() => setProductoARemover(null)}>Cancelar</button>
                <button className="adm-btn adm-btn-danger" onClick={confirmarQuitarProducto}>Sí, eliminar captura</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}

// ════════════════════════════════════════════════════════════
//  COMPONENTE: MATRIZ DE UN PRODUCTO (Tallas × Colores)
// ════════════════════════════════════════════════════════════
function ProductoMatriz({ prod, onQuitar, onCelda, onCampo, onRestaurar, totalPiezas, inputStyle, labelStyle, blockInvalidChars, blockInvalidCharsInt, esValido }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const { matriz_data, costo_unitario, nuevo_precio_venta, precio_sugerido, costo_promedio_nuevo, costo_promedio_actual, precio_actual_producto } = prod;
  const tallas = matriz_data.tallas;
  const colores = matriz_data.colores;

  const getVarianteEnCelda = (talla_id, color_id) => {
    return matriz_data.variantes.find(v => v.talla_id === talla_id && v.color_id === color_id);
  };

  return (
    <div style={{ background: "#161b22", border: `1px solid ${esValido ? "#10b981" : "#30363d"}`, borderRadius: "12px", padding: "20px", transition: "border-color 0.2s" }}>
      
      {/* Header del producto */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: isCollapsed ? "0" : "16px", gap: "10px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h4 style={{ margin: 0, color: "white", fontSize: "16px", fontWeight: "bold" }}>{prod.producto_nombre}</h4>
            {isCollapsed && totalPiezas > 0 && (
              <span style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" }}>
                {totalPiezas} piezas capturadas
              </span>
            )}
          </div>
          <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px", display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <span>Stock actual total: <strong style={{ color: "white" }}>{prod.stock_total_actual}</strong></span>
            <span>Costo prom. actual: <strong style={{ color: "white" }}>{fmt(costo_promedio_actual)}</strong></span>
            <span>Precio venta actual: <strong style={{ color: "white" }}>{fmt(precio_actual_producto)}</strong></span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {/* BOTÓN COLAPSAR/EXPANDIR */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expandir bloque" : "Contraer bloque"}
            style={{ flexShrink: 0, background: "rgba(255,255,255,0.05)", border: "1px solid #30363d", color: "#9ca3af", cursor: "pointer", width: "32px", height: "32px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
          >
            {isCollapsed ? <IconPlus /> : <IconMinus />}
          </button>
          
          <button
            type="button"
            onClick={onQuitar}
            title="Quitar este producto del lote"
            style={{ flexShrink: 0, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", cursor: "pointer", width: "32px", height: "32px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
          >
            <IconTrash />
          </button>
        </div>
      </div>

      {/* CONTENIDO OCULTABLE */}
      {!isCollapsed && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", marginBottom: "16px", background: "#0d1117", padding: "14px", borderRadius: "8px", border: "1px solid #30363d" }}>
            <div>
              <label style={labelStyle}>Costo unitario (lo que pagaste por pieza) — único para todo este producto *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={costo_unitario}
                onChange={e => onCampo("costo_unitario", e.target.value)}
                onKeyDown={blockInvalidChars}
                style={{ ...inputStyle, fontSize: "16px", fontWeight: "bold" }}
                placeholder="0.00"
              />
              <small style={{ color: "#6b7280", fontSize: "11px", marginTop: "4px", display: "block" }}>
                Aplica el mismo costo a todas las variantes que captures en la matriz de abajo.
              </small>
            </div>
          </div>

          {/* MATRIZ TALLAS × COLORES */}
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>
              Captura cuántas piezas llegaron de cada talla y color
              {totalPiezas > 0 && (
                <span style={{ marginLeft: "10px", background: "#3b82f6", color: "white", padding: "2px 10px", borderRadius: "20px", fontSize: "10px" }}>
                  Total: {totalPiezas} piezas
                </span>
              )}
            </label>
            
            <div style={{ overflowX: "auto", border: "1px solid #30363d", borderRadius: "8px", background: "#0d1117" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px" }}>
                <thead>
                  <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: "#d1d5db", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", position: "sticky", left: 0, background: "#161b22", zIndex: 2 }}>Color \ Talla</th>
                    {tallas.map(t => (
                      <th key={t.id} style={{ padding: "10px 8px", textAlign: "center", color: "#d1d5db", fontSize: "12px", fontFamily: "monospace", minWidth: "70px" }}>
                        {t.valor}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {colores.map(c => (
                    <tr key={c.id} style={{ borderBottom: "1px solid #1f2937" }}>
                      <td style={{ padding: "8px 12px", color: "white", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px", position: "sticky", left: 0, background: "#0d1117", zIndex: 1 }}>
                        <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: c.codigo_hex, border: "1px solid #4b5563", flexShrink: 0 }} />
                        {c.nombre}
                      </td>
                      {tallas.map(t => {
                        const variante = getVarianteEnCelda(t.id, c.id);
                        if (!variante) {
                          return (
                            <td key={t.id} style={{ padding: "6px 4px", textAlign: "center" }}>
                              <div style={{ width: "60px", height: "32px", background: "rgba(75,85,99,0.1)", borderRadius: "4px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563", fontSize: "16px" }}>—</div>
                            </td>
                          );
                        }
                        const key = `${t.id}-${c.id}`;
                        const valor = prod.celdas[key] || "";
                        return (
                          <td key={t.id} style={{ padding: "6px 4px", textAlign: "center" }}>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={valor}
                              onChange={e => onCelda(t.id, c.id, e.target.value)}
                              onKeyDown={blockInvalidCharsInt}
                              placeholder="0"
                              title={`SKU: ${variante.sku} · Stock actual: ${variante.stock}`}
                              style={{
                                width: "60px",
                                height: "32px",
                                padding: "4px",
                                background: valor ? "rgba(59,130,246,0.15)" : "#161b22",
                                border: `1px solid ${valor ? "#3b82f6" : "#30363d"}`,
                                borderRadius: "4px",
                                color: "white",
                                textAlign: "center",
                                fontSize: "13px",
                                outline: "none",
                                fontWeight: valor ? "bold" : "normal",
                                transition: "all 0.15s"
                              }}
                            />
                            <div style={{ fontSize: "9px", color: "#6b7280", marginTop: "2px" }}>
                              Stock: {variante.stock}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <small style={{ color: "#6b7280", fontSize: "11px", marginTop: "6px", display: "block" }}>
              Las celdas marcadas con "—" son combinaciones que no existen para este producto. Si necesitas agregarlas, regresa al módulo Productos.
            </small>
          </div>

          {costo_promedio_nuevo !== null && totalPiezas > 0 && (
            <div style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "8px", padding: "14px", marginTop: "8px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", fontSize: "12px", marginBottom: "12px" }}>
                <div>
                  <span style={{ color: "#9ca3af" }}>Costo prom. actual:</span>
                  <span style={{ color: "white", marginLeft: "6px", fontWeight: "600" }}>{fmt(costo_promedio_actual)}</span>
                </div>
                <div>
                  <span style={{ color: "#9ca3af" }}>Costo prom. nuevo:</span>
                  <span style={{ color: "#10b981", marginLeft: "6px", fontWeight: "700" }}>{fmt(costo_promedio_nuevo)}</span>
                </div>
                <div>
                  <span style={{ color: "#9ca3af" }}>Precio venta actual:</span>
                  <span style={{ color: "white", marginLeft: "6px", fontWeight: "600" }}>{fmt(precio_actual_producto)}</span>
                </div>
                <div>
                  <span style={{ color: "#9ca3af" }}>Precio sugerido (×2.5):</span>
                  <span style={{ color: "#3b82f6", marginLeft: "6px", fontWeight: "700" }}>{fmt(precio_sugerido)}</span>
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  Nuevo precio de venta (aplica a todas las variantes del producto) *
                  {precio_sugerido !== null && Number(nuevo_precio_venta) !== precio_sugerido && (
                    <button 
                      type="button" 
                      onClick={onRestaurar}
                      style={{ marginLeft: "10px", background: "transparent", border: "1px solid #3b82f6", color: "#3b82f6", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px", textTransform: "none", letterSpacing: 0 }}
                      title="Restaurar al precio sugerido"
                    >
                      <IconRefresh /> Restaurar sugerido
                    </button>
                  )}
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={nuevo_precio_venta}
                  onChange={e => onCampo("nuevo_precio_venta", e.target.value)}
                  onKeyDown={blockInvalidChars}
                  style={{ ...inputStyle, borderColor: "#3b82f6", fontWeight: "bold", fontSize: "16px" }}
                  placeholder="0.00"
                />
                <small style={{ color: "#6b7280", fontSize: "11px", marginTop: "4px", display: "block" }}>
                  Pre-cargado con el sugerido (costo × 2.5). Puedes editarlo libremente.
                </small>
              </div>
            </div>
          )}

          {totalPiezas > 0 && Number(costo_unitario) > 0 && (
            <div style={{ textAlign: "right", marginTop: "12px", fontSize: "13px", color: "#9ca3af", borderTop: "1px dashed #30363d", paddingTop: "10px" }}>
              Subtotal del producto: <span style={{ color: "white", fontWeight: "bold", fontSize: "15px", marginLeft: "8px" }}>{fmt(totalPiezas * Number(costo_unitario))}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}