import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../services/api";
import "../../styles/theme.css";

// ── ÍCONOS ──
const IconPlus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconArrowRight = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const IconArrowLeft = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconEdit = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;

export default function AdminProductos() {
  const [vistaActiva, setVistaActiva] = useState("lista"); // 'lista' o 'wizard'
  
  // ── ESTADOS DE DATOS ──
  const [productos, setProductos] = useState([]);
  const [catalogos, setCatalogos] = useState({
    marcas: [], departamentos: [], categorias: [], colores: [], tallas: [], tiposTalla: []
  });

  const [confirmDel, setConfirmDel] = useState(null); // ID del producto a eliminar

  // ── ESTADOS DEL WIZARD ──
  const [paso, setPaso] = useState(1);
  const [form, setForm] = useState({
    nombre: "", descripcion: "", precio_base: "", marca_id: "", departamento_id: "", categoria_id: "", activo: true
  });
  const [tipoTallaSeleccionado, setTipoTallaSeleccionado] = useState(""); // 🔥 Filtro para el Paso 2
  const [tallasSeleccionadas, setTallasSeleccionadas] = useState([]); 
  const [coloresSeleccionados, setColoresSeleccionados] = useState([]); 
  const [matriz, setMatriz] = useState({}); 

  useEffect(() => {
    cargarProductos();
    cargarCatalogos();
  }, []);

  const cargarProductos = async () => {
    try {
      const res = await api.get("/admin/productos");
      setProductos(res.data);
    } catch (error) { console.error("Error cargando productos", error); }
  };

  const cargarCatalogos = async () => {
    try {
      const [resMarcas, resDeptos, resCats, resColores, resTallas, resTiposTalla] = await Promise.all([
        api.get("/admin/marcas"), 
        api.get("/admin/departamentos"), 
        api.get("/admin/categorias"), 
        api.get("/admin/colores"), 
        api.get("/admin/tallas"),
        api.get("/admin/tipos-talla") // 🔥 Cargamos los tipos de talla
      ]);
      setCatalogos({
        marcas: resMarcas.data.filter(m => m.activo), 
        departamentos: resDeptos.data.filter(d => d.activo),
        categorias: resCats.data.filter(c => c.activo), 
        colores: resColores.data.filter(c => c.activo), 
        tallas: resTallas.data,
        tiposTalla: resTiposTalla.data
      });
    } catch (error) { console.error("Error cargando catálogos", error); }
  };

  // ── ACCIONES DE TABLA ──
  const handleEliminarConfirmado = async () => {
    if (!confirmDel) return;
    try {
      await api.delete(`/admin/productos/${confirmDel}`);
      setConfirmDel(null);
      cargarProductos();
    } catch (error) {
      alert(error.response?.data?.message || "Error al eliminar producto.");
      setConfirmDel(null);
    }
  };

  // ── LÓGICA DEL WIZARD ──
  const handleNext = () => setPaso(p => Math.min(p + 1, 4));
  const handlePrev = () => setPaso(p => Math.max(p - 1, 1));

  const handleCambioTipoTalla = (e) => {
    setTipoTallaSeleccionado(e.target.value);
    setTallasSeleccionadas([]); // Limpiamos selecciones si cambian el tipo
    setMatriz({}); 
  };

  const toggleTalla = (id) => {
    setTallasSeleccionadas(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const toggleColor = (id) => {
    setColoresSeleccionados(prev => {
      const nuevos = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id];
      const nuevaMatriz = { ...matriz };
      if (!prev.includes(id)) {
        tallasSeleccionadas.forEach(tallaId => { nuevaMatriz[`${id}-${tallaId}`] = true; });
      }
      setMatriz(nuevaMatriz);
      return nuevos;
    });
  };

  const toggleMatriz = (colorId, tallaId) => {
    const key = `${colorId}-${tallaId}`;
    setMatriz(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const iniciarNuevoProducto = () => {
    setForm({ nombre: "", descripcion: "", precio_base: "", marca_id: "", departamento_id: "", categoria_id: "", activo: true });
    setTipoTallaSeleccionado("");
    setTallasSeleccionadas([]); setColoresSeleccionados([]); setMatriz({}); setPaso(1);
    setVistaActiva("wizard");
  };

  const handleCrearProducto = async () => {
    try {
      const payload = { ...form, matriz };
      await api.post("/admin/productos/completo", payload);
      setVistaActiva("lista");
      cargarProductos();
    } catch (error) {
      alert(error.response?.data?.message || "Ocurrió un error al crear el producto.");
      console.error(error);
    }
  };

  const inputStyle = { width: "100%", padding: "12px", borderRadius: "6px", border: "1px solid #374151", background: "#111827", color: "white", outline: "none" };

  return (
    <AdminLayout pageTitle="Catálogo de Productos" breadcrumb="Productos">
      
      {/* ── VISTA PRINCIPAL (TABLA) ── */}
      {vistaActiva === "lista" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
            <h3 style={{ color: "white", margin: 0 }}>Productos ({productos.length})</h3>
            <button className="adm-btn adm-btn-primary" onClick={iniciarNuevoProducto}>
              <IconPlus /> Nuevo producto
            </button>
          </div>

          {productos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <div style={{ fontSize: "48px", marginBottom: "15px", opacity: 0.5 }}>👗</div>
              <p style={{ color: "#9ca3af", fontSize: "16px" }}>No hay productos. ¡Añade el primero!</p>
            </div>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr style={{ background: "#1f2937", borderBottom: "1px solid #374151" }}>
                    <th style={{ padding: "15px", color: "#d1d5db" }}>#</th>
                    <th style={{ padding: "15px", color: "#d1d5db" }}>NOMBRE</th>
                    <th style={{ padding: "15px", color: "#d1d5db" }}>CATEGORÍA</th>
                    <th style={{ padding: "15px", color: "#d1d5db" }}>PRECIO</th>
                    <th style={{ padding: "15px", color: "#d1d5db", textAlign: "center" }}>ESTADO</th>
                    <th style={{ padding: "15px", color: "#d1d5db", textAlign: "right" }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((p, idx) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid #374151" }}>
                      <td style={{ padding: "15px", color: "#8b949e" }}>{idx + 1}</td>
                      <td style={{ padding: "15px", fontWeight: "bold", color: "white" }}>{p.nombre}</td>
                      <td style={{ padding: "15px" }}>
                        <span className="adm-badge adm-badge-blue" style={{ textTransform: "capitalize" }}>
                          {p.categoria_nombre || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "15px", fontFamily: "monospace", fontWeight: "bold", fontSize: "14px", color: "white" }}>
                        ${Number(p.precio_base).toFixed(2)}
                      </td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <span className={`adm-badge ${p.activo ? "adm-badge-green" : "adm-badge-gray"}`}>
                          {p.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td style={{ padding: "15px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button className="adm-btn adm-btn-ghost adm-btn-sm" title="Editar producto" onClick={() => alert("Próximamente edición.")} type="button">
                            <IconEdit />
                          </button>
                          <button className="adm-btn adm-btn-danger adm-btn-sm" title="Eliminar producto" onClick={() => setConfirmDel(p.id)} type="button">
                            <IconTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── MODAL FLOTANTE DE CONFIRMACIÓN ── */}
      {confirmDel && (
        <div className="adm-modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="adm-modal" style={{ maxWidth: "380px" }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">Confirmar eliminación</h3>
              <button className="adm-modal-close" onClick={() => setConfirmDel(null)} type="button"><IconX /></button>
            </div>
            <div className="adm-modal-body">
              <p style={{ fontSize: "14px", color: "#9ca3af", lineHeight: 1.6, marginBottom: "20px" }}>
                ¿Seguro que deseas eliminar este producto? Esta acción también eliminará sus variantes de inventario.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button className="adm-btn adm-btn-ghost" onClick={() => setConfirmDel(null)}>Cancelar</button>
                <button className="adm-btn adm-btn-danger" onClick={handleEliminarConfirmado}>Sí, eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VISTA DEL WIZARD ── */}
      {vistaActiva === "wizard" && (
        <div style={{ maxWidth: "800px", margin: "0 auto", background: "#111827", borderRadius: "12px", border: "1px solid #374151", padding: "30px" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "1px solid #374151", paddingBottom: "20px" }}>
            <h2 style={{ color: "white", margin: 0, fontSize: "20px" }}>Nuevo Producto</h2>
            <button className="adm-btn adm-btn-ghost" onClick={() => setVistaActiva("lista")}><IconX /> Cancelar</button>
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "40px" }}>
            {["Información", "Tallas", "Colores", "Resumen"].map((label, idx) => (
              <div key={label} style={{ flex: 1, borderBottom: `4px solid ${paso >= idx + 1 ? "#3b82f6" : "#374151"}`, paddingBottom: "10px", color: paso >= idx + 1 ? "white" : "#9ca3af", fontWeight: "bold", fontSize: "14px", transition: "all 0.3s" }}>
                {idx + 1}. {label}
              </div>
            ))}
          </div>

          {/* PASO 1 */}
          {paso === 1 && (
            <div className="wizard-step">
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
                <div><label style={{ display: "block", marginBottom: "8px", color: "#d1d5db" }}>Nombre del Producto *</label><input type="text" placeholder="Ej. Playera Urban Drop" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} style={inputStyle} /></div>
                <div><label style={{ display: "block", marginBottom: "8px", color: "#d1d5db" }}>Descripción</label><textarea placeholder="Ej. Playera 100% algodón..." value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} style={{...inputStyle, minHeight: "80px"}} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div><label style={{ display: "block", marginBottom: "8px", color: "#d1d5db" }}>Precio de Venta ($) *</label><input type="number" placeholder="0.00" value={form.precio_base} onChange={e => setForm({...form, precio_base: e.target.value})} style={inputStyle} /></div>
                  <div><label style={{ display: "block", marginBottom: "8px", color: "#d1d5db" }}>Marca *</label><select value={form.marca_id} onChange={e => setForm({...form, marca_id: e.target.value})} style={inputStyle}><option value="">Seleccionar marca</option>{catalogos.marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div><label style={{ display: "block", marginBottom: "8px", color: "#d1d5db" }}>Departamento *</label><select value={form.departamento_id} onChange={e => setForm({...form, departamento_id: e.target.value})} style={inputStyle}><option value="">Seleccionar departamento</option>{catalogos.departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}</select></div>
                  <div><label style={{ display: "block", marginBottom: "8px", color: "#d1d5db" }}>Categoría *</label><select value={form.categoria_id} onChange={e => setForm({...form, categoria_id: e.target.value})} style={inputStyle}><option value="">Seleccionar categoría</option>{catalogos.categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                </div>
              </div>
              <div style={{ marginTop: "30px", display: "flex", justifyContent: "flex-end" }}>
                <button className="adm-btn adm-btn-primary" onClick={handleNext} disabled={!form.nombre || !form.precio_base}>Siguiente: Tallas <IconArrowRight /></button>
              </div>
            </div>
          )}

          {/* PASO 2 */}
          {paso === 2 && (
            <div className="wizard-step">
              <p style={{ color: "#9ca3af", marginBottom: "20px" }}>Primero selecciona la clasificación y luego marca las tallas disponibles.</p>
              
              {/* 🔥 FILTRO POR TIPO DE TALLA */}
              <div style={{ marginBottom: "30px" }}>
                <label style={{ display: "block", marginBottom: "8px", color: "#d1d5db", fontWeight: "bold" }}>Clasificación de Talla *</label>
                <select value={tipoTallaSeleccionado} onChange={handleCambioTipoTalla} style={inputStyle}>
                  <option value="">— Selecciona un tipo (Ej. Letras, Pantalón) —</option>
                  {catalogos.tiposTalla.map(tt => <option key={tt.id} value={tt.id}>{tt.nombre}</option>)}
                </select>
              </div>

              {/* BOTONES DE TALLAS FILTRADAS */}
              {tipoTallaSeleccionado && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", padding: "20px", background: "#1f2937", borderRadius: "8px" }}>
                  {catalogos.tallas.filter(t => t.tipo_talla_id === Number(tipoTallaSeleccionado)).length === 0 ? (
                    <p style={{ color: "#9ca3af", margin: 0 }}>No hay tallas registradas para esta clasificación.</p>
                  ) : (
                    catalogos.tallas
                      .filter(t => t.tipo_talla_id === Number(tipoTallaSeleccionado))
                      .map(t => {
                        const isSelected = tallasSeleccionadas.includes(t.id);
                        return (
                          <button key={t.id} onClick={() => toggleTalla(t.id)} style={{ padding: "10px 20px", borderRadius: "8px", border: `1px solid ${isSelected ? "#3b82f6" : "#4b5563"}`, background: isSelected ? "#3b82f6" : "transparent", color: "white", cursor: "pointer", fontWeight: "bold" }}>
                            {t.valor}
                          </button>
                        );
                      })
                  )}
                </div>
              )}

              <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between" }}>
                <button className="adm-btn adm-btn-ghost" onClick={handlePrev}><IconArrowLeft /> Regresar</button>
                <button className="adm-btn adm-btn-primary" onClick={handleNext} disabled={tallasSeleccionadas.length === 0}>Siguiente: Colores <IconArrowRight /></button>
              </div>
            </div>
          )}

          {/* PASO 3 */}
          {paso === 3 && (
            <div className="wizard-step">
              <p style={{ color: "#9ca3af", marginBottom: "20px" }}>Selecciona los colores y marca en la matriz qué combinaciones llegaron.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "30px", padding: "20px", background: "#1f2937", borderRadius: "8px" }}>
                {catalogos.colores.map(c => {
                  const isSelected = coloresSeleccionados.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => toggleColor(c.id)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "20px", border: `1px solid ${isSelected ? "#3b82f6" : "#4b5563"}`, background: isSelected ? "rgba(59,130,246,0.1)" : "transparent", color: "white", cursor: "pointer" }}>
                      <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: c.codigo_hex }}></div>{c.nombre}
                    </button>
                  );
                })}
              </div>
              {coloresSeleccionados.length > 0 && (
                <div style={{ overflowX: "auto", border: "1px solid #374151", borderRadius: "8px" }}>
                  <table className="adm-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#1f2937" }}>
                        <th style={{ padding: "15px", textAlign: "left", color: "#d1d5db" }}>Color</th>
                        {catalogos.tallas.filter(t => tallasSeleccionadas.includes(t.id)).map(t => <th key={t.id} style={{ padding: "15px", textAlign: "center", color: "#d1d5db" }}>{t.valor}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {coloresSeleccionados.map(colorId => {
                        const color = catalogos.colores.find(c => c.id === colorId);
                        return (
                          <tr key={colorId} style={{ borderBottom: "1px solid #374151" }}>
                            <td style={{ padding: "15px", display: "flex", alignItems: "center", gap: "10px", color: "white" }}>
                              <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: color.codigo_hex }}></div>{color.nombre}
                            </td>
                            {catalogos.tallas.filter(t => tallasSeleccionadas.includes(t.id)).map(talla => {
                              const checked = matriz[`${colorId}-${talla.id}`];
                              return (
                                <td key={talla.id} style={{ padding: "15px", textAlign: "center" }}>
                                  <button onClick={() => toggleMatriz(colorId, talla.id)} style={{ width: "24px", height: "24px", borderRadius: "4px", cursor: "pointer", border: `1px solid ${checked ? "#3b82f6" : "#4b5563"}`, background: checked ? "#3b82f6" : "transparent", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    {checked && <IconCheck />}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between" }}>
                <button className="adm-btn adm-btn-ghost" onClick={handlePrev}><IconArrowLeft /> Regresar</button>
                <button className="adm-btn adm-btn-primary" onClick={handleNext} disabled={coloresSeleccionados.length === 0}>Siguiente: Resumen <IconArrowRight /></button>
              </div>
            </div>
          )}

          {/* PASO 4 */}
          {paso === 4 && (
            <div className="wizard-step">
              <div style={{ background: "#1f2937", padding: "30px", borderRadius: "12px", textAlign: "center" }}>
                <h2 style={{ color: "white", marginBottom: "10px" }}>Resumen de Creación</h2>
                <p style={{ color: "#9ca3af", marginBottom: "30px" }}>Estás a punto de crear el producto <strong>{form.nombre}</strong>.</p>
                <div style={{ display: "flex", justifyContent: "space-around", borderTop: "1px solid #374151", paddingTop: "20px" }}>
                  <div><p style={{ fontSize: "24px", fontWeight: "bold", color: "#3b82f6", margin: "0" }}>1</p><p style={{ color: "#9ca3af", fontSize: "14px", margin: "0" }}>Producto Padre</p></div>
                  <div><p style={{ fontSize: "24px", fontWeight: "bold", color: "white", margin: "0" }}>{tallasSeleccionadas.length}</p><p style={{ color: "#9ca3af", fontSize: "14px", margin: "0" }}>Tallas</p></div>
                  <div><p style={{ fontSize: "24px", fontWeight: "bold", color: "white", margin: "0" }}>{coloresSeleccionados.length}</p><p style={{ color: "#9ca3af", fontSize: "14px", margin: "0" }}>Colores</p></div>
                  <div><p style={{ fontSize: "24px", fontWeight: "bold", color: "#10b981", margin: "0" }}>{Object.values(matriz).filter(v => v).length}</p><p style={{ color: "#9ca3af", fontSize: "14px", margin: "0" }}>Variantes de Inventario</p></div>
                </div>
              </div>
              <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between" }}>
                <button className="adm-btn adm-btn-ghost" onClick={handlePrev}><IconArrowLeft /> Regresar</button>
                <button className="adm-btn adm-btn-primary" style={{ background: "#10b981", borderColor: "#10b981" }} onClick={handleCrearProducto}><IconCheck /> Crear Producto Definitivo</button>
              </div>
            </div>
          )}

        </div>
      )}
    </AdminLayout>
  );
}