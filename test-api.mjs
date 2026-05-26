const API = "http://localhost:4000/api";
let token = "";
const results = { ok: [], fail: [] };

async function test(name, fn) {
  try {
    await fn();
    results.ok.push(name);
    console.log(`OK  ${name}`);
  } catch (e) {
    results.fail.push({ name, error: e.message });
    console.log(`FAIL ${name}: ${e.message}`);
  }
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || res.statusText);
  return data;
}

await test("Health check", () => api("/health"));
await test("Login admin + JWT", async () => {
  const r = await api("/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@medsync.dz", password: "admin123" }) });
  if (!r.token) throw new Error("No token");
  token = r.token;
});
await test("Login medecin", () => api("/auth/login", { method: "POST", body: JSON.stringify({ email: "medecin@medsync.dz", password: "medecin123" }) }));
await test("Login infirmier", () => api("/auth/login", { method: "POST", body: JSON.stringify({ email: "infirmier@medsync.dz", password: "inf123" }) }));
await test("Login secretaire", () => api("/auth/login", { method: "POST", body: JSON.stringify({ email: "secretaire@medsync.dz", password: "sec123" }) }));
await test("Login chirurgien", () => api("/auth/login", { method: "POST", body: JSON.stringify({ email: "chirurgien@medsync.dz", password: "chir123" }) }));
await test("Login invalid rejected", async () => {
  try {
    await api("/auth/login", { method: "POST", body: JSON.stringify({ email: "x", password: "x" }) });
    throw new Error("Should fail");
  } catch (e) {
    if (!e.message.includes("Identifiants")) throw e;
  }
});
await test("Protected route without token rejected", async () => {
  const saved = token;
  token = "";
  try {
    await api("/stats");
    throw new Error("Should require auth");
  } catch (e) {
    if (!e.message.includes("Authentification")) throw e;
  }
  token = saved;
});
await test("Get users", () => api("/users"));
await test("Get stats extended", async () => {
  const s = await api("/stats");
  if (s.medecinsDisponibles === undefined) throw new Error("Missing extended stats");
});
await test("Get patients", () => api("/patients"));
await test("Get urgences", () => api("/urgences"));
await test("Get notifications", () => api("/notifications"));
await test("Get plannings", () => api("/plannings"));
await test("Get rapports", () => api("/rapports"));
await test("Get salles", () => api("/salles"));
await test("Get consultations", () => api("/consultations"));
await test("Get operations", () => api("/operations"));
await test("Get reservations", () => api("/reservations"));
await test("Get roles", () => api("/roles"));
await test("Create patient", () => api("/patients", { method: "POST", body: JSON.stringify({ nom: "Test Patient", age: 35, groupe_sanguin: "B+" }) }));
await test("Patient historique", () => api("/patients/1/historique"));
await test("Urgence critique", async () => {
  const r = await api("/urgences", { method: "POST", body: JSON.stringify({ patient_id: 1, symptome: "Douleur thoracique" }) });
  if (r.niveau !== "critique") throw new Error(`Got ${r.niveau}`);
});
await test("Urgence moyenne", async () => {
  const r = await api("/urgences", { method: "POST", body: JSON.stringify({ patient_id: 2, symptome: "Fièvre élevée" }) });
  if (r.niveau !== "moyenne") throw new Error(`Got ${r.niveau}`);
});
await test("Planning overlap conflict", async () => {
  const plannings = await api("/plannings");
  if (!plannings.length) throw new Error("No plannings");
  const p = plannings[0];
  try {
    await api("/plannings", { method: "POST", body: JSON.stringify({ medecin_id: p.medecin_id, date: p.date, horaire: "10:00-14:00" }) });
    throw new Error("Should conflict");
  } catch (e) {
    if (!e.message.includes("Conflit")) throw e;
  }
});
await test("Create consultation", () => api("/consultations", { method: "POST", body: JSON.stringify({ patient_id: 1, medecin_id: 2, date_consultation: "2030-06-01T10:00", motif: "Test RDV" }) }));
await test("Create operation", () => api("/operations", { method: "POST", body: JSON.stringify({ patient_id: 1, date_operation: "2030-07-01T09:00", type_operation: "Test op" }) }));
await test("Create reservation", async () => {
  const salles = await api("/salles");
  await api("/reservations", { method: "POST", body: JSON.stringify({ salle_id: salles[0].id, patient_id: 1, date_debut: "2030-08-01T08:00", date_fin: "2030-08-01T10:00", motif: "Test" }) });
});
await test("Create rapport", () => api("/rapports", { method: "POST", body: JSON.stringify({ patient_id: 1, diagnostic: "Test diag", traitement: "Repos" }) }));
await test("Create user", () => api("/users", { method: "POST", body: JSON.stringify({ nom: "API Test", email: `test${Date.now()}@medsync.dz`, password: "test123", role: "infirmier" }) }));

console.log(`\n=== SUMMARY: ${results.ok.length} passed, ${results.fail.length} failed ===`);
if (results.fail.length) process.exit(1);
