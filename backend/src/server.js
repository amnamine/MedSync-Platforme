const http = require("http");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { Server } = require("socket.io");
const { all, get, run, initDb } = require("./db");
const { hashPassword, verifyPassword, signToken, authMiddleware, requireRoles } = require("./auth");
const { sendUrgenceAlert } = require("./mail");
const { hasPlanningConflict } = require("./planningUtils");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
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

function emitToUser(userId, event, payload) {
  io.to(`user-${userId}`).emit(event, payload);
}

function emitBroadcast(event, payload) {
  io.emit(event, payload);
}

async function createNotification(userId, message, type) {
  const created = await run(
    "INSERT INTO notifications (utilisateur_id, message, type, statut) VALUES (?, ?, ?, 'non_lu')",
    [userId, message, type]
  );
  const row = await get("SELECT * FROM notifications WHERE id = ?", [created.id]);
  emitToUser(userId, "notification", row);
  return row;
}

app.get("/api/health", (_, res) => res.json({ ok: true, service: "MedSync API", realtime: true }));

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email et mot de passe requis." });

  const user = await get("SELECT * FROM users WHERE email = ? AND actif = 1", [email]);
  if (!user || !(await verifyPassword(password, user.password))) {
    return res.status(401).json({ message: "Identifiants invalides." });
  }

  if (!user.password.startsWith("$2")) {
    const hashed = await hashPassword(password);
    await run("UPDATE users SET password = ? WHERE id = ?", [hashed, user.id]);
  }

  await run("UPDATE users SET derniere_connexion = datetime('now') WHERE id = ?", [user.id]);
  const token = signToken(user);
  return res.json({ token, user: { ...user, password: undefined } });
});

app.use("/api", authMiddleware);

app.get("/api/roles", (_, res) => res.json(ROLES));

app.get("/api/users", requireRoles("administrateur"), async (req, res) => {
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
  res.json(rows.map((u) => ({ ...u, password: undefined, permissions: u.permissions ? u.permissions.split(",") : [] })));
});

app.get("/api/users/:id", requireRoles("administrateur"), async (req, res) => {
  const user = await get("SELECT * FROM users WHERE id = ?", [req.params.id]);
  if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });
  const perms = await all("SELECT code FROM permissions WHERE user_id = ?", [req.params.id]);
  res.json({ ...user, password: undefined, permissions: perms.map((p) => p.code) });
});

app.post("/api/users", requireRoles("administrateur"), async (req, res) => {
  const { nom, email, password, role, telephone, permissions = [] } = req.body;
  if (!nom || !email || !password || !role) return res.status(400).json({ message: "Champs obligatoires manquants." });
  const hashed = await hashPassword(password);
  const created = await run(
    "INSERT INTO users (nom, email, password, role, telephone, actif, derniere_connexion) VALUES (?, ?, ?, ?, ?, 1, datetime('now'))",
    [nom, email, hashed, role, telephone || ""]
  );
  for (const code of permissions) await run("INSERT INTO permissions (user_id, code) VALUES (?, ?)", [created.id, code]);
  res.status(201).json({ id: created.id });
});

app.put("/api/users/:id", requireRoles("administrateur"), async (req, res) => {
  const { nom, email, role, telephone, actif, permissions = [] } = req.body;
  await run("UPDATE users SET nom = ?, email = ?, role = ?, telephone = ?, actif = ? WHERE id = ?", [
    nom, email, role, telephone || "", actif ? 1 : 0, req.params.id,
  ]);
  await run("DELETE FROM permissions WHERE user_id = ?", [req.params.id]);
  for (const code of permissions) await run("INSERT INTO permissions (user_id, code) VALUES (?, ?)", [req.params.id, code]);
  res.json({ ok: true });
});

