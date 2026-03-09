import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../services/api";

const IconX       = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconEdit    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconPlus    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconWarning = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

const cargar = async () => {
    setLoading(true);
    try {
      const [vRes, pRes] = await Promise.all([
        api.get("/admin/inventario"),
        api.get("/admin/productos"),
      ]);
      setVariantes(vRes.data || []);
      setProductos(pRes.data || []);
    } catch (error) {
      setVariantes([]);
      setProductos([]);
      setAlert({ type: "error", msg: "Error de conexión al cargar el inventario." });
    } finally {
      setLoading(false);
    }
  };

const TALLAS     = ["XS","S","M","L","XL","XXL","UN","28","30","32","34","36"];
const EMPTY_FORM = { producto_id: "", talla: "", color: "", sku: "", precio: "", stock: "0", stock_apartado: "0" };

export default function AdminInventario() {
  const [variantes,   setVariantes]   = useState([]);
  const [productos,   setProductos]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(false);
  const [editando,    setEditando]    = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [errors,      setErrors]      = useState({});
  const [alert,       setAlert]       = useState(null);
  const [ajusteModal, setAjusteModal] = useState(null);
  const [ajusteVal,   setAjusteVal]   = useState("");

  const cargar = async () => {
    setLoading(true);
    try {
      const [vRes, pRes] = await Promise.all([
        api.get("/admin/inventario"),
        api.get("/admin/productos"),
      ]);
      setVariantes(vRes.data || []);
      setProductos(pRes.data || []);
    } catch {
      setVariantes(DEMO_INV);
      setProductos(DEMO_PRODUCTOS);
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

  // ── SKU automático ────────────────────────────────────────
  useEffect(() => {
    if (!editando && form.producto_id && form.talla && form.color) {
      const prod      = productos.find(p => p.id === parseInt(form.producto_id));
      const initials  = prod
        ? prod.nombre.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
        : "XX";
      const colorCode = form.color.toUpperCase().slice(0, 2);
      const sku       = `DTE-${initials}-${String(form.producto_id).padStart(3,"0")}-${form.talla}-${colorCode}`;
      setForm(f => ({ ...f, sku }));
    }
  }, [form.producto_id, form.talla, form.color, editando]);

  const validate = () => {
    const e = {};
    if (!form.producto_id)                              e.producto_id = "Selecciona un producto";
    if (!form.talla.trim())                             e.talla       = "La talla es obligatoria";
    if (!form.color.trim())                             e.color       = "El color es obligatorio";
    if (!form.precio || Number(form.precio) <= 0)       e.precio      = "Precio válido requerido";
    if (form.stock === "" || Number(form.stock) < 0)    e.stock       = "Stock no puede ser negativo";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openCreate = () => {
    setEditando(null); setForm(EMPTY_FORM); setErrors({}); setModal(true);
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
      producto_id:    parseInt(form.producto_id),
      precio:         parseFloat(form.precio),
      stock:          parseInt(form.stock),
      stock_apartado: parseInt(form.stock_apartado) || 0,
    };
    try {
      if (editando) {
        await api.put(`/admin/inventario/${editando.id}`, payload);
        setAlert({ type: "success", msg: "Variante actualizada." });
      } else {
        await api.post("/admin/inventario", payload);
        setAlert({ type: "success", msg: "Variante añadida al inventario." });
      }
      setModal(false);
      cargar();
    } catch (err) {
      setAlert({ type: "error", msg: err.response?.data?.message || "Error al guardar." });
    }
  };

  const handleAjuste = async () => {
    const nuevo = parseInt(ajusteVal);
    if (isNaN(nuevo) || nuevo < 0) return;
    try {
      await api.put(`/admin/inventario/${ajusteModal.id}`, { ...ajusteModal, stock: nuevo });
      setAlert({ type: "success", msg: "Stock actualizado." });
      setAjusteModal(null);
      cargar();
    } catch {
      setAlert({ type: "error", msg: "Error al actualizar stock." });
    }
  };

  const handleChange = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }));
  };

  const stockStatus = (v) => {
    const disponible = v.stock - (v.stock_apartado || 0);
    if (disponible <= 0) return { label: "Sin stock",   cls: "adm-badge-red",    pct: 0  };
    if (disponible <= 3) return { label: "Stock bajo",  cls: "adm-badge-yellow", pct: 25 };
    if (disponible <= 8) return { label: "Stock medio", cls: "adm-badge-blue",   pct: 60 };
    return                      { label: "Stock normal",cls: "adm-badge-green",  pct: 100};
  };

  const fmt       = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
  const sinStock  = variantes.filter(v => (v.stock - (v.stock_apartado || 0)) <= 0).length;
  const stockBajo = variantes.filter(v => { const d = v.stock-(v.stock_apartado||0); return d > 0 && d <= 3; }).length;

  const colorDot = (color) => {
    const map = { negro:"#111", blanco:"#eee", azul:"#3b82f6", rojo:"#ef4444", caqui:"#b5a07a", verde:"#10b981", gris:"#6b7280" };
    return map[color.toLowerCase()] || "#8b949e";
  };

  return (
    <AdminLayout pageTitle="Inventario (Base)" breadcrumb="Inventario">

      {alert && (
        <div className={`adm-alert ${alert.type === "success" ? "adm-alert-success" : "adm-alert-error"}`}>
          {alert.type === "success" ? "✓" : "✕"} {alert.msg}
        </div>
      )}

      {/* Resumen */}
      <div className="adm-stats-grid" style={{ marginBottom: 20 }}>
        {[
          { label: "Variantes totales",  value: variantes.length,                color: "blue",   icon: "📦" },
          { label: "Sin stock",          value: sinStock,                         color: "red",    icon: "⛔" },
          { label: "Stock bajo (≤ 3)",   value: stockBajo,                        color: "yellow", icon: "⚠️" },
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

      {/* Header tabla */}
      <div className="adm-section-header">
        <h3 className="adm-section-title">Variantes de inventario</h3>
        <button className="adm-btn adm-btn-primary" onClick={openCreate}>
          <IconPlus /> Nueva variante
        </button>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="adm-empty"><p>Cargando inventario...</p></div>
      ) : variantes.length === 0 ? (
        <div className="adm-empty">
          <div className="adm-empty-icon">📦</div>
          <p>No hay variantes. Añade tallas y colores para controlar tu stock.</p>
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
                <th>Apartado</th>
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
                      <span className="adm-badge adm-badge-gray" style={{ fontFamily: "monospace" }}>
                        {v.talla}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <div style={{
                          width: 12, height: 12, borderRadius: "50%",
                          background: colorDot(v.color),
                          border: "1px solid rgba(255,255,255,.2)",
                          flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 12 }}>{v.color}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-muted,#8b949e)" }}>
                      {v.sku}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>
                      {fmt(v.precio)}
                    </td>
                    <td style={{ minWidth: 130 }}>
                      <div className="adm-stock-bar-wrap">
                        <div className="adm-stock-bar">
                          <div
                            className={`adm-stock-fill ${status.pct >= 60 ? "high" : status.pct >= 25 ? "medium" : "low"}`}
                            style={{ width: `${Math.min(status.pct, 100)}%` }}
                          />
                        </div>
                        <span className="adm-stock-num" style={{
                          color: disponible <= 0 ? "#ef4444" : disponible <= 3 ? "#f59e0b" : "#fff"
                        }}>
                          {disponible}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: "var(--text-muted,#8b949e)", fontSize: 12 }}>
                      {v.stock_apartado || 0}
                    </td>
                    <td>
                      <span className={`adm-badge ${status.cls}`}>
                        {disponible <= 0 && <IconWarning />}
                        {status.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="adm-btn adm-btn-ghost adm-btn-sm"
                          onClick={() => { setAjusteModal(v); setAjusteVal(String(v.stock)); }}
                          title="Ajuste rápido de stock"
                          style={{ fontSize: 11 }}
                        >
                          Stock
                        </button>
                        <button
                          className="adm-btn adm-btn-ghost adm-btn-sm"
                          onClick={() => openEdit(v)}
                          title="Editar variante"
                        >
                          <IconEdit />
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

      {/* ── Modal Crear / Editar variante ────────────────── */}
      {modal && (
        <div className="adm-modal-overlay" onClick={() => setModal(false)}>
          <div className="adm-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">
                {editando ? "Editar variante" : "Nueva variante de inventario"}
              </h3>
              <button className="adm-modal-close" onClick={() => setModal(false)}>
                <IconX />
              </button>
            </div>
            <div className="adm-modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>

              {/* Producto */}
              <div className="adm-form-group">
                <label>Producto *</label>
                <select
                  className={`adm-select ${errors.producto_id ? "adm-input-error" : ""}`}
                  value={form.producto_id}
                  onChange={e => handleChange("producto_id", e.target.value)}
                  disabled={!!editando}
                >
                  <option value="">— Selecciona un producto —</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                {errors.producto_id && <p className="adm-error-text">{errors.producto_id}</p>}
              </div>

              {/* Talla / Color */}
              <div className="adm-form-row">
                <div className="adm-form-group" style={{ margin: 0 }}>
                  <label>Talla *</label>
                  <select
                    className={`adm-select ${errors.talla ? "adm-input-error" : ""}`}
                    value={form.talla}
                    onChange={e => handleChange("talla", e.target.value)}
                  >
                    <option value="">— Talla —</option>
                    {TALLAS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors.talla && <p className="adm-error-text">{errors.talla}</p>}
                </div>
                <div className="adm-form-group" style={{ margin: 0 }}>
                  <label>Color *</label>
                  <input
                    className={`adm-input ${errors.color ? "adm-input-error" : ""}`}
                    placeholder="Ej: Negro, Blanco, Azul..."
                    value={form.color}
                    onChange={e => handleChange("color", e.target.value)}
                  />
                  {errors.color && <p className="adm-error-text">{errors.color}</p>}
                </div>
              </div>

              {/* SKU */}
              <div className="adm-form-group" style={{ marginTop: "14px" }}>
                <label>
                  SKU{" "}
                  <span style={{ fontWeight: 400, textTransform: "none" }}>
                    (se genera automáticamente)
                  </span>
                </label>
                <input
                  className="adm-input"
                  value={form.sku}
                  onChange={e => handleChange("sku", e.target.value.toUpperCase())}
                  style={{ fontFamily: "monospace", letterSpacing: "1px" }}
                />
              </div>

              {/* Precio / Stock */}
              <div className="adm-form-row">
                <div className="adm-form-group" style={{ margin: 0 }}>
                  <label>Precio (MXN) *</label>
                  <input
                    className={`adm-input ${errors.precio ? "adm-input-error" : ""}`}
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={form.precio}
                    onChange={e => handleChange("precio", e.target.value)}
                  />
                  {errors.precio && <p className="adm-error-text">{errors.precio}</p>}
                </div>
                <div className="adm-form-group" style={{ margin: 0 }}>
                  <label>Stock inicial *</label>
                  <input
                    className={`adm-input ${errors.stock ? "adm-input-error" : ""}`}
                    type="number" min="0" step="1" placeholder="0"
                    value={form.stock}
                    onChange={e => handleChange("stock", e.target.value)}
                  />
                  {errors.stock && <p className="adm-error-text">{errors.stock}</p>}
                </div>
              </div>

            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setModal(false)}>
                Cancelar
              </button>
              <button className="adm-btn adm-btn-primary" onClick={handleGuardar}>
                {editando ? "Guardar cambios" : "Añadir al inventario"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Ajuste rápido de stock ─────────────────── */}
      {ajusteModal && (
        <div className="adm-modal-overlay" onClick={() => setAjusteModal(null)}>
          <div className="adm-modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">Ajuste rápido de stock</h3>
              <button className="adm-modal-close" onClick={() => setAjusteModal(null)}>
                <IconX />
              </button>
            </div>
            <div className="adm-modal-body">
              <p style={{ fontSize: "12px", color: "var(--text-muted,#8b949e)", marginBottom: "14px", lineHeight: 1.5 }}>
                <strong style={{ color: "#fff" }}>{ajusteModal.producto_nombre}</strong>
                {" · "}{ajusteModal.talla} · {ajusteModal.color}
              </p>
              <div className="adm-form-group">
                <label>Nuevo stock total</label>
                <input
                  className="adm-input"
                  type="number" min="0"
                  value={ajusteVal}
                  onChange={e => setAjusteVal(e.target.value)}
                  autoFocus
                  style={{ fontSize: "22px", fontFamily: "monospace", textAlign: "center" }}
                />
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setAjusteModal(null)}>
                Cancelar
              </button>
              <button className="adm-btn adm-btn-primary" onClick={handleAjuste}>
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}