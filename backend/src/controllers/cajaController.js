import pool from "../config/db.js";
import PDFDocument from "pdfkit";

/**
 * Módulo de Corte de Caja Diario (POS).
 *
 * - Un turno de caja (ventas.turnos_caja) se abre con un fondo inicial y se
 *   cierra con el arqueo físico. Solo puede haber un turno 'Abierta' a la vez.
 * - Los ingresos se acumulan por método (Efectivo / Tarjeta / Transferencia)
 *   sumando ventas.pagos y ventas.abonos registrados desde la apertura.
 * - Los retiros (ventas.retiros_caja) restan del efectivo esperado.
 * - "vencido" no aplica aquí; el estado es 'Abierta' | 'Cerrada'.
 */

// ── Garantiza (una vez) que existan las tablas del módulo ──
let ensurePromise = null;
export function ensureCajaTables() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ventas.turnos_caja (
          id                     SERIAL PRIMARY KEY,
          usuario_apertura_id    INTEGER NOT NULL,
          usuario_cierre_id      INTEGER,
          monto_inicial          NUMERIC(10,2) NOT NULL DEFAULT 0,
          efectivo_esperado      NUMERIC(10,2),
          efectivo_real          NUMERIC(10,2),
          tarjeta_esperado       NUMERIC(10,2),
          tarjeta_real           NUMERIC(10,2),
          transferencia_esperado NUMERIC(10,2),
          transferencia_real     NUMERIC(10,2),
          diferencia             NUMERIC(10,2),
          estado                 VARCHAR(20) NOT NULL DEFAULT 'Abierta',
          fecha_apertura         TIMESTAMP NOT NULL DEFAULT NOW(),
          fecha_cierre           TIMESTAMP,
          CONSTRAINT turnos_caja_estado_check CHECK (estado IN ('Abierta','Cerrada'))
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ventas.retiros_caja (
          id            SERIAL PRIMARY KEY,
          turno_caja_id INTEGER NOT NULL REFERENCES ventas.turnos_caja(id),
          usuario_id    INTEGER NOT NULL,
          monto         NUMERIC(10,2) NOT NULL,
          tipo_retiro   VARCHAR(20) NOT NULL DEFAULT 'Parcial',
          motivo        TEXT,
          creado_en     TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
    })().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}

// Devuelve el turno abierto (o null). Usado también por ventas/abonos para bloquear.
export async function getTurnoAbierto(client = pool) {
  await ensureCajaTables();
  const { rows } = await client.query(
    `SELECT * FROM ventas.turnos_caja WHERE estado = 'Abierta' ORDER BY id DESC LIMIT 1`
  );
  return rows[0] || null;
}

// Suma montos por método (efectivo/tarjeta/transferencia) de una tabla desde una fecha.
async function sumarPorMetodo(client, tabla, campoFecha, desde) {
  const { rows } = await client.query(
    `SELECT
       COALESCE(SUM(CASE WHEN metodo ILIKE '%efectivo%' THEN monto ELSE 0 END), 0) AS efectivo,
       COALESCE(SUM(CASE WHEN metodo ILIKE '%transfer%' THEN monto ELSE 0 END), 0) AS transferencia,
       COALESCE(SUM(CASE WHEN (metodo ILIKE '%tarjeta%' OR metodo ILIKE '%bito%' OR metodo ILIKE '%dito%')
                          THEN monto ELSE 0 END), 0) AS tarjeta
     FROM ${tabla}
     WHERE ${campoFecha} >= $1`,
    [desde]
  );
  return {
    efectivo: Number(rows[0].efectivo),
    tarjeta: Number(rows[0].tarjeta),
    transferencia: Number(rows[0].transferencia),
  };
}

