import axios from "axios";

const predictionClient = axios.create({
  baseURL: "/api/prediction",
  timeout: 180000,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function predictClinicalNote(note) {
  const response = await predictionClient.post(
    "/predict",
    { note },
  );

  return response.data;
}

export async function getPredictionStatus() {
  const response = await predictionClient.get(
    "/status",
  );

  return response.data;
}