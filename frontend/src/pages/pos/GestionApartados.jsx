import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/AdminLayout";
import VendedorLayout from "../../components/VendedorLayout";
import api from "../../services/api";

const IconX     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconMoney = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const IconEye   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconBan   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>;
const IconDoc   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;

const FILTROS = [
  { key: "activo",     label: "Activos" },
  { key: "vencido",    label: "Vencidos" },
  { key: "completado", label: "Completados" },
  { key: "todos",      label: "Todos" },
];

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

// fecha_limite viene como 'YYYY-MM-DD'; formateamos sin desfase por zona horaria.
const fmtFecha = (f) => {
  if (!f) return "—";
  const s = String(f).slice(0, 10);
  const [y, m, d] = s.split("-");
  return d && m && y ? `${d}/${m}/${y}` : s;
};

const getAlertClass = (t) => (t === "success" ? "adm-alert-success" : "adm-alert-error");

function EstadoBadge({ ap }) {
  if (ap.estado === "activo" && ap.vencido) return <span className="adm-badge adm-badge-red">Vencido</span>;
  if (ap.estado === "activo")     return <span className="adm-badge adm-badge-blue">Activo</span>;
  if (ap.estado === "completado") return <span className="adm-badge adm-badge-green">Completado</span>;
  return <span className="adm-badge adm-badge-gray">Cancelado</span>;
}

