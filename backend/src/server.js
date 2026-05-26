const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { all, get, run, initDb } = require("./db");

const app = express();
const PORT = 4000;
const ROLES = [
  "administrateur",
  "médecin généraliste",
  "spécialiste",
  "chirurgien",
  "infirmier",
  "secrétaire médicale",
];

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_, res) => {
  res.json({ ok: true, service: "MedSync API" });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email et mot de passe requis." });
  }
  const user = await get("SELECT * FROM users WHERE email = ? AND password = ?", [email, password]);
  if (!user) return res.status(401).json({ message: "Identifiants invalides." });

  await run("UPDATE users SET derniere_connexion = datetime('now') WHERE id = ?", [user.id]);
  return res.json({ user: { ...user, password: undefined } });
});

app.get("/api/roles", (_, res) => res.json(ROLES));

app.get("/api/users", async (req, res) => {
  const { q = "", role = "", actif = "" } = req.query;
  const rows = await all(
    `SELECT u.*,
      COALESCE((SELECT GROUP_CONCAT(code, ',') FROM permissions p WHERE p.user_id = u.id), '') as permissions
     FROM users u
     WHERE (? = '' OR u.nom LIKE '%' || ? || '%' OR u.email LIKE '%' || ? || '%')
     AND (? = '' OR u.role = ?)
     AND (? = '' OR u.actif = ?)
     ORDER BY u.id DESC`,
    [q, q, q, role, role, actif, actif]
  );
  res.json(rows.map((u) => ({ ...u, permissions: u.permissions ? u.permissions.split(",") : [] })));
});

app.get("/api/users/:id", async (req, res) => {
  const user = await get("SELECT * FROM users WHERE id = ?", [req.params.id]);
  if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });
  const perms = await all("SELECT code FROM permissions WHERE user_id = ?", [req.params.id]);
  res.json({ ...user, permissions: perms.map((p) => p.code) });
});

app.post("/api/users", async (req, res) => {
  const { nom, email, password, role, telephone, permissions = [] } = req.body;
  if (!nom || !email || !password || !role) {
    return res.status(400).json({ message: "Champs obligatoires manquants." });
  }
  const created = await run(
    "INSERT INTO users (nom, email, password, role, telephone, actif, derniere_connexion) VALUES (?, ?, ?, ?, ?, 1, datetime('now'))",
    [nom, email, password, role, telephone || ""]
  );
  for (const code of permissions) {
    await run("INSERT INTO permissions (user_id, code) VALUES (?, ?)", [created.id, code]);
  }
  res.status(201).json({ id: created.id });
});

app.put("/api/users/:id", async (req, res) => {
  const { nom, email, role, telephone, actif, permissions = [] } = req.body;
  await run(
    "UPDATE users SET nom = ?, email = ?, role = ?, telephone = ?, actif = ? WHERE id = ?",
    [nom, email, role, telephone || "", actif ? 1 : 0, req.params.id]
  );
  await run("DELETE FROM permissions WHERE user_id = ?", [req.params.id]);
  for (const code of permissions) {
    await run("INSERT INTO permissions (user_id, code) VALUES (?, ?)", [req.params.id, code]);
  }
  res.json({ ok: true });
});

app.patch("/api/users/:id/toggle", async (req, res) => {
  await run("UPDATE users SET actif = CASE WHEN actif = 1 THEN 0 ELSE 1 END WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

app.patch("/api/users/:id/reset-password", async (req, res) => {
  await run("UPDATE users SET password = 'MedSync2026!' WHERE id = ?", [req.params.id]);
  res.json({ ok: true, message: "Mot de passe réinitialisé: MedSync2026!" });
});

app.delete("/api/users/:id", async (req, res) => {
  await run("DELETE FROM users WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

app.get("/api/patients", async (_, res) => {
  const rows = await all("SELECT * FROM patients ORDER BY id DESC");
  res.json(rows);
});

app.post("/api/urgences", async (req, res) => {
  const { patient_id, symptome } = req.body;
  if (!patient_id || !symptome) return res.status(400).json({ message: "Données urgence invalides." });
  const s = symptome.toLowerCase();
  const niveau =
    s.includes("thorac") || s.includes("respir") ? "critique" : s.includes("fièvre") ? "moyenne" : "normale";
  const created = await run(
    "INSERT INTO urgences (patient_id, niveau, symptome, statut, date) VALUES (?, ?, ?, 'En attente', datetime('now'))",
    [patient_id, niveau, symptome]
  );
  res.status(201).json({ id: created.id, niveau });
});

app.get("/api/urgences", async (_, res) => {
  const rows = await all(
    `SELECT u.*, p.nom as patient_nom
     FROM urgences u
     JOIN patients p ON p.id = u.patient_id
     ORDER BY u.id DESC`
  );
  res.json(rows);
});

app.get("/api/plannings", async (_, res) => {
  const rows = await all(
    `SELECT p.id, p.date, p.horaire, u.nom as medecin
     FROM plannings p JOIN users u ON u.id = p.medecin_id
     ORDER BY p.date DESC`
  );
  res.json(rows);
});

app.get("/api/notifications", async (_, res) => {
  const rows = await all("SELECT * FROM notifications ORDER BY id DESC");
  res.json(rows);
});

app.get("/api/stats", async (_, res) => {
  const [users, patients, urgences, critiques] = await Promise.all([
    get("SELECT COUNT(*) as total FROM users"),
    get("SELECT COUNT(*) as total FROM patients"),
    get("SELECT COUNT(*) as total FROM urgences"),
    get("SELECT COUNT(*) as total FROM urgences WHERE niveau = 'critique'"),
  ]);
  res.json({
    utilisateurs: users.total,
    patients: patients.total,
    urgences: urgences.total,
    urgencesCritiques: critiques.total,
  });
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`MedSync API démarrée sur http://localhost:${PORT}`);
  });
});
