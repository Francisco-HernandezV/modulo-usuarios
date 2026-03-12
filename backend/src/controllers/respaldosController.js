import pool from "../config/db.js";
import { exec } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

export const getHistorialRespaldos = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM historial_respaldos ORDER BY fecha_generacion DESC");
    return res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener historial:", error);
    return res.status(500).json({ message: "Error al obtener el historial de respaldos" });
  }
};

export const generarRespaldo = async (req, res) => {
  // Generar fecha y hora para el nombre
  const now = new Date();
  const fecha = now.toISOString().split('T')[0].replace(/-/g, '');
  const hora = now.toTimeString().split(' ')[0].replace(/:/g, '');
  const fileName = `Respaldo_Base_DanElement_${fecha}_${hora}.backup`;
  
  // Ruta temporal en el servidor para guardar el archivo antes de enviarlo
  const tempFilePath = path.join(process.cwd(), fileName);

  // Comando pg_dump (Asegúrate de que la URL de la DB de producción esté correcta)
  const dbUrl = process.env.DB_URL; 
  const comando = `pg_dump "${dbUrl}" -F c -f "${tempFilePath}"`;

  exec(comando, async (error, stdout, stderr) => {
    if (error) {
      console.error(`Error al generar respaldo: ${error.message}`);
      return res.status(500).json({ message: "Error al generar el respaldo de la base de datos." });
    }

    try {
      // 1. Guardar el registro en el historial
      await pool.query(
        "INSERT INTO historial_respaldos (nombre_archivo) VALUES ($1)",
        [fileName]
      );

      // 2. Enviar el archivo al navegador para su descarga
      res.download(tempFilePath, fileName, (err) => {
        if (err) {
          console.error("Error al enviar el archivo:", err);
        }
        // 3. Eliminar el archivo temporal del servidor después de enviarlo
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      });
    } catch (dbError) {
      console.error("Error en base de datos al registrar respaldo:", dbError);
      res.status(500).json({ message: "Error interno" });
    }
  });
};