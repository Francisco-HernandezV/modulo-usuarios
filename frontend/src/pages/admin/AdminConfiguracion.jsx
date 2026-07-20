import { useState, useEffect, useRef } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../services/api";

const IconImage = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const IconPin   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconPhone = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const IconShare = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
const IconSave  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;

const EMPTY_FORM = {
  nombre_tienda: "",
  ubicacion: "",
  maps_url: "",
  telefono_1: "",
  telefono_2: "",
  whatsapp: "",
  email_contacto: "",
  facebook: "",
  instagram: "",
  tiktok: "",
  twitter: "",
};

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB

const getAlertClass = (type) => (type === "success" ? "adm-alert-success" : "adm-alert-error");
const getAlertIcon = (type) => (type === "success" ? "✓" : "✕");

export default function AdminConfiguracion() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  const [logoActual, setLogoActual] = useState(null); // logo guardado en BD (data URI)
  const [logoFile, setLogoFile] = useState(null);     // archivo nuevo seleccionado
  const [logoPreview, setLogoPreview] = useState(null); // URL para previsualizar el nuevo archivo
  const [removeLogo, setRemoveLogo] = useState(false);
  const fileInputRef = useRef(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/configuracion");
      setForm({
        nombre_tienda: data.nombre_tienda || "",
        ubicacion: data.ubicacion || "",
        maps_url: data.maps_url || "",
        telefono_1: data.telefono_1 || "",
        telefono_2: data.telefono_2 || "",
        whatsapp: data.whatsapp || "",
        email_contacto: data.email_contacto || "",
        facebook: data.facebook || "",
        instagram: data.instagram || "",
        tiktok: data.tiktok || "",
        twitter: data.twitter || "",
      });
      setLogoActual(data.logo || null);
    } catch (error) {
      console.error("Error al cargar la configuración:", error);
      setAlert({ type: "error", msg: "No se pudo cargar la configuración." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  // Limpia el object URL de la previsualización al cambiarlo/desmontar.
  useEffect(() => {
    return () => { if (logoPreview) URL.revokeObjectURL(logoPreview); };
  }, [logoPreview]);

  const handleChange = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAlert({ type: "error", msg: "El logo debe ser una imagen (PNG, JPG, SVG…)." });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setAlert({ type: "error", msg: "La imagen supera el límite de 2 MB." });
      return;
    }
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setRemoveLogo(false);
  };

  const quitarLogo = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview(null);
    setLogoActual(null);
    setRemoveLogo(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGuardar = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ""));
      if (logoFile) fd.append("logo", logoFile);
      if (removeLogo) fd.append("remove_logo", "true");

      const { data } = await api.put("/admin/configuracion", fd);
      const cfg = data.configuracion || {};
      setLogoActual(cfg.logo || null);
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoPreview(null);
      setLogoFile(null);
      setRemoveLogo(false);
      setAlert({ type: "success", msg: "Configuración guardada correctamente." });
    } catch (error) {
      console.error("Error al guardar la configuración:", error);
      setAlert({ type: "error", msg: error.response?.data?.message || "Error al guardar." });
    } finally {
      setSaving(false);
    }
  };

  const logoMostrado = logoPreview || logoActual;

  return (
    <AdminLayout pageTitle="Configuración" breadcrumb="Configuración">
      {alert && (
        <div className={`adm-alert ${getAlertClass(alert.type)}`}>
          {getAlertIcon(alert.type)} {alert.msg}
        </div>
      )}

      {loading ? (
        <div className="adm-empty">
          <div className="spinner" style={{ margin: "0 auto 14px" }}></div>
          <p>Cargando configuración...</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "960px" }}>

          {/* ── IDENTIDAD / LOGO ── */}
          <section className="adm-stat-card" style={{ flexDirection: "column", alignItems: "stretch", gap: "18px", padding: "22px" }}>
            <div className="adm-section-title" style={{ display: "flex", alignItems: "center", gap: "8px", border: "none", paddingLeft: "0" }}>
              <IconImage /> Identidad de la tienda
            </div>

            <div style={{ display: "flex", gap: "22px", flexWrap: "wrap", alignItems: "flex-start" }}>
              {/* Preview del logo */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: 140, height: 140, borderRadius: "14px",
                  background: logoMostrado ? "#ffffff" : "rgba(255,255,255,0.03)",
                  border: "1px dashed var(--border-color, #30363d)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden", flexShrink: 0,
                }}>
                  {logoMostrado ? (
                    <img src={logoMostrado} alt="Logo de la tienda" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", padding: "10px" }} />
                  ) : (
                    <span style={{ fontSize: 34, opacity: 0.3 }}>🖼️</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => fileInputRef.current?.click()}>
                    Subir imagen
                  </button>
                  {logoMostrado && (
                    <button type="button" className="adm-btn adm-btn-danger adm-btn-sm" onClick={quitarLogo}>
                      Quitar
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
              </div>

              <div style={{ flex: 1, minWidth: 240 }}>
                <div className="adm-form-group">
                  <label htmlFor="cfg_nombre">Nombre de la tienda</label>
                  <input id="cfg_nombre" className="adm-input" value={form.nombre_tienda}
                    onChange={(e) => handleChange("nombre_tienda", e.target.value)} placeholder="Dan Element Boutique" maxLength={120} />
                </div>
                <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px", lineHeight: 1.5 }}>
                  El logo aparecerá en la barra superior de la tienda. Se recomienda una imagen
                  horizontal con fondo transparente (PNG o SVG), máximo 2&nbsp;MB.
                </p>
              </div>
            </div>
          </section>

          {/* ── UBICACIÓN ── */}
          <section className="adm-stat-card" style={{ flexDirection: "column", alignItems: "stretch", gap: "16px", padding: "22px" }}>
            <div className="adm-section-title" style={{ display: "flex", alignItems: "center", gap: "8px", border: "none", paddingLeft: "0" }}>
              <IconPin /> Ubicación
            </div>
            <div className="adm-form-group">
              <label htmlFor="cfg_ubicacion">Dirección</label>
              <textarea id="cfg_ubicacion" className="adm-textarea" rows={2} value={form.ubicacion}
                onChange={(e) => handleChange("ubicacion", e.target.value)}
                placeholder="Calle, número, colonia, ciudad, estado" />
            </div>
            <div className="adm-form-group">
              <label htmlFor="cfg_maps">Enlace de Google Maps (opcional)</label>
              <input id="cfg_maps" className="adm-input" value={form.maps_url}
                onChange={(e) => handleChange("maps_url", e.target.value)} placeholder="https://maps.google.com/..." />
            </div>
          </section>

          {/* ── CONTACTO ── */}
          <section className="adm-stat-card" style={{ flexDirection: "column", alignItems: "stretch", gap: "16px", padding: "22px" }}>
            <div className="adm-section-title" style={{ display: "flex", alignItems: "center", gap: "8px", border: "none", paddingLeft: "0" }}>
              <IconPhone /> Datos de contacto
            </div>
            <div className="adm-form-row">
              <div className="adm-form-group">
                <label htmlFor="cfg_tel1">Teléfono principal</label>
                <input id="cfg_tel1" className="adm-input" value={form.telefono_1}
                  onChange={(e) => handleChange("telefono_1", e.target.value)} placeholder="771 123 4567" maxLength={30} />
              </div>
              <div className="adm-form-group">
                <label htmlFor="cfg_tel2">Teléfono secundario</label>
                <input id="cfg_tel2" className="adm-input" value={form.telefono_2}
                  onChange={(e) => handleChange("telefono_2", e.target.value)} placeholder="Opcional" maxLength={30} />
              </div>
            </div>
            <div className="adm-form-row">
              <div className="adm-form-group">
                <label htmlFor="cfg_wa">WhatsApp</label>
                <input id="cfg_wa" className="adm-input" value={form.whatsapp}
                  onChange={(e) => handleChange("whatsapp", e.target.value)} placeholder="52771..." maxLength={30} />
              </div>
              <div className="adm-form-group">
                <label htmlFor="cfg_email">Correo de contacto</label>
                <input id="cfg_email" type="email" className="adm-input" value={form.email_contacto}
                  onChange={(e) => handleChange("email_contacto", e.target.value)} placeholder="contacto@danelement.com" maxLength={150} />
              </div>
            </div>
          </section>

          {/* ── REDES SOCIALES ── */}
          <section className="adm-stat-card" style={{ flexDirection: "column", alignItems: "stretch", gap: "16px", padding: "22px" }}>
            <div className="adm-section-title" style={{ display: "flex", alignItems: "center", gap: "8px", border: "none", paddingLeft: "0" }}>
              <IconShare /> Redes sociales
            </div>
            <div className="adm-form-row">
              <div className="adm-form-group">
                <label htmlFor="cfg_fb">Facebook</label>
                <input id="cfg_fb" className="adm-input" value={form.facebook}
                  onChange={(e) => handleChange("facebook", e.target.value)} placeholder="https://facebook.com/tutienda" maxLength={255} />
              </div>
              <div className="adm-form-group">
                <label htmlFor="cfg_ig">Instagram</label>
                <input id="cfg_ig" className="adm-input" value={form.instagram}
                  onChange={(e) => handleChange("instagram", e.target.value)} placeholder="https://instagram.com/tutienda" maxLength={255} />
              </div>
            </div>
            <div className="adm-form-row">
              <div className="adm-form-group">
                <label htmlFor="cfg_tk">TikTok</label>
                <input id="cfg_tk" className="adm-input" value={form.tiktok}
                  onChange={(e) => handleChange("tiktok", e.target.value)} placeholder="https://tiktok.com/@tutienda" maxLength={255} />
              </div>
              <div className="adm-form-group">
                <label htmlFor="cfg_tw">X / Twitter</label>
                <input id="cfg_tw" className="adm-input" value={form.twitter}
                  onChange={(e) => handleChange("twitter", e.target.value)} placeholder="https://x.com/tutienda" maxLength={255} />
              </div>
            </div>
          </section>

          {/* ── ACCIONES ── */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", position: "sticky", bottom: 0, padding: "12px 0" }}>
            <button className="adm-btn adm-btn-ghost" type="button" onClick={cargar} disabled={saving}>
              Descartar cambios
            </button>
            <button className="adm-btn adm-btn-primary" type="button" onClick={handleGuardar} disabled={saving}>
              <IconSave /> {saving ? "Guardando..." : "Guardar configuración"}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
