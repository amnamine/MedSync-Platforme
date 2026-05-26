const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "..", "medsync.sqlite");
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function initDb() {
  await run("PRAGMA foreign_keys = ON");

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      telephone TEXT,
      actif INTEGER NOT NULL DEFAULT 1,
      derniere_connexion TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      age INTEGER NOT NULL,
      groupe_sanguin TEXT,
      allergies TEXT,
      historique TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS urgences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      niveau TEXT NOT NULL,
      symptome TEXT NOT NULL,
      statut TEXT NOT NULL DEFAULT 'En attente',
      date TEXT NOT NULL,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS plannings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medecin_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      horaire TEXT NOT NULL,
      FOREIGN KEY(medecin_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      utilisateur_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      statut TEXT NOT NULL DEFAULT 'non_lu',
      FOREIGN KEY(utilisateur_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS rapports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medecin_id INTEGER NOT NULL,
      patient_id INTEGER NOT NULL,
      diagnostic TEXT NOT NULL,
      traitement TEXT,
      recommandations TEXT,
      date_rapport TEXT NOT NULL,
      FOREIGN KEY(medecin_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS salles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'consultation',
      statut TEXT NOT NULL DEFAULT 'libre',
      capacite INTEGER NOT NULL DEFAULT 1
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS consultations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      medecin_id INTEGER NOT NULL,
      date_consultation TEXT NOT NULL,
      motif TEXT NOT NULL,
      statut TEXT NOT NULL DEFAULT 'Planifiée',
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY(medecin_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      chirurgien_id INTEGER NOT NULL,
      salle_id INTEGER,
      date_operation TEXT NOT NULL,
      type_operation TEXT NOT NULL,
      statut TEXT NOT NULL DEFAULT 'programmée',
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY(chirurgien_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(salle_id) REFERENCES salles(id) ON DELETE SET NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS reservations_salles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      salle_id INTEGER NOT NULL,
      patient_id INTEGER NOT NULL,
      medecin_id INTEGER,
      date_debut TEXT NOT NULL,
      date_fin TEXT NOT NULL,
      motif TEXT,
      statut TEXT NOT NULL DEFAULT 'planifiée',
      FOREIGN KEY(salle_id) REFERENCES salles(id) ON DELETE CASCADE,
      FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY(medecin_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  try {
    await run("ALTER TABLE urgences ADD COLUMN medecin_id INTEGER REFERENCES users(id)");
  } catch {
    /* column may already exist */
  }

  const count = await get("SELECT COUNT(*) as total FROM users");
  if (!count || count.total === 0) {
    await run(
      `INSERT INTO users (nom, email, password, role, telephone, actif, derniere_connexion)
       VALUES
       ('Admin MedSync', 'admin@medsync.dz', 'admin123', 'administrateur', '0550000001', 1, datetime('now')),
       ('Dr Samir Belkacem', 'medecin@medsync.dz', 'medecin123', 'médecin généraliste', '0550000002', 1, datetime('now')),
       ('Dr Leila Cardio', 'specialiste@medsync.dz', 'spec123', 'spécialiste', '0550000004', 1, datetime('now')),
       ('Dr Omar Chirurgie', 'chirurgien@medsync.dz', 'chir123', 'chirurgien', '0550000005', 1, datetime('now')),
       ('Nadia Infirmière', 'infirmier@medsync.dz', 'inf123', 'infirmier', '0550000003', 1, datetime('now')),
       ('Sara Secrétaire', 'secretaire@medsync.dz', 'sec123', 'secrétaire médicale', '0550000006', 1, datetime('now'))
      `
    );

    await run(
      `INSERT INTO permissions (user_id, code) VALUES
       (1, 'users.read'), (1, 'users.write'), (1, 'urgences.read'), (1, 'stats.read'),
       (2, 'patients.read'), (2, 'urgences.read'),
       (3, 'patients.read'), (3, 'urgences.read'),
       (4, 'urgences.read'), (4, 'patients.read'),
       (5, 'urgences.write'), (5, 'patients.read'),
       (6, 'patients.read'), (6, 'patients.write')`
    );

    await run(
      `INSERT INTO patients (nom, age, groupe_sanguin, allergies, historique) VALUES
       ('Karim Meziane', 42, 'O+', 'Aucune', 'Hypertension'),
       ('Yasmina Bensaid', 28, 'A-', 'Pénicilline', 'Asthme léger')`
    );

    await run(
      `INSERT INTO urgences (patient_id, niveau, symptome, statut, date) VALUES
       (1, 'critique', 'Douleur thoracique', 'En cours', datetime('now')),
       (2, 'moyenne', 'Fièvre persistante', 'En attente', datetime('now'))`
    );

    await run(
      `INSERT INTO notifications (utilisateur_id, message, type, statut) VALUES
       (2, 'Urgence critique: Karim Meziane', 'urgence', 'non_lu'),
       (1, 'Nouveau compte utilisateur créé', 'système', 'lu')`
    );

    await run(
      `INSERT INTO plannings (medecin_id, date, horaire) VALUES
       (2, date('now'), '08:00-12:00'),
       (2, date('now', '+1 day'), '14:00-18:00')`
    );

    await run(
      `INSERT INTO salles (nom, type, statut, capacite) VALUES
       ('Salle Consultation A', 'consultation', 'libre', 2),
       ('Bloc Opératoire 1', 'bloc', 'occupée', 1),
       ('Salle Urgences', 'urgence', 'libre', 4)`
    );

    await run(
      `INSERT INTO rapports (medecin_id, patient_id, diagnostic, traitement, recommandations, date_rapport) VALUES
       (2, 1, 'Hypertension artérielle', 'Amlodipine 5mg', 'Contrôle tension dans 15 jours', datetime('now')),
       (2, 2, 'Asthme léger', 'Ventoline au besoin', 'Éviter allergènes connus', datetime('now'))`
    );
  }

  const sallesCount = await get("SELECT COUNT(*) as total FROM salles");
  if (!sallesCount || sallesCount.total === 0) {
    await run(
      `INSERT INTO salles (nom, type, statut, capacite) VALUES
       ('Salle Consultation A', 'consultation', 'libre', 2),
       ('Bloc Opératoire 1', 'bloc', 'occupée', 1),
       ('Salle Urgences', 'urgence', 'libre', 4)`
    );
  }

  const planningsCount = await get("SELECT COUNT(*) as total FROM plannings");
  if (!planningsCount || planningsCount.total === 0) {
    const medecin = await get("SELECT id FROM users WHERE role LIKE '%médecin%' LIMIT 1");
    if (medecin) {
      await run(
        `INSERT INTO plannings (medecin_id, date, horaire) VALUES
         (?, date('now'), '08:00-12:00'),
         (?, date('now', '+1 day'), '14:00-18:00')`,
        [medecin.id, medecin.id]
      );
    }
  }

  const rapportsCount = await get("SELECT COUNT(*) as total FROM rapports");
  if (!rapportsCount || rapportsCount.total === 0) {
    const medecin = await get("SELECT id FROM users WHERE role LIKE '%médecin%' LIMIT 1");
    if (medecin) {
      await run(
        `INSERT INTO rapports (medecin_id, patient_id, diagnostic, traitement, recommandations, date_rapport) VALUES
         (?, 1, 'Hypertension artérielle', 'Amlodipine 5mg', 'Contrôle tension dans 15 jours', datetime('now')),
         (?, 2, 'Asthme léger', 'Ventoline au besoin', 'Éviter allergènes connus', datetime('now'))`,
        [medecin.id, medecin.id]
      );
    }
  }

  const extraRoles = [
    ["Dr Leila Cardio", "specialiste@medsync.dz", "spec123", "spécialiste", "0550000004"],
    ["Dr Omar Chirurgie", "chirurgien@medsync.dz", "chir123", "chirurgien", "0550000005"],
    ["Sara Secrétaire", "secretaire@medsync.dz", "sec123", "secrétaire médicale", "0550000006"],
  ];
  for (const [nom, email, password, role, tel] of extraRoles) {
    const exists = await get("SELECT id FROM users WHERE email = ?", [email]);
    if (!exists) {
      await run(
        "INSERT INTO users (nom, email, password, role, telephone, actif, derniere_connexion) VALUES (?, ?, ?, ?, ?, 1, datetime('now'))",
        [nom, email, password, role, tel]
      );
    }
  }

  const consultCount = await get("SELECT COUNT(*) as total FROM consultations");
  if (!consultCount || consultCount.total === 0) {
    const medecin = await get("SELECT id FROM users WHERE role LIKE '%médecin%' LIMIT 1");
    if (medecin) {
      await run(
        `INSERT INTO consultations (patient_id, medecin_id, date_consultation, motif, statut) VALUES
         (1, ?, datetime('now', '+1 day'), 'Contrôle tension', 'Planifiée'),
         (2, ?, datetime('now', '+2 day'), 'Suivi asthme', 'Planifiée')`,
        [medecin.id, medecin.id]
      );
    }
  }

  const opsCount = await get("SELECT COUNT(*) as total FROM operations");
  if (!opsCount || opsCount.total === 0) {
    const chir = await get("SELECT id FROM users WHERE role = 'chirurgien' LIMIT 1");
    const bloc = await get("SELECT id FROM salles WHERE type = 'bloc' LIMIT 1");
    if (chir) {
      await run(
        `INSERT INTO operations (patient_id, chirurgien_id, salle_id, date_operation, type_operation, statut) VALUES
         (1, ?, ?, datetime('now', '+3 day'), 'Chirurgie cardiaque programmée', 'programmée')`,
        [chir.id, bloc?.id || null]
      );
    }
  }
}

module.exports = { db, run, all, get, initDb };
