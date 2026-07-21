/**
 * Construye una URL optimizada de Cloudinary a partir de la URL guardada en la BD.
 *
 * Cloudinary genera las versiones ligeras al vuelo: no necesitas subir la foto
 * varias veces. Solo se inyectan las transformaciones después de "/upload/".
 *
 *   cldUrl(url, "w_400,h_400,c_fill")  -> miniatura cuadrada de 400px
 *   cldUrl(url, "w_1000")              -> versión grande para el detalle
 *
 * f_auto = formato moderno (webp/avif) según el navegador
 * q_auto = compresión automática sin pérdida visible
 */
export const cldUrl = (url, transformaciones = "w_600") => {
  if (!url) return PLACEHOLDER;
  if (!url.includes("/upload/")) return url; // no es de Cloudinary, se deja igual
  return url.replace("/upload/", `/upload/f_auto,q_auto,${transformaciones}/`);
};

/** Imagen de respaldo cuando el producto todavía no tiene fotos */
export const PLACEHOLDER =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
       <rect width="400" height="400" fill="#1f2937"/>
       <text x="50%" y="50%" fill="#6b7280" font-family="sans-serif"
             font-size="20" text-anchor="middle" dominant-baseline="middle">
         Sin imagen
       </text>
     </svg>`
  );

export default cldUrl;