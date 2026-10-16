const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api"
).replace(/\/$/, "");


async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with status ${response.status}.`);
  }
  return payload;
}


export function fetchPredictionModels() {
  return request("/models");
}


export function predictWithModel(modelKey, note) {
  return request("/predict/both", {
    method: "POST",
    body: JSON.stringify({ model_key: modelKey, note }),
  });
}


export { API_BASE_URL };
