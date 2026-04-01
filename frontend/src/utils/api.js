const BASE = '/api';

async function parseJsonResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Request failed');
  }
  return data;
}

export const checkHealth = () => fetch(`${BASE}/`).then(parseJsonResponse);

export const transcribeFile = (formData) =>
  fetch(`${BASE}/transcribe`, {
    method: 'POST',
    body: formData,
  }).then(parseJsonResponse);

export const getHistory = (page = 1, limit = 20) =>
  fetch(`${BASE}/history?page=${page}&limit=${limit}`).then(parseJsonResponse);