export default function GestionApartados() {
  const rol = localStorage.getItem("rol");
  const Layout = (rol === "rol_admin" || rol === "rol_gestor_inventario") ? AdminLayout : VendedorLayout;

  const [apartados, setApartados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("activo");
  const [q, setQ] = useState("");
  const [alert, setAlert] = useState(null);

  // Abono
  const [abonoAp, setAbonoAp] = useState(null);
  const [montoAbono, setMontoAbono] = useState("");
  const [metodoAbono, setMetodoAbono] = useState("Efectivo");
  const [submitAbono, setSubmitAbono] = useState(false);

  // Cancelación
  const [cancelAp, setCancelAp] = useState(null);
  const [submitCancel, setSubmitCancel] = useState(false);

  // Detalle
  const [detalle, setDetalle] = useState(null);
  const [loadingDet, setLoadingDet] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtro !== "todos") params.estado = filtro;
      if (q.trim()) params.q = q.trim();
      const res = await api.get("/ventas/apartados", { params });
      setApartados(res.data || []);
    } catch (error) {
      console.error("Error al cargar apartados:", error);
      setApartados([]);
      setAlert({ type: "error", msg: "No se pudieron cargar los apartados." });
    } finally {
      setLoading(false);
    }
  }, [filtro, q]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 3500);
    return () => clearTimeout(t);
  }, [alert]);

  const abrirAbono = (ap) => { setAbonoAp(ap); setMontoAbono(""); setMetodoAbono("Efectivo"); };

  const registrarAbono = async () => {
    if (submitAbono || !abonoAp) return;
    const monto = Number(montoAbono);
    const saldo = Number(abonoAp.saldo);
    if (!monto || monto <= 0) { setAlert({ type: "error", msg: "Ingresa un monto válido." }); return; }
    if (monto > saldo + 0.001) { setAlert({ type: "error", msg: `El abono excede el saldo (${money(saldo)}).` }); return; }

    setSubmitAbono(true);
    try {
      const res = await api.post(`/ventas/apartados/${abonoAp.id}/abonos`, { monto, metodo: metodoAbono });
      setAlert({ type: "success", msg: res.data.message || "Abono registrado." });
      setAbonoAp(null);
      cargar();
    } catch (error) {
      setAlert({ type: "error", msg: error.response?.data?.message || "Error al registrar el abono." });
    } finally {
      setSubmitAbono(false);
    }
  };

  const confirmarCancelacion = async () => {
    if (submitCancel || !cancelAp) return;
    setSubmitCancel(true);
    try {
      const res = await api.post(`/ventas/apartados/${cancelAp.id}/cancelar`);
      setAlert({ type: "success", msg: res.data.message || "Apartado cancelado." });
      setCancelAp(null);
      cargar();
    } catch (error) {
      setAlert({ type: "error", msg: error.response?.data?.message || "No se pudo cancelar." });
      setCancelAp(null);
    } finally {
      setSubmitCancel(false);
    }
  };

  const verDetalle = async (id) => {
    setLoadingDet(true);
    setDetalle({ loading: true });
    try {
      const res = await api.get(`/ventas/apartados/${id}`);
      setDetalle(res.data);
    } catch (error) {
      setAlert({ type: "error", msg: "No se pudo cargar el detalle." });
      setDetalle(null);
    } finally {
      setLoadingDet(false);
    }
  };

  const descargarPDF = async (id) => {
    try {
      const res = await api.get(`/ventas/apartados/${id}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      window.open(url, "_blank");
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch {
      setAlert({ type: "error", msg: "Error al generar el comprobante." });
    }
  };

  const vencidosCount = apartados.filter((a) => a.vencido).length;

  return (
    <Layout pageTitle="Apartados" breadcrumb="Apartados">
      {alert && (
        <div className={`adm-alert ${getAlertClass(alert.type)}`}>
          {alert.type === "success" ? "✓" : "✕"} {alert.msg}
        </div>
      )}

      {/* Aviso de vencimientos (P23) */}
      {filtro !== "completado" && vencidosCount > 0 && (
        <div className="adm-alert adm-alert-error" style={{ background: "rgba(239,68,68,0.1)" }}>
          ⚠️ Hay {vencidosCount} apartado(s) vencido(s). Registra su liquidación o cancélalos para liberar el stock.
        </div>
      )}

      {/* Filtros + búsqueda */}
      <div className="adm-section-header" style={{ flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {FILTROS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`adm-btn ${filtro === f.key ? "adm-btn-primary" : "adm-btn-ghost"} adm-btn-sm`}
              onClick={() => setFiltro(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          className="adm-input"
          style={{ maxWidth: 260 }}
          placeholder="Buscar por folio o cliente..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="adm-empty">
          <div className="spinner" style={{ margin: "0 auto 14px" }}></div>
          <p>Cargando apartados...</p>
        </div>
      ) : apartados.length === 0 ? (
        <div className="adm-empty">
          <div className="adm-empty-icon">📌</div>
          <p>No hay apartados en esta vista.</p>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Abonado</th>
                <th>Saldo</th>
                <th>Vence</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {apartados.map((ap) => (
                <tr key={ap.id} style={ap.vencido ? { background: "rgba(239,68,68,0.06)" } : undefined}>
                  <td style={{ fontWeight: "bold" }}>#{ap.id}</td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{ap.cliente_nombre}</div>
                    {ap.cliente_tel && <div style={{ fontSize: 11, color: "#9ca3af" }}>{ap.cliente_tel}</div>}
                  </td>
                  <td>{money(ap.total)}</td>
                  <td style={{ color: "#10b981" }}>{money(ap.abonado)}</td>
                  <td style={{ fontWeight: "bold", color: Number(ap.saldo) > 0 ? "var(--color-accent)" : "#10b981" }}>{money(ap.saldo)}</td>
                  <td style={{ fontSize: 12, color: ap.vencido ? "#ef4444" : "inherit", fontWeight: ap.vencido ? 700 : 400 }}>
                    {fmtFecha(ap.fecha_limite)}
                  </td>
                  <td><EstadoBadge ap={ap} /></td>
                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {ap.estado === "activo" && (
                        <button className="adm-btn adm-btn-primary adm-btn-sm" onClick={() => abrirAbono(ap)} title="Registrar abono">
                          <IconMoney />
                        </button>
                      )}
                      <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => verDetalle(ap.id)} title="Ver detalle"><IconEye /></button>
                      <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => descargarPDF(ap.id)} title="Comprobante PDF"><IconDoc /></button>
                      {ap.estado === "activo" && (
                        <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setCancelAp(ap)} title="Cancelar y devolver stock"><IconBan /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL ABONO (P21/P22) ── */}
      {abonoAp && (
        <div className="adm-modal-overlay">
          <div className="adm-modal" style={{ maxWidth: 420 }}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">Abono — Apartado #{abonoAp.id}</h3>
              <button className="adm-modal-close" onClick={() => setAbonoAp(null)}><IconX /></button>
            </div>
            <div className="adm-modal-body">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: "#8b949e" }}>Cliente</span><span style={{ fontWeight: 600 }}>{abonoAp.cliente_nombre}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: "#8b949e" }}>Total</span><span>{money(abonoAp.total)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 15 }}>
                <span style={{ color: "#8b949e" }}>Saldo pendiente</span>
                <span style={{ fontWeight: "bold", color: "var(--color-accent)" }}>{money(abonoAp.saldo)}</span>
              </div>

              <div className="adm-form-group">
                <label>Método de pago</label>
                <select className="adm-select" value={metodoAbono} onChange={(e) => setMetodoAbono(e.target.value)}>
                  <option value="Efectivo">Efectivo</option>
                  <option value="T. Débito">T. Débito</option>
                  <option value="T. Crédito">T. Crédito</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </div>
              <div className="adm-form-group">
                <label>Monto del abono</label>
                <input type="number" min="0" className="adm-input" value={montoAbono}
                  onChange={(e) => setMontoAbono(e.target.value)} placeholder={Number(abonoAp.saldo).toFixed(2)} autoFocus
                  style={{ textAlign: "right", fontSize: "1.2rem", fontWeight: "bold" }} />
                <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" style={{ marginTop: 8 }}
                  onClick={() => setMontoAbono(String(Number(abonoAp.saldo).toFixed(2)))}>
                  Liquidar saldo completo
                </button>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setAbonoAp(null)}>Cancelar</button>
              <button className="adm-btn adm-btn-primary" onClick={registrarAbono} disabled={submitAbono}>
                {submitAbono ? "Registrando..." : "Registrar abono"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CANCELAR (P23) ── */}
      {cancelAp && (
        <div className="adm-modal-overlay">
          <div className="adm-modal" style={{ maxWidth: 400 }}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">Cancelar apartado #{cancelAp.id}</h3>
              <button className="adm-modal-close" onClick={() => setCancelAp(null)}><IconX /></button>
            </div>
            <div className="adm-modal-body">
              <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6 }}>
                Los productos regresarán de inmediato al stock disponible. Esta acción no se puede deshacer.
                {Number(cancelAp.abonado) > 0 && (
                  <> El cliente había abonado <strong style={{ color: "#f59e0b" }}>{money(cancelAp.abonado)}</strong>; gestiona el reembolso según la política de la tienda.</>
                )}
              </p>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setCancelAp(null)}>Volver</button>
              <button className="adm-btn adm-btn-danger" onClick={confirmarCancelacion} disabled={submitCancel}>
                {submitCancel ? "Cancelando..." : "Cancelar y devolver stock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DETALLE ── */}
      {detalle && (
        <div className="adm-modal-overlay">
          <div className="adm-modal" style={{ maxWidth: 560 }}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">Detalle del apartado {detalle.apartado ? `#${detalle.apartado.id}` : ""}</h3>
              <button className="adm-modal-close" onClick={() => setDetalle(null)}><IconX /></button>
            </div>
            <div className="adm-modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              {loadingDet || detalle.loading ? (
                <div className="adm-empty"><div className="spinner" style={{ margin: "0 auto 10px" }}></div><p>Cargando...</p></div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16, fontSize: 13 }}>
                    <div><span style={{ color: "#8b949e" }}>Cliente:</span> <strong>{detalle.apartado.cliente_nombre}</strong></div>
                    <div><span style={{ color: "#8b949e" }}>Vence:</span> <strong style={{ color: detalle.apartado.vencido ? "#ef4444" : "inherit" }}>{fmtFecha(detalle.apartado.fecha_limite)}</strong></div>
                    <div><span style={{ color: "#8b949e" }}>Total:</span> <strong>{money(detalle.apartado.total)}</strong></div>
                    <div><span style={{ color: "#8b949e" }}>Saldo:</span> <strong style={{ color: "var(--color-accent)" }}>{money(detalle.apartado.saldo)}</strong></div>
                  </div>

                  <h4 style={{ fontSize: 13, margin: "0 0 8px" }}>Productos</h4>
                  <div className="adm-table-wrap" style={{ marginBottom: 18 }}>
                    <table className="adm-table">
                      <thead><tr><th>Producto</th><th>Cant.</th><th>P. Unit.</th><th>Subtotal</th></tr></thead>
                      <tbody>
                        {detalle.articulos.map((it, i) => (
                          <tr key={i}>
                            <td>{it.producto_nombre} <span style={{ color: "#8b949e", fontSize: 11 }}>({it.talla}/{it.color})</span></td>
                            <td>{it.cantidad}</td>
                            <td>{money(it.precio_unitario)}</td>
                            <td>{money(it.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h4 style={{ fontSize: 13, margin: "0 0 8px" }}>Historial de abonos</h4>
                  {detalle.abonos.length === 0 ? (
                    <p style={{ fontSize: 12, color: "#8b949e" }}>Sin abonos registrados.</p>
                  ) : (
                    <div className="adm-table-wrap">
                      <table className="adm-table">
                        <thead><tr><th>Fecha</th><th>Método</th><th>Monto</th></tr></thead>
                        <tbody>
                          {detalle.abonos.map((ab) => (
                            <tr key={ab.id}>
                              <td style={{ fontSize: 12 }}>{new Date(ab.fecha).toLocaleString("es-MX")}</td>
                              <td>{ab.metodo}</td>
                              <td style={{ color: "#10b981" }}>{money(ab.monto)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setDetalle(null)}>Cerrar</button>
              {detalle.apartado && (
                <button className="adm-btn adm-btn-primary" onClick={() => descargarPDF(detalle.apartado.id)}>Comprobante PDF</button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
