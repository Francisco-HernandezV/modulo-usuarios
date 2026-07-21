import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

const RAIZ = process.env.CLOUDINARY_FOLDER || "danelement";

/** Carpeta destino de un producto dentro de tu cuenta Cloudinary */
export const carpetaProducto = (productoId) => `${RAIZ}/productos/${productoId}`;

/**
 * Sube un buffer (viene de multer.memoryStorage) directo a Cloudinary.
 * El archivo NUNCA toca el disco del servidor: buffer -> stream -> CDN.
 *
 * @param {Buffer} buffer contenido del archivo
 * @param {string} folder carpeta destino, ej. "danelement/productos/12"
 * @returns {Promise<{secure_url:string, public_id:string, width:number, height:number, bytes:number, format:string}>}
 */
export const subirBuffer = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        // Recorta imágenes gigantes: nadie necesita 6000 px en una tienda.
        // Las variantes ligeras (w_400, f_auto, q_auto) se piden por URL
        // desde el frontend, así una sola copia sirve para todos los tamaños.
        transformation: [{ width: 1600, height: 1600, crop: "limit" }],
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    Readable.from(buffer).pipe(stream);
  });

/** Borra una imagen del CDN. Si ya no existe, no revienta. */
export const borrarImagen = async (publicId) => {
  if (!publicId) return { result: "sin_public_id" };
  try {
    return await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (error) {
    console.error("Cloudinary destroy:", publicId, error.message);
    return { result: "error" };
  }
};

/** Limpia la carpeta completa de un producto (al eliminar el producto). */
export const borrarCarpetaProducto = async (productoId) => {
  const folder = carpetaProducto(productoId);
  try {
    await cloudinary.api.delete_resources_by_prefix(folder);
    await cloudinary.api.delete_folder(folder);
  } catch (error) {
    // La carpeta puede no existir; no es fatal
    console.warn("Cloudinary limpieza de carpeta:", folder, error.message);
  }
};

export default cloudinary;