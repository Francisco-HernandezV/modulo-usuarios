import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../services/api";
import "../../styles/theme.css";

const IconX        = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconEdit     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconWarning  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconTrash    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const IconDownload = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;

const EMPTY_FORM = { producto_id: "", talla: "", color: "", sku: "", precio: "", stock: "0", stock_apartado: "0" };

const getStockFillClass = (pct) => {
  if (pct >= 60) return "high";
  if (pct >= 25) return "medium";
  return "low";
};

const getAlertClass = (type) => type === "success" ? "adm-alert-success" : "adm-alert-error";
const getAlertIcon = (type) => type === "success" ? "✓" : "✕";

export default function AdminInventario() {
  const [variantes,   setVariantes]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(false);
  const [editando,    setEditando]    = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [errors,      setErrors]      = useState({});
  const [alert,       setAlert]       = useState(null);
  const [ajusteModal, setAjusteModal] = useState(null);
  const [ajusteVal,   setAjusteVal]   = useState("");
  const [confirmDel,  setConfirmDel]  = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/inventario");
      setVariantes(res.data || []);
    } catch {
      setVariantes([]);
      setAlert({ type: "error", msg: "Error al cargar inventario" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 3500);
    return () => clearTimeout(t);
  }, [alert]);

  const validate = () => {
    const e = {};
    if (!form.precio || Number(form.precio) < 0) e.precio = "Precio inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openEdit = (v) => {
    setEditando(v);
    setForm({
      producto_id:    v.producto_id,
      talla:          v.talla,
      color:          v.color,
      sku:            v.sku,
      precio:         v.precio,
      stock:          v.stock,
      stock_apartado: v.stock_apartado,
    });
    setErrors({});
    setModal(true);
  };

  const handleGuardar = async () => {
    if (!validate()) return;
    const payload = {
      ...form,
      producto_id:    Number.parseInt(form.producto_id, 10),
      precio:         Number.parseFloat(form.precio),
      stock:          Number.parseInt(form.stock, 10),
      stock_apartado: Number.parseInt(form.stock_apartado, 10) || 0,
    };
    try {
      if (editando) {
        await api.put(`/admin/inventario/${editando.id}`, payload);
        setAlert({ type: "success", msg: "Variante actualizada." });
      }
      setModal(false);
      cargar();
    } catch (err) {
      setAlert({ type: "error", msg: err.response?.data?.message || "Error al guardar." });
    }
  };

  const handleAjuste = async () => {
    const nuevo = Number.parseInt(ajusteVal, 10);
    if (Number.isNaN(Number(nuevo)) || nuevo < 0) {
      setAlert({ type: "error", msg: "Cantidad inválida" });
      return;
    }
    try {
      await api.put(`/admin/inventario/${ajusteModal.id}`, { ...ajusteModal, stock: nuevo });
      setAlert({ type: "success", msg: "Stock actualizado." });
      setAjusteModal(null);
      cargar();
    } catch {
      setAlert({ type: "error", msg: "Error al actualizar stock." });
    }
  };

  const handleEliminarConfirmado = async () => {
    if (!confirmDel) return;
    try {
      await api.delete(`/admin/inventario/${confirmDel}`);
      setAlert({ type: "success", msg: "Variante eliminada correctamente." });
      setConfirmDel(null);
      cargar();
    } catch (error) {
      setAlert({ type: "error", msg: error.response?.data?.message || "Error al eliminar variante." });
      setConfirmDel(null);
    }
  };

  const handleChange = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }));
  };

  // 🔥 VALIDACIÓN DE PRECIO (2 Decimales)
  const handlePrecioChange = (e) => {
    let val = e.target.value;
    if (val === '' || /^\d+(\.\d{0,2})?$/.test(val)) {
      handleChange("precio", val);
    }
  };

  // 🔥 VALIDACIÓN DE STOCK (Enteros, sin decimales)
  const handleStockAjusteChange = (e) => {
    let val = e.target.value;
    if (val === '' || /^\d+$/.test(val)) {
      setAjusteVal(val);
    }
  };

  // 🔥 BLOQUEO DE TECLAS INVÁLIDAS
  const blockInvalidChars = (e) => {
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault();
    }
  };
  const blockInvalidCharsInt = (e) => {
    if (['e', 'E', '+', '-', '.'].includes(e.key)) {
      e.preventDefault();
    }
  };

  // 🔥 FUNCIÓN DE EXPORTACIÓN A EXCEL
  const exportarExcel = () => {
    api.get('/admin/inventario/exportar', { responseType: 'blob' })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Inventario_DanElement.xlsx');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch((error) => {
        console.error("Error exportando excel:", error);
        alert("Error al generar el reporte de inventario.");
      });
  };

  const stockStatus = (v) => {
    const disponible = v.stock - (v.stock_apartado || 0);
    if (disponible <= 0) return { label: "Sin stock",   cls: "adm-badge-red",    pct: 0  };
    if (disponible <= 3) return { label: "Stock bajo",  cls: "adm-badge-yellow", pct: 25 };
    if (disponible <= 8) return { label: "Stock medio", cls: "adm-badge-blue",    pct: 60 };
    return                      { label: "Stock normal",cls: "adm-badge-green",  pct: 100};
  };

  const fmt         = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
  const sinStock    = variantes.filter(v => (v.stock - (v.stock_apartado || 0)) <= 0).length;
  const stockBajo   = variantes.filter(v => { const d = v.stock-(v.stock_apartado||0); return d > 0 && d <= 3; }).length;

  return (
    <AdminLayout pageTitle="Inventario (Base)" breadcrumb="Inventario">
      {alert && (
        <div className={`adm-alert ${getAlertClass(alert.type)}`}>
          {getAlertIcon(alert.type)} {alert.msg}
        </div>
      )}
      <div className="adm-stats-grid" style={{ marginBottom: 20 }}>
        {[
          { label: "Variantes totales",  value: variantes.length,                color: "blue",   icon: "📦" },
          { label: "Sin stock",          value: sinStock,                        color: "red",    icon: "⛔" },
          { label: "Stock bajo (≤ 3)",   value: stockBajo,                       color: "yellow", icon: "⚠️" },
          { label: "En operación",       value: variantes.length - sinStock,      color: "green",  icon: "✅" },
        ].map(s => (
          <div key={s.label} className="adm-stat-card">
            <div className={`adm-stat-icon ${s.color}`}>{s.icon}</div>
            <div>
              <div className="adm-stat-value">{loading ? "—" : s.value}</div>
              <div className="adm-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="adm-section-header" style={{ alignItems: "flex-end", marginBottom: "20px" }}>
        <div>
          <h3 className="adm-section-title">Variantes de inventario</h3>
          <p style={{ color: "#9ca3af", fontSize: "0.85rem", margin: 0 }}>Gestiona existencias y precios. Los nuevos productos se añaden desde el Creador de Productos.</p>
        </div>
        <button className="adm-btn adm-btn-ghost" onClick={exportarExcel} type="button">
          <IconDownload /> Exportar Inventario
        </button>
      </div>

      {loading ? (
        <div className="adm-empty"><p>Cargando inventario...</p></div>
      ) : variantes.length === 0 ? (
        <div className="adm-empty">
          <div className="adm-empty-icon">📦</div>
          <p>No hay variantes en el inventario. Ve a la sección de Productos para crear uno.</p>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Talla</th>
                <th>Color</th>
                <th>SKU</th>
                <th>Precio</th>
                <th>Disponible</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {variantes.map(v => {
                const status     = stockStatus(v);
                const disponible = v.stock - (v.stock_apartado || 0);
                return (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{v.producto_nombre}</td>
                    <td>
                      <span className="adm-badge adm-badge-gray" style={{ fontFamily: "monospace" }}>{v.talla}</span>
                    </td>
                    <td><span style={{ fontSize: 12 }}>{v.color}</span></td>
                    <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-muted,#8b949e)" }}>{v.sku}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>{fmt(v.precio)}</td>
                    <td style={{ minWidth: 130 }}>
                      <div className="adm-stock-bar-wrap">
                        <div className="adm-stock-bar">
                          <div className={`adm-stock-fill ${getStockFillClass(status.pct)}`} style={{ width: `${Math.min(status.pct, 100)}%` }} />
                        </div>
                        <span className="adm-stock-num" style={{ color: disponible <= 0 ? "#ef4444" : disponible <= 3 ? "#f59e0b" : "#fff" }}>
                          {disponible}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`adm-badge ${status.cls}`}>
                        {disponible <= 0 && <IconWarning />}
                        {status.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => { setAjusteModal(v); setAjusteVal(String(v.stock)); }} title="Ajuste rápido de stock" style={{ fontSize: 11, padding: "6px 10px" }} type="button">
                          Stock
                        </button>
                        <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => openEdit(v)} title="Editar precio/SKU" type="button" style={{ padding: "6px 10px" }}>
                          <IconEdit />
                        </button>
                        <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setConfirmDel(v.id)} title="Eliminar variante" type="button" style={{ padding: "6px 10px" }}>
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Edición de Variante */}
      {modal && (
        <div className="adm-modal-overlay" onClick={() => setModal(false)}>
          <div className="adm-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">Editar Detalles de Variante</h3>
              <button className="adm-modal-close" onClick={() => setModal(false)} type="button"><IconX /></button>
            </div>
            <div className="adm-modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <div className="adm-form-group" style={{ marginTop: "14px" }}>
                <label htmlFor="inv_sku">SKU</label>
                <input id="inv_sku" className="adm-input" value={form.sku} onChange={e => handleChange("sku", e.target.value.toUpperCase())} style={{ fontFamily: "monospace", letterSpacing: "1px" }} />
              </div>
              <div className="adm-form-row">
                <div className="adm-form-group" style={{ margin: 0 }}>
                  <label htmlFor="inv_precio">Precio de Venta (MXN) *</label>
                  <input
                    id="inv_precio"
                    className={`adm-input ${errors.precio ? "adm-input-error" : ""}`}
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={form.precio}
                    onChange={handlePrecioChange}
                    onKeyDown={blockInvalidChars}
                  />
                  {errors.precio && <p className="adm-error-text">{errors.precio}</p>}
                </div>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setModal(false)} type="button">Cancelar</button>
              <button className="adm-btn adm-btn-primary" onClick={handleGuardar} type="button" disabled={!form.precio}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ajuste de Stock */}
      {ajusteModal && (
        <div className="adm-modal-overlay" onClick={() => setAjusteModal(null)}>
          <div className="adm-modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">Ajuste rápido de stock</h3>
              <button className="adm-modal-close" onClick={() => setAjusteModal(null)} type="button"><IconX /></button>
            </div>
            <div className="adm-modal-body">
              <p style={{ fontSize: "12px", color: "var(--text-muted,#8b949e)", marginBottom: "14px", lineHeight: 1.5 }}>
                <strong style={{ color: "#fff" }}>{ajusteModal.producto_nombre}</strong>
                {" · "}{ajusteModal.talla} · {ajusteModal.color}
              </p>
              <div className="adm-form-group">
                <label htmlFor="ajuste_stock">Nuevo stock total</label>
                <input
                  id="ajuste_stock"
                  className="adm-input"
                  type="number" min="0" step="1"
                  value={ajusteVal}
                  onChange={handleStockAjusteChange}
                  onKeyDown={blockInvalidCharsInt}
                  autoFocus
                  style={{ fontSize: "22px", fontFamily: "monospace", textAlign: "center" }}
                />
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setAjusteModal(null)} type="button">Cancelar</button>
              <button className="adm-btn adm-btn-primary" onClick={handleAjuste} type="button" disabled={ajusteVal === ""}>Actualizar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {confirmDel && (
        <div className="adm-modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="adm-modal" style={{ maxWidth: "380px" }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">Confirmar eliminación</h3>
              <button className="adm-modal-close" onClick={() => setConfirmDel(null)} type="button"><IconX /></button>
            </div>
            <div className="adm-modal-body">
              <p style={{ fontSize: "14px", color: "#9ca3af", lineHeight: 1.6, marginBottom: "20px" }}>
                ¿Estás seguro de eliminar esta variante del inventario? Esta acción no se puede deshacer.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button className="adm-btn adm-btn-ghost" onClick={() => setConfirmDel(null)}>Cancelar</button>
                <button className="adm-btn adm-btn-danger" onClick={handleEliminarConfirmado}>Sí, eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}