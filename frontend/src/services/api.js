import axios from "axios";

const api = axios.create({
  baseURL: "https://modulo-usuarios-fpig.onrender.com", // Aquí apuntará al backend (cuando lo montemos)
});

export default api;