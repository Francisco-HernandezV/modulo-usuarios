import axios from "axios";
const isProduction = import.meta.env.MODE === 'production';
const API_URL = isProduction 
  ? "https://modulo-usuarios-docker.onrender.com/api" 
  : "http://localhost:4000/api";                    

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});
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