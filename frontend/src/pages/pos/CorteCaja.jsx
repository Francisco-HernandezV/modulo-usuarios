import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/AdminLayout";
import VendedorLayout from "../../components/VendedorLayout";
import api from "../../services/api";

const IconX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const getAlertClass = (t) => (t === "success" ? "adm-alert-success" : "adm-alert-error");

export default function CorteCaja() {
  const rol = localStorage.getItem("rol");
  const Layout = (rol === "rol_admin" || rol === "rol_gestor_inventario") ? AdminLayout : VendedorLayout;

  const [balance, setBalance] = useState(null);
  const [sinCaja, setSinCaja] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // Apertura
  const [montoInicial, setMontoInicial] = useState("");
  const [abriendo, setAbriendo] = useState(false);

  // Retiro
  const [showRetiro, setShowRetiro] = useState(false);
  const [retMonto, setRetMonto] = useState("");
  const [retTipo, setRetTipo] = useState("Parcial");
  const [retMotivo, setRetMotivo] = useState("");
  const [subRetiro, setSubRetiro] = useState(false);

  // Cierre
  const [showCierre, setShowCierre] = useState(false);
  const [efReal, setEfReal] = useState("");
  const [taReal, setTaReal] = useState("");
  const [trReal, setTrReal] = useState("");
  const [subCierre, setSubCierre] = useState(false);
  const [resultado, setResultado] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const est = await api.get("/ventas/caja/estado");
      if (!est.data.abierta) {
        setSinCaja(true);
        setBalance(null);
      } else {
        setSinCaja(false);
        const bal = await api.get("/ventas/caja/balance-actual");
        setBalance(bal.data);
      }
    } catch (error) {
      console.error("Error al cargar la caja:", error);
      setAlert({ type: "error", msg: "No se pudo cargar el estado de la caja." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 3500);
    return () => clearTimeout(t);
  }, [alert]);

  const abrirCaja = async () => {
    const monto = Number(montoInicial);
    if (montoInicial === "" || Number.isNaN(monto) || monto < 0) {
      setAlert({ type: "error", msg: "Ingresa un monto inicial válido." });
      return;
    }
    setAbriendo(true);
    try {
      await api.post("/ventas/caja/apertura", { monto_inicial: monto });
      setMontoInicial("");
      setAlert({ type: "success", msg: "Caja abierta correctamente." });
      cargar();
    } catch (error) {
      setAlert({ type: "error", msg: error.response?.data?.message || "Error al abrir la caja." });
    } finally {
      setAbriendo(false);
    }
  };

  const registrarRetiro = async () => {
    const monto = Number(retMonto);
    if (!monto || monto <= 0) { setAlert({ type: "error", msg: "Ingresa un monto válido." }); return; }
    if (balance && monto > Number(balance.efectivo_disponible) + 0.001) {
      setAlert({ type: "error", msg: `El retiro supera el efectivo disponible (${money(balance.efectivo_disponible)}).` });
      return;
    }
    setSubRetiro(true);
    try {
      await api.post("/ventas/caja/retiro", { monto, tipo_retiro: retTipo, motivo: retMotivo });
      setShowRetiro(false); setRetMonto(""); setRetMotivo(""); setRetTipo("Parcial");
      setAlert({ type: "success", msg: "Retiro registrado." });
      cargar();
    } catch (error) {
      setAlert({ type: "error", msg: error.response?.data?.message || "Error al registrar el retiro." });
    } finally {
      setSubRetiro(false);
    }
  };

  const procesarCierre = async () => {
    setSubCierre(true);
    try {
      const res = await api.post("/ventas/caja/cierre", {
        efectivo_real: Number(efReal) || 0,
        tarjeta_real: Number(taReal) || 0,
        transferencia_real: Number(trReal) || 0,
      });
      setResultado(res.data);
      setShowCierre(false);
      setEfReal(""); setTaReal(""); setTrReal("");
      cargar();
    } catch (error) {
      setAlert({ type: "error", msg: error.response?.data?.message || "Error al procesar el corte." });
    } finally {
      setSubCierre(false);
    }
  };

  const descargarPDF = async (turnoId) => {
    try {
      const res = await api.get(`/ventas/caja/turno/${turnoId}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      window.open(url, "_blank");
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch {
      setAlert({ type: "error", msg: "Error al generar el reporte." });
    }
  };

  // Diferencia en vivo dentro del modal de cierre
  const totalEsperado = balance
    ? Number(balance.efectivo_esperado) + Number(balance.tarjeta_esperado) + Number(balance.transferencia_esperado)
    : 0;
  const totalReal = (Number(efReal) || 0) + (Number(taReal) || 0) + (Number(trReal) || 0);
  const difPreview = totalReal - totalEsperado;

  return (
    <Layout pageTitle="Corte de Caja" breadcrumb="Corte de Caja">
      {alert && (
        <div className={`adm-alert ${getAlertClass(alert.type)}`}>
          {alert.type === "success" ? "✓" : "✕"} {alert.msg}
        </div>
      )}

      {/* Resultado del último corte */}
      {resultado && (
        <div className="adm-stat-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 12, marginBottom: 20, borderColor: "var(--color-accent)" }}>
          <div className="adm-section-title" style={{ border: "none", paddingLeft: 0 }}>✅ Corte procesado — Turno #{resultado.turno_id}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            <div><div style={{ fontSize: 11, color: "#9ca3af" }}>Esperado</div><div style={{ fontWeight: 700 }}>{money(resultado.esperado.total)}</div></div>
            <div><div style={{ fontSize: 11, color: "#9ca3af" }}>Contado</div><div style={{ fontWeight: 700 }}>{money(resultado.real.total)}</div></div>
            <div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Diferencia</div>
              <div style={{ fontWeight: 800, color: Number(resultado.diferencia) < 0 ? "#ef4444" : "#10b981" }}>
                {Number(resultado.diferencia) < 0 ? "Faltante " : "Sobrante "} {money(Math.abs(resultado.diferencia))}
              </div>
            </div>
          </div>
          <div>
            <button className="adm-btn adm-btn-primary adm-btn-sm" onClick={() => descargarPDF(resultado.turno_id)}>Imprimir reporte</button>
            <button className="adm-btn adm-btn-ghost adm-btn-sm" style={{ marginLeft: 8 }} onClick={() => setResultado(null)}>Ocultar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="adm-empty"><div className="spinner" style={{ margin: "0 auto 14px" }}></div><p>Cargando caja...</p></div>
      ) : sinCaja ? (
        /* ── APERTURA (no hay caja abierta) ── */
        <div className="adm-stat-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 16, maxWidth: 420, padding: 24 }}>
          <div className="adm-section-title" style={{ border: "none", paddingLeft: 0 }}>🔓 Abrir caja</div>
          <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6 }}>
            No hay una caja abierta. Registra el <strong>fondo inicial</strong> en efectivo para comenzar el día operativo.
          </p>
          <div className="adm-form-group">
            <label>Monto inicial en efectivo</label>
            <input type="number" min="0" className="adm-input" value={montoInicial}
              onChange={(e) => setMontoInicial(e.target.value)} placeholder="0.00"
              style={{ textAlign: "right", fontSize: "1.3rem", fontWeight: "bold" }} />
          </div>
          <button className="adm-btn adm-btn-primary" onClick={abrirCaja} disabled={abriendo} style={{ justifyContent: "center" }}>
            {abriendo ? "Abriendo..." : "Abrir caja"}
          </button>
        </div>
      ) : balance && (
        /* ── ARQUEO (POS-F3) ── */
        <>
          <div className="adm-stats-grid">
            <div className="adm-stat-card">
              <div className="adm-stat-icon blue">💵</div>
              <div><div className="adm-stat-value">{money(balance.efectivo_esperado)}</div><div className="adm-stat-label">Efectivo esperado</div></div>
            </div>
            <div className="adm-stat-card">
              <div className="adm-stat-icon green">💳</div>
              <div><div className="adm-stat-value">{money(balance.tarjeta_esperado)}</div><div className="adm-stat-label">Tarjeta esperado</div></div>
            </div>
            <div className="adm-stat-card">
              <div className="adm-stat-icon yellow">🏦</div>
              <div><div className="adm-stat-value">{money(balance.transferencia_esperado)}</div><div className="adm-stat-label">Transferencia esperado</div></div>
            </div>
            <div className="adm-stat-card">
              <div className="adm-stat-icon red">🪙</div>
              <div><div className="adm-stat-value">{money(balance.monto_inicial)}</div><div className="adm-stat-label">Fondo inicial</div></div>
            </div>
          </div>

          <div className="adm-section-header">
            <h3 className="adm-section-title">Desglose del turno #{balance.turno_id}</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="adm-btn adm-btn-ghost" onClick={() => setShowRetiro(true)}>Registrar retiro</button>
              <button className="adm-btn adm-btn-danger" onClick={() => { setEfReal(""); setTaReal(""); setTrReal(""); setShowCierre(true); }}>Cerrar caja / Corte</button>
            </div>
          </div>

          <div className="adm-table-wrap" style={{ marginBottom: 20 }}>
            <table className="adm-table">
              <thead><tr><th>Concepto</th><th>Efectivo</th><th>Tarjeta</th><th>Transferencia</th></tr></thead>
              <tbody>
                <tr><td>Fondo inicial</td><td>{money(balance.monto_inicial)}</td><td>—</td><td>—</td></tr>
                <tr><td>Ventas</td><td>{money(balance.ventas.efectivo)}</td><td>{money(balance.ventas.tarjeta)}</td><td>{money(balance.ventas.transferencia)}</td></tr>
                <tr><td>Abonos de apartados</td><td>{money(balance.abonos.efectivo)}</td><td>{money(balance.abonos.tarjeta)}</td><td>{money(balance.abonos.transferencia)}</td></tr>
                <tr><td>Retiros de efectivo</td><td style={{ color: "#ef4444" }}>- {money(balance.retiros)}</td><td>—</td><td>—</td></tr>
                <tr style={{ fontWeight: 700 }}>
                  <td>Total esperado</td>
                  <td style={{ color: "var(--color-accent)" }}>{money(balance.efectivo_esperado)}</td>
                  <td style={{ color: "var(--color-accent)" }}>{money(balance.tarjeta_esperado)}</td>
                  <td style={{ color: "var(--color-accent)" }}>{money(balance.transferencia_esperado)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="adm-section-header"><h3 className="adm-section-title">Retiros del turno</h3></div>
          {balance.retiros_lista.length === 0 ? (
            <div className="adm-empty"><p>Sin retiros registrados.</p></div>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead><tr><th>Fecha</th><th>Tipo</th><th>Motivo</th><th>Usuario</th><th>Monto</th></tr></thead>
                <tbody>
                  {balance.retiros_lista.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontSize: 12 }}>{new Date(r.creado_en).toLocaleString("es-MX")}</td>
                      <td><span className="adm-badge adm-badge-gray">{r.tipo_retiro}</span></td>
                      <td style={{ fontSize: 12 }}>{r.motivo || "—"}</td>
                      <td style={{ fontSize: 12 }}>{r.usuario_nombre || "—"}</td>
                      <td style={{ color: "#ef4444", fontWeight: 600 }}>{money(r.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── MODAL RETIRO (POS-F2) ── */}
      {showRetiro && (
        <div className="adm-modal-overlay">
          <div className="adm-modal" style={{ maxWidth: 420 }}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">Registrar retiro de efectivo</h3>
              <button className="adm-modal-close" onClick={() => setShowRetiro(false)}><IconX /></button>
            </div>
            <div className="adm-modal-body">
              {balance && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontSize: 13 }}>
                  <span style={{ color: "#8b949e" }}>Efectivo disponible</span>
                  <span style={{ fontWeight: "bold", color: "#10b981" }}>{money(balance.efectivo_disponible)}</span>
                </div>
              )}
              <div className="adm-form-row">
                <div className="adm-form-group">
                  <label>Monto</label>
                  <input type="number" min="0" className="adm-input" value={retMonto}
                    onChange={(e) => setRetMonto(e.target.value)} placeholder="0.00" autoFocus />
                </div>
                <div className="adm-form-group">
                  <label>Tipo de retiro</label>
                  <select className="adm-select" value={retTipo} onChange={(e) => setRetTipo(e.target.value)}>
                    <option value="Parcial">Parcial</option>
                    <option value="Insumos">Insumos / Gastos</option>
                    <option value="Resguardo">Resguardo</option>
                  </select>
                </div>
              </div>
              <div className="adm-form-group">
                <label>Motivo</label>
                <textarea className="adm-textarea" rows={2} value={retMotivo}
                  onChange={(e) => setRetMotivo(e.target.value)} placeholder="Describe el motivo del retiro" />
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setShowRetiro(false)}>Cancelar</button>
              <button className="adm-btn adm-btn-primary" onClick={registrarRetiro} disabled={subRetiro}>
                {subRetiro ? "Registrando..." : "Registrar retiro"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CIERRE (POS-F4) ── */}
      {showCierre && balance && (
        <div className="adm-modal-overlay">
          <div className="adm-modal" style={{ maxWidth: 460 }}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">Corte de caja — Conteo físico</h3>
              <button className="adm-modal-close" onClick={() => setShowCierre(false)}><IconX /></button>
            </div>
            <div className="adm-modal-body">
              <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 14 }}>
                Ingresa el dinero real contado por cada método. El sistema calculará la diferencia.
              </p>
              <div className="adm-form-group">
                <label>Efectivo real (esperado: {money(balance.efectivo_esperado)})</label>
                <input type="number" min="0" className="adm-input" value={efReal} onChange={(e) => setEfReal(e.target.value)} placeholder="0.00" />
              </div>
              <div className="adm-form-group">
                <label>Tarjeta real (esperado: {money(balance.tarjeta_esperado)})</label>
                <input type="number" min="0" className="adm-input" value={taReal} onChange={(e) => setTaReal(e.target.value)} placeholder="0.00" />
              </div>
              <div className="adm-form-group">
                <label>Transferencia real (esperado: {money(balance.transferencia_esperado)})</label>
                <input type="number" min="0" className="adm-input" value={trReal} onChange={(e) => setTrReal(e.target.value)} placeholder="0.00" />
              </div>
              <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 8, background: difPreview < 0 ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", display: "flex", justifyContent: "space-between", fontSize: 15 }}>
                <span style={{ fontWeight: 600 }}>{difPreview < 0 ? "Faltante" : "Sobrante"}</span>
                <span style={{ fontWeight: 800, color: difPreview < 0 ? "#ef4444" : "#10b981" }}>{money(Math.abs(difPreview))}</span>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setShowCierre(false)}>Cancelar</button>
              <button className="adm-btn adm-btn-danger" onClick={procesarCierre} disabled={subCierre}>
                {subCierre ? "Procesando..." : "Procesar corte y cerrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
