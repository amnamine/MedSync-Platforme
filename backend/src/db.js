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

  const count = await get("SELECT COUNT(*) as total FROM users");
  if (!count || count.total === 0) {
    await run(
      `INSERT INTO users (nom, email, password, role, telephone, actif, derniere_connexion)
       VALUES
       ('Admin MedSync', 'admin@medsync.dz', 'admin123', 'administrateur', '0550000001', 1, datetime('now')),
       ('Dr Samir Belkacem', 'medecin@medsync.dz', 'medecin123', 'médecin généraliste', '0550000002', 1, datetime('now')),
       ('Nadia Infirmière', 'infirmier@medsync.dz', 'inf123', 'infirmier', '0550000003', 1, datetime('now'))
      `
    );

    await run(
      `INSERT INTO permissions (user_id, code) VALUES
       (1, 'users.read'), (1, 'users.write'), (1, 'urgences.read'), (1, 'stats.read'),
       (2, 'patients.read'), (2, 'urgences.read'),
       (3, 'urgences.write'), (3, 'patients.read')`
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
  }
}

module.exports = { db, run, all, get, initDb };
