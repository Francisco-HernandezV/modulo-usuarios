/**
 * RiesgoApartado.jsx — Propuesta 2 (clasificación)
 * ================================================
 * Muestra el riesgo de cancelación del apartado que se está por crear.
 * Consulta /api/ml/riesgo-apartado cada vez que cambian el cliente, el total
 * o el anticipo, con un retardo para no saturar el servicio mientras el
 * vendedor escribe.
 *
 * Uso dentro del modal de apartado en POS.jsx:
 *
 *   <RiesgoApartado
 *     clienteId={cliente?.id}
 *     total={total}
 *     anticipo={Number(anticipo) || 0}
 *     diasDePlazo={diasApartado}
 *   />
 */

import { useEffect, useState } from "react";
import api from "../services/api";

const COLORES = {
  BAJO: { color: "#10b981", fondo: "rgba(16,185,129,0.10)", icono: "✅", etiqueta: "Riesgo bajo" },
  MEDIO: { color: "#f59e0b", fondo: "rgba(245,158,11,0.10)", icono: "⚠️", etiqueta: "Riesgo medio" },
  ALTO: { color: "#ef4444", fondo: "rgba(239,68,68,0.10)", icono: "🚨", etiqueta: "Riesgo alto" },
};

export default function RiesgoApartado({ clienteId, total, anticipo = 0, diasDePlazo = 7 }) {
  const [prediccion, setPrediccion] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!clienteId || !total || total <= 0) {
      setPrediccion(null);
      return;
    }

    // Retardo de 600 ms: evita una petición por cada tecla del anticipo.
    const temporizador = setTimeout(async () => {
      setCargando(true);
      try {
        const { data } = await api.post("/ml/riesgo-apartado", {
          cliente_id: clienteId,
          total,
          anticipo,
          dias_de_plazo: diasDePlazo,
        });
        setPrediccion(data);
      } catch {
        setPrediccion(null);
      } finally {
        setCargando(false);
      }
    }, 600);

    return () => clearTimeout(temporizador);
  }, [clienteId, total, anticipo, diasDePlazo]);

  if (cargando) {
    return (
      <div style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-color)",
                    fontSize: 12, color: "#8b949e", marginTop: 10 }}>
        Analizando riesgo del apartado…
      </div>
    );
  }

  if (!prediccion) return null;

  // El servicio de ML no está disponible: no se bloquea la operación.
  if (prediccion.disponible === false) {
    return (
      <div style={{ padding: "10px 12px", borderRadius: 8, border: "1px dashed var(--border-color)",
                    fontSize: 12, color: "#8b949e", marginTop: 10 }}>
        Predicción no disponible. El apartado puede registrarse normalmente.
      </div>
    );
  }

  const estilo = COLORES[prediccion.nivel_riesgo] || COLORES.MEDIO;

  return (
    <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 10,
                  border: `1px solid ${estilo.color}`, background: estilo.fondo }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: estilo.color }}>
          {estilo.icono} {estilo.etiqueta}
        </span>
        <span style={{ fontSize: 18, fontWeight: 700, color: estilo.color }}>
          {prediccion.porcentaje}%
        </span>
      </div>

      {/* Barra de probabilidad */}
      <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", marginTop: 8 }}>
        <div style={{ height: "100%", borderRadius: 3, background: estilo.color,
                      width: `${Math.min(100, prediccion.porcentaje)}%`, transition: "width .3s" }} />
      </div>

      <p style={{ margin: "8px 0 0", fontSize: 12, color: "#c9d1d9", lineHeight: 1.45 }}>
        {prediccion.recomendacion}
      </p>

      <p style={{ margin: "6px 0 0", fontSize: 10.5, color: "#8b949e" }}>
        Estimación del modelo {prediccion.modelo}. Es una sugerencia, no una restricción.
      </p>
    </div>
  );
}
