import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 120000,
});

export async function getHealth() {
  const response = await api.get("/health");
  return response.data;
}

export async function getDashboardConfig() {
  const response = await api.get("/config");
  return response.data;
}

export async function predictClinicalNote(note) {
  const response = await api.post("/predict", { note });
  return response.data;
}

export default api;