app.patch("/api/users/:id/toggle", requireRoles("administrateur"), async (req, res) => {
  await run("UPDATE users SET actif = CASE WHEN actif = 1 THEN 0 ELSE 1 END WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

app.patch("/api/users/:id/reset-password", requireRoles("administrateur"), async (req, res) => {
  const hashed = await hashPassword("MedSync2026!");
  await run("UPDATE users SET password = ? WHERE id = ?", [hashed, req.params.id]);
  res.json({ ok: true, message: "Mot de passe réinitialisé: MedSync2026!" });
});

app.delete("/api/users/:id", requireRoles("administrateur"), async (req, res) => {
  await run("DELETE FROM users WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

app.get("/api/patients", async (_, res) => {
  res.json(await all("SELECT * FROM patients ORDER BY id DESC"));
});

app.get("/api/patients/:id/historique", async (req, res) => {
  const patient = await get("SELECT * FROM patients WHERE id = ?", [req.params.id]);
  if (!patient) return res.status(404).json({ message: "Patient introuvable." });
  const [rapports, consultations, urgences, operations] = await Promise.all([
    all("SELECT r.*, u.nom as medecin_nom FROM rapports r JOIN users u ON u.id = r.medecin_id WHERE r.patient_id = ? ORDER BY r.id DESC", [req.params.id]),
    all("SELECT c.*, u.nom as medecin_nom FROM consultations c JOIN users u ON u.id = c.medecin_id WHERE c.patient_id = ? ORDER BY c.id DESC", [req.params.id]),
    all("SELECT * FROM urgences WHERE patient_id = ? ORDER BY id DESC", [req.params.id]),
    all("SELECT o.*, u.nom as chirurgien_nom, s.nom as salle_nom FROM operations o JOIN users u ON u.id = o.chirurgien_id LEFT JOIN salles s ON s.id = o.salle_id WHERE o.patient_id = ? ORDER BY o.id DESC", [req.params.id]),
  ]);
  res.json({ patient, rapports, consultations, urgences, operations });
});

app.post("/api/patients", requireRoles("administrateur", "secrétaire médicale"), async (req, res) => {
  const { nom, age, groupe_sanguin, allergies, historique } = req.body;
  if (!nom || !age) return res.status(400).json({ message: "Nom et âge requis." });
  const created = await run(
    "INSERT INTO patients (nom, age, groupe_sanguin, allergies, historique) VALUES (?, ?, ?, ?, ?)",
    [nom, age, groupe_sanguin || "", allergies || "Aucune", historique || ""]
  );
  res.status(201).json({ id: created.id });
});

app.put("/api/patients/:id", requireRoles("administrateur", "secrétaire médicale"), async (req, res) => {
  const { nom, age, groupe_sanguin, allergies, historique } = req.body;
  await run("UPDATE patients SET nom = ?, age = ?, groupe_sanguin = ?, allergies = ?, historique = ? WHERE id = ?", [
    nom, age, groupe_sanguin || "", allergies || "", historique || "", req.params.id,
  ]);
  res.json({ ok: true });
});

app.delete("/api/patients/:id", requireRoles("administrateur"), async (req, res) => {
  await run("DELETE FROM patients WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

async function findAvailableDoctor(niveau) {
  const roleFilter =
    niveau === "critique"
      ? "(u.role = 'chirurgien' OR u.role = 'spécialiste' OR u.role LIKE '%médecin%')"
      : "(u.role LIKE '%médecin%' OR u.role = 'chirurgien' OR u.role = 'spécialiste')";
  return get(
    `SELECT u.id, u.nom, u.email FROM users u WHERE u.actif = 1 AND ${roleFilter} ORDER BY u.id LIMIT 1`
  );
}

function computePriority(symptome) {
  const s = symptome.toLowerCase();
  if (s.includes("thorac") || s.includes("respir") || s.includes("cardia")) return "critique";
  if (s.includes("fièvre") || s.includes("fievre") || s.includes("saign")) return "moyenne";
  return "normale";
}

app.post("/api/urgences", requireRoles("administrateur", "infirmier"), async (req, res) => {
  const { patient_id, symptome } = req.body;
  if (!patient_id || !symptome) return res.status(400).json({ message: "Données urgence invalides." });
  const niveau = computePriority(symptome);
  const medecin = await findAvailableDoctor(niveau);
  const patient = await get("SELECT nom FROM patients WHERE id = ?", [patient_id]);
  const created = await run(
    "INSERT INTO urgences (patient_id, medecin_id, niveau, symptome, statut, date) VALUES (?, ?, ?, ?, 'En attente', datetime('now'))",
    [patient_id, medecin?.id || null, niveau, symptome]
  );

  if (medecin) {
    await createNotification(medecin.id, `Urgence ${niveau.toUpperCase()} – ${patient?.nom}: ${symptome}`, "urgence");
    await sendUrgenceAlert({ email: medecin.email, patient: patient?.nom, niveau, symptome });
  }
  const admins = await all("SELECT id FROM users WHERE role = 'administrateur' AND actif = 1");
  for (const admin of admins) {
    await createNotification(admin.id, `Nouvelle urgence ${niveau}: ${patient?.nom}`, "urgence");
  }

  emitBroadcast("urgence", { id: created.id, niveau, patient: patient?.nom, symptome });
  res.status(201).json({ id: created.id, niveau, medecin: medecin?.nom || null });
});

app.get("/api/urgences", async (_, res) => {
  res.json(
    await all(
      `SELECT u.*, p.nom as patient_nom, m.nom as medecin_nom FROM urgences u
       JOIN patients p ON p.id = u.patient_id LEFT JOIN users m ON m.id = u.medecin_id ORDER BY u.id DESC`
    )
  );
});

app.patch("/api/urgences/:id/statut", requireRoles("administrateur", "médecin généraliste", "spécialiste", "chirurgien"), async (req, res) => {
  await run("UPDATE urgences SET statut = ? WHERE id = ?", [req.body.statut, req.params.id]);
  emitBroadcast("urgence-update", { id: req.params.id, statut: req.body.statut });
  res.json({ ok: true });
});

app.get("/api/plannings", async (_, res) => {
  res.json(
    await all(
      `SELECT p.id, p.date, p.horaire, u.nom as medecin, p.medecin_id FROM plannings p
       JOIN users u ON u.id = p.medecin_id ORDER BY p.date DESC`
    )
  );
});

app.post("/api/plannings", requireRoles("administrateur", "secrétaire médicale"), async (req, res) => {
  const { medecin_id, date, horaire } = req.body;
  if (!medecin_id || !date || !horaire) return res.status(400).json({ message: "Champs planning requis." });
  const existing = await all("SELECT date, horaire FROM plannings WHERE medecin_id = ?", [medecin_id]);
  if (hasPlanningConflict(existing, date, horaire)) {
    return res.status(409).json({ message: "Conflit de planning détecté (créneaux qui se chevauchent)." });
  }
  const created = await run("INSERT INTO plannings (medecin_id, date, horaire) VALUES (?, ?, ?)", [medecin_id, date, horaire]);
  res.status(201).json({ id: created.id });
});

app.delete("/api/plannings/:id", requireRoles("administrateur"), async (req, res) => {
  await run("DELETE FROM plannings WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

app.get("/api/consultations", async (_, res) => {
  res.json(
    await all(
      `SELECT c.*, p.nom as patient_nom, u.nom as medecin_nom FROM consultations c
       JOIN patients p ON p.id = c.patient_id JOIN users u ON u.id = c.medecin_id ORDER BY c.date_consultation DESC`
    )
  );
});

app.post("/api/consultations", requireRoles("administrateur", "secrétaire médicale"), async (req, res) => {
  const { patient_id, medecin_id, date_consultation, motif } = req.body;
  if (!patient_id || !medecin_id || !date_consultation || !motif) {
    return res.status(400).json({ message: "Consultation incomplète." });
  }
  const created = await run(
    "INSERT INTO consultations (patient_id, medecin_id, date_consultation, motif, statut) VALUES (?, ?, ?, ?, 'Planifiée')",
    [patient_id, medecin_id, date_consultation, motif]
  );
  await createNotification(medecin_id, `Nouveau rendez-vous: ${motif}`, "consultation");
  res.status(201).json({ id: created.id });
});

app.patch("/api/consultations/:id/statut", requireRoles("administrateur", "secrétaire médicale", "médecin généraliste", "spécialiste"), async (req, res) => {
  await run("UPDATE consultations SET statut = ? WHERE id = ?", [req.body.statut, req.params.id]);
  res.json({ ok: true });
});

app.get("/api/rapports", async (_, res) => {
  res.json(
    await all(
      `SELECT r.*, p.nom as patient_nom, u.nom as medecin_nom FROM rapports r
       JOIN patients p ON p.id = r.patient_id JOIN users u ON u.id = r.medecin_id ORDER BY r.id DESC`
    )
  );
});

app.post("/api/rapports", requireRoles("médecin généraliste", "spécialiste", "chirurgien", "administrateur"), async (req, res) => {
  const { patient_id, diagnostic, traitement, recommandations } = req.body;
  const medecin_id = req.body.medecin_id || req.user.id;
  if (!medecin_id || !patient_id || !diagnostic) return res.status(400).json({ message: "Rapport incomplet." });
  const created = await run(
    "INSERT INTO rapports (medecin_id, patient_id, diagnostic, traitement, recommandations, date_rapport) VALUES (?, ?, ?, ?, ?, datetime('now'))",
    [medecin_id, patient_id, diagnostic, traitement || "", recommandations || ""]
  );
  res.status(201).json({ id: created.id });
});

app.get("/api/salles", async (_, res) => {
  res.json(await all("SELECT * FROM salles ORDER BY id"));
});

app.post("/api/salles", requireRoles("administrateur"), async (req, res) => {
  const { nom, type, statut, capacite } = req.body;
  if (!nom) return res.status(400).json({ message: "Nom de salle requis." });
  const created = await run("INSERT INTO salles (nom, type, statut, capacite) VALUES (?, ?, ?, ?)", [
    nom, type || "consultation", statut || "libre", capacite || 1,
  ]);
  res.status(201).json({ id: created.id });
});

app.patch("/api/salles/:id/statut", requireRoles("administrateur", "chirurgien"), async (req, res) => {
  await run("UPDATE salles SET statut = ? WHERE id = ?", [req.body.statut, req.params.id]);
  res.json({ ok: true });
});

app.get("/api/reservations", async (_, res) => {
  res.json(
    await all(
      `SELECT r.*, s.nom as salle_nom, p.nom as patient_nom, u.nom as medecin_nom FROM reservations_salles r
       JOIN salles s ON s.id = r.salle_id JOIN patients p ON p.id = r.patient_id
       LEFT JOIN users u ON u.id = r.medecin_id ORDER BY r.date_debut DESC`
    )
  );
});

app.post("/api/reservations", requireRoles("administrateur", "chirurgien", "secrétaire médicale"), async (req, res) => {
  const { salle_id, patient_id, medecin_id, date_debut, date_fin, motif } = req.body;
  if (!salle_id || !patient_id || !date_debut || !date_fin) return res.status(400).json({ message: "Réservation incomplète." });
  const created = await run(
    "INSERT INTO reservations_salles (salle_id, patient_id, medecin_id, date_debut, date_fin, motif, statut) VALUES (?, ?, ?, ?, ?, ?, 'planifiée')",
    [salle_id, patient_id, medecin_id || null, date_debut, date_fin, motif || ""]
  );
  await run("UPDATE salles SET statut = 'occupée' WHERE id = ?", [salle_id]);
  res.status(201).json({ id: created.id });
});

app.get("/api/operations", async (_, res) => {
  res.json(
    await all(
      `SELECT o.*, p.nom as patient_nom, u.nom as chirurgien_nom, s.nom as salle_nom FROM operations o
       JOIN patients p ON p.id = o.patient_id JOIN users u ON u.id = o.chirurgien_id
       LEFT JOIN salles s ON s.id = o.salle_id ORDER BY o.date_operation DESC`
    )
  );
});

app.post("/api/operations", requireRoles("administrateur", "chirurgien"), async (req, res) => {
  const { patient_id, salle_id, date_operation, type_operation } = req.body;
  const chirurgien_id = req.body.chirurgien_id || req.user.id;
  if (!patient_id || !date_operation || !type_operation) return res.status(400).json({ message: "Opération incomplète." });
  const created = await run(
    "INSERT INTO operations (patient_id, chirurgien_id, salle_id, date_operation, type_operation, statut) VALUES (?, ?, ?, ?, ?, 'programmée')",
    [patient_id, chirurgien_id, salle_id || null, date_operation, type_operation]
  );
  if (salle_id) await run("UPDATE salles SET statut = 'occupée' WHERE id = ?", [salle_id]);
  res.status(201).json({ id: created.id });
});

app.patch("/api/operations/:id/statut", requireRoles("administrateur", "chirurgien"), async (req, res) => {
  await run("UPDATE operations SET statut = ? WHERE id = ?", [req.body.statut, req.params.id]);
  res.json({ ok: true });
});

app.get("/api/notifications", async (req, res) => {
  const userId = req.query.user_id || req.user.id;
  res.json(await all("SELECT * FROM notifications WHERE utilisateur_id = ? ORDER BY id DESC", [userId]));
});

app.patch("/api/notifications/:id/read", async (req, res) => {
  await run("UPDATE notifications SET statut = 'lu' WHERE id = ? AND utilisateur_id = ?", [req.params.id, req.user.id]);
  res.json({ ok: true });
});

app.get("/api/stats", async (_, res) => {
  const [users, patients, urgences, critiques, consultations, sallesLibres, medecins] = await Promise.all([
    get("SELECT COUNT(*) as total FROM users WHERE actif = 1"),
    get("SELECT COUNT(*) as total FROM patients"),
    get("SELECT COUNT(*) as total FROM urgences"),
    get("SELECT COUNT(*) as total FROM urgences WHERE niveau = 'critique' AND statut != 'Traité'"),
    get("SELECT COUNT(*) as total FROM consultations WHERE statut = 'Planifiée'"),
    get("SELECT COUNT(*) as total FROM salles WHERE statut = 'libre'"),
    get("SELECT COUNT(*) as total FROM users WHERE actif = 1 AND (role LIKE '%médecin%' OR role IN ('chirurgien','spécialiste'))"),
  ]);
  res.json({
    utilisateurs: users.total,
    patients: patients.total,
    urgences: urgences.total,
    urgencesCritiques: critiques.total,
    consultations: consultations.total,
    sallesLibres: sallesLibres.total,
    medecinsDisponibles: medecins.total,
  });
});

io.on("connection", (socket) => {
  socket.on("join", (userId) => socket.join(`user-${userId}`));
});

initDb().then(() => {
  server.listen(PORT, () => console.log(`MedSync API démarrée sur http://localhost:${PORT}`));
});

module.exports = { app, io };
