/**
 * SegmentoCliente.jsx — Propuesta 3 (segmentación)
 * ================================================
 * Muestra el segmento de comportamiento del cliente asignado en la caja,
 * junto con la acción comercial sugerida para ese segmento.
 * Consulta /api/ml/segmento/:cliente_id.
 *
 * Uso en POS.jsx, junto a los datos del cliente:
 *
 *   {cliente && <SegmentoCliente clienteId={cliente.id} />}
 */

import { useEffect, useState } from "react";
import api from "../services/api";

// Paleta por segmento: del más valioso al inactivo.
const ESTILOS = {
  "Súper VIP": { color: "#a855f7", icono: "👑" },
  "VIP consolidado": { color: "#10b981", icono: "⭐" },
  "VIP en desarrollo": { color: "#3b82f6", icono: "📈" },
  "Regular activo": { color: "#06b6d4", icono: "🛍️" },
  "Alto ticket dormido": { color: "#f59e0b", icono: "💎" },
  "Compra única de alto ticket": { color: "#eab308", icono: "🎯" },
  "Enfriándose": { color: "#f97316", icono: "🕐" },
  "Inactivo de bajo valor": { color: "#6b7280", icono: "💤" },
  "Sin historial": { color: "#6b7280", icono: "🆕" },
};

export default function SegmentoCliente({ clienteId, compacto = false }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!clienteId) {
      setDatos(null);
      return;
    }

    let cancelado = false;
    (async () => {
      setCargando(true);
      try {
        const { data } = await api.get(`/ml/segmento/${clienteId}`);
        if (!cancelado) setDatos(data);
      } catch {
        if (!cancelado) setDatos(null);
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => { cancelado = true; };
  }, [clienteId]);

  if (cargando) {
    return (
      <span style={{ fontSize: 11, color: "#8b949e" }}>Consultando segmento…</span>
    );
  }

  if (!datos || (datos.disponible === false && !datos.segmento)) return null;

  const estilo = ESTILOS[datos.segmento] || { color: "#6b7280", icono: "•" };

  // Versión compacta: solo la etiqueta, para listados de clientes.
  if (compacto) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5,
                     padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                     color: estilo.color, border: `1px solid ${estilo.color}`,
                     background: `${estilo.color}18` }}>
        {estilo.icono} {datos.segmento}
      </span>
    );
  }

  return (
    <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 10,
                  border: `1px solid ${estilo.color}`, background: `${estilo.color}14` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 15 }}>{estilo.icono}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: estilo.color }}>
          {datos.segmento}
        </span>
      </div>

      {datos.accion_sugerida && (
        <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "#c9d1d9", lineHeight: 1.45 }}>
          {datos.accion_sugerida}
        </p>
      )}

      {datos.variables_utilizadas && (
        <p style={{ margin: "6px 0 0", fontSize: 10.5, color: "#8b949e" }}>
          {datos.variables_utilizadas.frecuencia} compras · $
          {Number(datos.variables_utilizadas.monetario).toLocaleString("es-MX")} acumulados ·
          hace {datos.variables_utilizadas.recencia_dias} días
        </p>
      )}
    </div>
  );
}