// Calcula el balance esperado del turno (usado en arqueo y cierre).
async function calcularBalance(client, turno) {
  const desde = turno.fecha_apertura;
  const ventas = await sumarPorMetodo(client, "ventas.pagos", "pagado_en", desde);
  const abonos = await sumarPorMetodo(client, "ventas.abonos", "fecha", desde);

  const { rows: retRows } = await client.query(
    `SELECT COALESCE(SUM(monto), 0) AS total FROM ventas.retiros_caja WHERE turno_caja_id = $1`,
    [turno.id]
  );
  const retiros = Number(retRows[0].total);

  const monto_inicial = Number(turno.monto_inicial);
  const efectivo_ventas = ventas.efectivo + abonos.efectivo;
  const tarjeta_ventas = ventas.tarjeta + abonos.tarjeta;
  const transferencia_ventas = ventas.transferencia + abonos.transferencia;

  return {
    monto_inicial,
    ventas: { efectivo: ventas.efectivo, tarjeta: ventas.tarjeta, transferencia: ventas.transferencia },
    abonos: { efectivo: abonos.efectivo, tarjeta: abonos.tarjeta, transferencia: abonos.transferencia },
    retiros,
    efectivo_esperado: monto_inicial + efectivo_ventas - retiros,
    tarjeta_esperado: tarjeta_ventas,
    transferencia_esperado: transferencia_ventas,
    // Efectivo físicamente disponible en caja (sin restar el fondo) para validar retiros
    efectivo_disponible: monto_inicial + efectivo_ventas - retiros,
  };
}

// ════════════════════════════════════════════════════════════
//  GET /estado  — ¿hay caja abierta? (para bloquear el POS)
// ════════════════════════════════════════════════════════════
export const getEstadoCaja = async (req, res) => {
  try {
    const turno = await getTurnoAbierto();
    if (!turno) return res.json({ abierta: false });
    return res.json({
      abierta: true,
      turno_id: turno.id,
      monto_inicial: Number(turno.monto_inicial),
      fecha_apertura: turno.fecha_apertura,
      usuario_apertura_id: turno.usuario_apertura_id,
    });
  } catch (error) {
    console.error("Error getEstadoCaja:", error);
    return res.status(500).json({ message: "Error al consultar el estado de la caja." });
  }
};

// ════════════════════════════════════════════════════════════
//  POS-F1 — POST /apertura (fondo inicial)
// ════════════════════════════════════════════════════════════
export const abrirCaja = async (req, res) => {
  const { monto_inicial } = req.body;
  const usuario_id = req.user.id;

  const monto = Number(monto_inicial);
  if (Number.isNaN(monto) || monto < 0) {
    return res.status(400).json({ message: "El monto inicial no es válido." });
  }

  try {
    await ensureCajaTables();

    const abierto = await getTurnoAbierto();
    if (abierto) {
      return res.status(409).json({ message: "Ya existe una caja abierta. Ciérrala antes de abrir otra." });
    }

    const { rows } = await pool.query(
      `INSERT INTO ventas.turnos_caja (usuario_apertura_id, monto_inicial, estado)
       VALUES ($1, $2, 'Abierta') RETURNING id, fecha_apertura`,
      [usuario_id, monto]
    );
    return res.status(201).json({
      message: "Caja abierta correctamente.",
      turno_id: rows[0].id,
      fecha_apertura: rows[0].fecha_apertura,
      monto_inicial: monto,
    });
  } catch (error) {
    console.error("Error abrirCaja:", error);
    return res.status(500).json({ message: "Error al abrir la caja." });
  }
};

