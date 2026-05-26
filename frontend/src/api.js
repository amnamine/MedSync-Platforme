const API = "http://localhost:4000/api";

export function getToken() {
  return localStorage.getItem("medsync_token");
}

export function setToken(token) {
  if (token) localStorage.setItem("medsync_token", token);
  else localStorage.removeItem("medsync_token");
}

export async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Erreur serveur");
  return data;
}

export function exportTextReport(title, lines) {
  const content = [title, "=".repeat(title.length), "", ...lines].join("\n");
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "_")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
