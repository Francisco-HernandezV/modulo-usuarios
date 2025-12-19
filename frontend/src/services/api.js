import axios from "axios";

const api = axios.create({
  baseURL: "https://modulo-usuarios-fpig.onrender.com/api", // Tu URL de Render
});

// 👇 ESTO ES LO NUEVO: Interceptor para inyectar el token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;