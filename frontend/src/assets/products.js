import img1 from "./img1.jpg";
import img2 from "./img2.jpg";
import img3 from "./img3.jpg";
import img4 from "./img4.jpg";

export const products = [
  // --- MUJER ---
  {
    id: 1,
    nombre: "Blusa Cruzada con Nudo",
    precio: 399,
    imagen: img4,
    descripcion: "Blusa estilo crop de corte cruzado en tono rosa malva. Ideal para combinar con prendas de tiro alto.",
    categoria: "mujer",
    tipo: "blusas",
    esOferta: false
  },
  {
    id: 9,
    nombre: "Blusa Satín Elegante",
    precio: 450,
    imagen: img4,
    descripcion: "Textura suave y brillante para noches especiales. Corte fluido que aporta sofisticación.",
    categoria: "mujer",
    tipo: "blusas",
    esOferta: true
  },
  {
    id: 10,
    nombre: "Jeans Mom Fit",
    precio: 700,
    imagen: img1,
    descripcion: "El corte clásico de los 90s, cintura alta y pierna recta. Comodidad y estilo retro.",
    categoria: "mujer",
    tipo: "pantalones",
    esOferta: false
  },
  {
    id: 11,
    nombre: "Falda Short Urbana",
    precio: 350,
    imagen: img3,
    descripcion: "Diseño asimétrico con hebillas laterales. Perfecta para un look streetwear femenino.",
    categoria: "mujer",
    tipo: "pantalones", /* O faldas */
    esOferta: true
  },
  {
    id: 12,
    nombre: "Gorra Rosa Pastel",
    precio: 150,
    imagen: img2,
    descripcion: "Toque suave de color para tus outfits diarios. Ajustable y transpirable.",
    categoria: "mujer",
    tipo: "accesorios",
    esOferta: true
  },

  // --- HOMBRE ---
  {
    id: 2,
    nombre: "Pantalón Slim Fit Azul",
    precio: 620,
    imagen: img2,
    descripcion: "Elegancia casual con un corte slim que estiliza la figura sin sacrificar movilidad.",
    categoria: "hombre",
    tipo: "pantalones",
    esOferta: false
  },
  {
    id: 3,
    nombre: "Pantalón Jogger Cargo",
    precio: 450,
    imagen: img3,
    descripcion: "Fusión perfecta entre estilo y utilidad con múltiples bolsillos. Ideal para la ciudad.",
    categoria: "hombre",
    tipo: "pantalones",
    esOferta: true
  },
  {
    id: 4,
    nombre: "Playera Oversize Negra",
    precio: 280,
    imagen: img1,
    descripcion: "Tendencia streetwear en su máxima expresión. Algodón de caída pesada.",
    categoria: "hombre",
    tipo: "playeras",
    esOferta: false
  },
  {
    id: 5,
    nombre: "Playera Blanca Premium",
    precio: 220,
    imagen: img2,
    descripcion: "El básico indispensable. Algodón Pima de alta resistencia y suavidad.",
    categoria: "hombre",
    tipo: "playeras",
    esOferta: false
  },
  {
    id: 6,
    nombre: "Playera Gráfica Urbana",
    precio: 320,
    imagen: img3,
    descripcion: "Estampado de alta densidad en espalda. Diseño rebelde para destacar.",
    categoria: "hombre",
    tipo: "playeras",
    esOferta: true
  },
  {
    id: 13,
    nombre: "Abrigo Parka Técnica",
    precio: 1200,
    imagen: img1,
    descripcion: "Protección contra el frío y la lluvia ligera. Materiales técnicos de vanguardia.",
    categoria: "hombre",
    tipo: "abrigos",
    esOferta: false
  },
  {
    id: 14,
    nombre: "Bomber Jacket Olive",
    precio: 950,
    imagen: img1,
    descripcion: "Clásica chamarra de aviador con toque moderno. Ligera pero abrigadora.",
    categoria: "hombre",
    tipo: "abrigos",
    esOferta: true
  },

  // --- ACCESORIOS / UNISEX ---
  {
    id: 8,
    nombre: "Gorra Negra Minimal",
    precio: 180,
    imagen: img2,
    descripcion: "Estructura resistente y diseño limpio. El complemento final para cualquier look.",
    categoria: "unisex",
    tipo: "accesorios",
    esOferta: false
  },
  {
    id: 15,
    nombre: "Bandolera Street Tech",
    precio: 400,
    imagen: img2,
    descripcion: "Lleva lo esencial con seguridad. Correas ajustables y compartimentos ocultos.",
    categoria: "unisex",
    tipo: "accesorios",
    esOferta: false
  }
];