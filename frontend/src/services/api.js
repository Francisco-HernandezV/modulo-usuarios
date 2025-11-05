import axios from "axios";

const api = axios.create({
  baseURL: "https://modulo-usuarios-fpig.onrender.com/api", // ✅ importante el /api
});

export default api;