import pool from "../config/db.js";
import { exec } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

export const getHistorialRespaldos = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM auditoria.historial_respaldos ORDER BY fecha_generacion DESC");
    return res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener historial:", error);
    return res.status(500).json({ message: "Error al obtener el historial de respaldos" });
  }
};

export const generarRespaldo = async (req, res) => {
  const now = new Date();
  const fecha = now.toISOString().split('T')[0].replace(/-/g, '');
  const hora = now.toTimeString().split(' ')[0].replace(/:/g, '');
  const fileName = `Respaldo_Base_DanElement_${fecha}_${hora}.backup`;
  
  const tempFilePath = path.join(process.cwd(), fileName);
  const dbUrl = process.env.DB_URL; 
  const comando = `pg_dump "${dbUrl}" -F c -f "${tempFilePath}"`;

  exec(comando, async (error) => {
    if (error) {
      console.error(`Error al generar respaldo: ${error.message}`);
      return res.status(500).json({ message: "Error al generar el respaldo de la base de datos." });
    }

    try {
      await pool.query(
        "INSERT INTO auditoria.historial_respaldos (nombre_archivo, ubicacion_destino) VALUES ($1, $2)",
        [fileName, 'Descarga Manual (Navegador)']
      );

      res.download(tempFilePath, fileName, (err) => {
        if (err) console.error("Error al enviar el archivo:", err);
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      });
    } catch (dbError) {
      console.error("Error en base de datos al registrar respaldo:", dbError);
      res.status(500).json({ message: "Error interno" });
    }
  });
};

export const registrarRespaldoExterno = async (req, res) => {
  const secretHeader = req.headers["x-backup-secret"];
  
  // Validamos la llave compartida de seguridad
  if (secretHeader !== process.env.BACKUP_SECRET) {
    return res.status(403).json({ message: "Acceso denegado. Llave de respaldo incorrecta." });
  }

  const { nombre_archivo, tipo, ubicacion } = req.body;
  
  if (!nombre_archivo) {
    return res.status(400).json({ message: "Falta nombre_archivo" });
  }

  try {
    await pool.query(
      `INSERT INTO auditoria.historial_respaldos (nombre_archivo, ubicacion_destino) VALUES ($1, $2)`,
      [
        nombre_archivo,
        ubicacion || `Local PC (${tipo || "Automático"} - C:\\DanElement\\Backups)`
      ]
    );
    return res.status(201).json({ message: "Respaldo registrado exitosamente en el historial" });
  } catch (error) {
    console.error("Error registrando respaldo externo:", error);
    return res.status(500).json({ message: "Error al registrar el respaldo en la BD" });
  }
};