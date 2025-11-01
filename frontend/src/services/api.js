import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:4000/api", // Aquí apuntará al backend (cuando lo montemos)
});

export default api;