// ════════════════════════════════════════════════════════════
//  POS-F2 — POST /retiro (salida de efectivo)
// ════════════════════════════════════════════════════════════
export const registrarRetiro = async (req, res) => {
  const { monto, tipo_retiro, motivo } = req.body;
  const usuario_id = req.user.id;

  const montoNum = Number(monto);
  if (!montoNum || montoNum <= 0) {
    return res.status(400).json({ message: "El monto del retiro debe ser mayor a cero." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const turno = await getTurnoAbierto(client);
    if (!turno) throw new Error("No hay una caja abierta.");

    const balance = await calcularBalance(client, turno);
    if (montoNum > balance.efectivo_disponible + 0.001) {
      throw new Error(
        `El retiro ($${montoNum.toFixed(2)}) supera el efectivo disponible en caja ($${balance.efectivo_disponible.toFixed(2)}).`
      );
    }

    await client.query(
      `INSERT INTO ventas.retiros_caja (turno_caja_id, usuario_id, monto, tipo_retiro, motivo)
       VALUES ($1, $2, $3, $4, $5)`,
      [turno.id, usuario_id, montoNum, tipo_retiro || "Parcial", motivo || null]
    );

    await client.query("COMMIT");
    return res.status(201).json({
      message: "Retiro registrado correctamente.",
      efectivo_disponible: balance.efectivo_disponible - montoNum,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error registrarRetiro:", error);
    return res.status(400).json({ message: error.message || "Error al registrar el retiro." });
  } finally {
    client.release();
  }
};

// ════════════════════════════════════════════════════════════
//  POS-F3 — GET /balance-actual (arqueo)
// ════════════════════════════════════════════════════════════
export const getBalanceActual = async (req, res) => {
  try {
    const turno = await getTurnoAbierto();
    if (!turno) return res.status(404).json({ message: "No hay una caja abierta." });

    const balance = await calcularBalance(pool, turno);

    const { rows: retiros } = await pool.query(
      `SELECT r.id, r.monto, r.tipo_retiro, r.motivo, r.creado_en, u.nombre AS usuario_nombre
       FROM ventas.retiros_caja r
       LEFT JOIN seguridad.usuarios u ON u.id = r.usuario_id
       WHERE r.turno_caja_id = $1 ORDER BY r.creado_en DESC`,
      [turno.id]
    );

    return res.json({
      turno_id: turno.id,
      fecha_apertura: turno.fecha_apertura,
      ...balance,
      retiros_lista: retiros,
    });
  } catch (error) {
    console.error("Error getBalanceActual:", error);
    return res.status(500).json({ message: "Error al calcular el balance." });
  }
};

// ════════════════════════════════════════════════════════════
//  POS-F4 — POST /cierre (arqueo final y cierre)
// ════════════════════════════════════════════════════════════
export const cerrarCaja = async (req, res) => {
  const { efectivo_real, tarjeta_real, transferencia_real } = req.body;
  const usuario_id = req.user.id;

  const efReal = Number(efectivo_real) || 0;
  const taReal = Number(tarjeta_real) || 0;
  const trReal = Number(transferencia_real) || 0;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const turno = await getTurnoAbierto(client);
    if (!turno) throw new Error("No hay una caja abierta para cerrar.");

    const balance = await calcularBalance(client, turno);

    const totalEsperado = balance.efectivo_esperado + balance.tarjeta_esperado + balance.transferencia_esperado;
    const totalReal = efReal + taReal + trReal;
    const diferencia = totalReal - totalEsperado;

    // Retiro final asociado al corte (arqueo del efectivo contado)
    if (efReal > 0) {
      await client.query(
        `INSERT INTO ventas.retiros_caja (turno_caja_id, usuario_id, monto, tipo_retiro, motivo)
         VALUES ($1, $2, $3, 'Corte_Final', 'Retiro final de corte de caja')`,
        [turno.id, usuario_id, efReal]
      );
    }

    await client.query(
      `UPDATE ventas.turnos_caja SET
         usuario_cierre_id = $1,
         efectivo_esperado = $2, efectivo_real = $3,
         tarjeta_esperado = $4, tarjeta_real = $5,
         transferencia_esperado = $6, transferencia_real = $7,
         diferencia = $8, estado = 'Cerrada', fecha_cierre = NOW()
       WHERE id = $9`,
      [
        usuario_id,
        balance.efectivo_esperado, efReal,
        balance.tarjeta_esperado, taReal,
        balance.transferencia_esperado, trReal,
        diferencia, turno.id,
      ]
    );

    await client.query("COMMIT");
    return res.json({
      message: "Corte de caja procesado. Turno cerrado.",
      turno_id: turno.id,
      esperado: {
        efectivo: balance.efectivo_esperado,
        tarjeta: balance.tarjeta_esperado,
        transferencia: balance.transferencia_esperado,
        total: totalEsperado,
      },
      real: { efectivo: efReal, tarjeta: taReal, transferencia: trReal, total: totalReal },
      diferencia,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error cerrarCaja:", error);
    return res.status(400).json({ message: error.message || "Error al procesar el corte." });
  } finally {
    client.release();
  }
};

// ════════════════════════════════════════════════════════════
//  TICKET / REPORTE PDF DE CORTE
// ════════════════════════════════════════════════════════════
export const generarCortePDF = async (req, res) => {
  try {
    const { id } = req.params;
    await ensureCajaTables();

    const { rows } = await pool.query(
      `SELECT t.*, ua.nombre AS apertura_nombre, uc.nombre AS cierre_nombre
       FROM ventas.turnos_caja t
       LEFT JOIN seguridad.usuarios ua ON ua.id = t.usuario_apertura_id
       LEFT JOIN seguridad.usuarios uc ON uc.id = t.usuario_cierre_id
       WHERE t.id = $1`,
      [id]
    );
    if (rows.length === 0) return res.status(404).send("Turno no encontrado");
    const t = rows[0];

    const { rows: retiros } = await pool.query(
      `SELECT monto, tipo_retiro, motivo, creado_en FROM ventas.retiros_caja
       WHERE turno_caja_id = $1 ORDER BY creado_en ASC`,
      [id]
    );

    const doc = new PDFDocument({ size: [226, 520 + retiros.length * 14], margin: 15 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=Corte_Caja_${id}.pdf`);
    doc.pipe(res);

    const line = () => { doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(15, doc.y).lineTo(211, doc.y).stroke(); doc.moveDown(0.5); };
    const row = (label, val) => {
      const y = doc.y;
      doc.text(label, 15, y, { width: 120 });
      doc.text(`$${Number(val || 0).toFixed(2)}`, 135, y, { width: 76, align: "right" });
      doc.moveDown(0.4);
    };

    doc.font("Helvetica-Bold").fontSize(14).text("DAN ELEMENT", { align: "center" });
    doc.font("Helvetica").fontSize(8).text("Corte de Caja", { align: "center" }).moveDown(1);

    doc.font("Helvetica-Bold").fontSize(9).text(`Turno: #${t.id}  (${t.estado})`);
    doc.font("Helvetica").fontSize(8).text(`Apertura: ${new Date(t.fecha_apertura).toLocaleString("es-MX")}`);
    if (t.fecha_cierre) doc.text(`Cierre: ${new Date(t.fecha_cierre).toLocaleString("es-MX")}`);
    doc.text(`Abrió: ${t.apertura_nombre || "—"}`);
    if (t.cierre_nombre) doc.text(`Cerró: ${t.cierre_nombre}`);
    doc.moveDown(0.5); line();

    doc.font("Helvetica-Bold").fontSize(9).text("ESPERADO (sistema)"); doc.font("Helvetica").fontSize(8);
    row("Fondo inicial:", t.monto_inicial);
    row("Efectivo:", t.efectivo_esperado);
    row("Tarjeta:", t.tarjeta_esperado);
    row("Transferencia:", t.transferencia_esperado);
    doc.moveDown(0.3); line();

    doc.font("Helvetica-Bold").fontSize(9).text("CONTADO (real)"); doc.font("Helvetica").fontSize(8);
    row("Efectivo:", t.efectivo_real);
    row("Tarjeta:", t.tarjeta_real);
    row("Transferencia:", t.transferencia_real);
    doc.moveDown(0.3); line();

    const dif = Number(t.diferencia || 0);
    doc.font("Helvetica-Bold").fontSize(11);
    const yy = doc.y;
    doc.text(dif < 0 ? "FALTANTE:" : "SOBRANTE/OK:", 15, yy, { width: 120 });
    doc.fillColor(dif < 0 ? "#c0392b" : "#1e8449").text(`$${dif.toFixed(2)}`, 135, yy, { width: 76, align: "right" });
    doc.fillColor("#000000").moveDown(1);

    if (retiros.length > 0) {
      line();
      doc.font("Helvetica-Bold").fontSize(8).text("RETIROS:", 15, doc.y); doc.font("Helvetica").fontSize(7);
      retiros.forEach((r) => {
        const y = doc.y;
        doc.text(`${r.tipo_retiro} ${r.motivo ? "- " + r.motivo : ""}`.slice(0, 40), 15, y, { width: 150 });
        doc.text(`$${Number(r.monto).toFixed(2)}`, 165, y, { width: 46, align: "right" });
        doc.moveDown(0.35);
      });
    }

    doc.moveDown(1);
    doc.font("Helvetica").fontSize(7).text("Documento interno de arqueo — DanElement Boutique", 15, doc.y, { align: "center" });
    doc.end();
  } catch (error) {
    console.error("Error generarCortePDF:", error);
    res.status(500).send("Error generando PDF");
  }
};
