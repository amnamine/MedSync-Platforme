import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import "./App.css";

const API = "http://localhost:4000/api";
const roleOptions = [
  "administrateur",
  "médecin généraliste",
  "spécialiste",
  "chirurgien",
  "infirmier",
  "secrétaire médicale",
];
const modules = ["Tableau de bord", "Utilisateurs", "Urgences", "Patients", "Notifications", "Planning"];

const permissionsCatalogue = ["users.read", "users.write", "urgences.read", "urgences.write", "patients.read", "stats.read"];

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error("Erreur serveur");
  return res.json();
}

function Login({ onLogin }) {
  const [form, setForm] = useState({ email: "admin@medsync.dz", password: "admin123" });
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const data = await api("/auth/login", { method: "POST", body: JSON.stringify(form) });
      onLogin(data.user);
    } catch {
      setError("Identifiants invalides.");
    }
  };

  return (
    <div className="login-bg">
      <motion.form className="glass login-card" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit}>
        <h1>MedSync Platforme</h1>
        <p className="subtitle">Chaque seconde compte. Coordination intelligente des urgences.</p>
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input
          placeholder="Mot de passe"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <div className="error">{error}</div>}
        <button type="submit">Se connecter</button>
      </motion.form>
    </div>
  );
}

function UserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState(
    user ?? {
      nom: "",
      email: "",
      password: "",
      role: roleOptions[0],
      telephone: "",
      actif: true,
      permissions: [],
    }
  );

  const togglePermission = (code) => {
    const has = form.permissions.includes(code);
    setForm({ ...form, permissions: has ? form.permissions.filter((p) => p !== code) : [...form.permissions, code] });
  };

  return (
    <div className="modal-backdrop">
      <motion.div className="glass modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <h3>{user ? "Modifier utilisateur" : "Créer utilisateur"}</h3>
        <div className="grid2">
          <input placeholder="Nom complet" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          {!user && (
            <input
              placeholder="Mot de passe"
              value={form.password}
              type="password"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          )}
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {roleOptions.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <input placeholder="Téléphone" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
        </div>
        <p>Permissions</p>
        <div className="chips">
          {permissionsCatalogue.map((p) => (
            <button key={p} className={form.permissions.includes(p) ? "chip active" : "chip"} onClick={() => togglePermission(p)}>
              {p}
            </button>
          ))}
        </div>
        <div className="actions">
          <button className="secondary" onClick={onClose}>
            Annuler
          </button>
          <button onClick={() => onSave(form)}>{user ? "Enregistrer" : "Créer"}</button>
        </div>
      </motion.div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [current, setCurrent] = useState("Tableau de bord");
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ utilisateurs: 0, urgences: 0, urgencesCritiques: 0, patients: 0 });
  const [urgences, setUrgences] = useState([]);
  const [patients, setPatients] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [filters, setFilters] = useState({ q: "", role: "", actif: "" });
  const [modalUser, setModalUser] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const refresh = async () => {
    const [usersData, statsData, urgencesData, patientsData, notificationsData] = await Promise.all([
      api(`/users?q=${filters.q}&role=${filters.role}&actif=${filters.actif}`),
      api("/stats"),
      api("/urgences"),
      api("/patients"),
      api("/notifications"),
    ]);
    setUsers(usersData);
    setStats(statsData);
    setUrgences(urgencesData);
    setPatients(patientsData);
    setNotifications(notificationsData);
  };

  useEffect(() => {
    if (session) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, filters.q, filters.role, filters.actif]);

  const urgenceData = useMemo(
    () => [
      { name: "Critique", value: urgences.filter((u) => u.niveau === "critique").length, color: "#ef4444" },
      { name: "Moyenne", value: urgences.filter((u) => u.niveau === "moyenne").length, color: "#f59e0b" },
      { name: "Normale", value: urgences.filter((u) => u.niveau === "normale").length, color: "#22c55e" },
    ],
    [urgences]
  );

  if (!session) return <Login onLogin={setSession} />;

  const saveUser = async (payload) => {
    if (!payload.nom || !payload.email || (!modalUser && !payload.password)) return alert("Veuillez compléter le formulaire.");
    if (modalUser) {
      await api(`/users/${modalUser.id}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      await api("/users", { method: "POST", body: JSON.stringify(payload) });
    }
    setOpenModal(false);
    setModalUser(null);
    refresh();
  };

  return (
    <div className="app">
      <aside className="glass sidebar">
        <h2>MedSync</h2>
        {modules.map((item) => (
          <button key={item} className={current === item ? "nav active" : "nav"} onClick={() => setCurrent(item)}>
            {item}
          </button>
        ))}
      </aside>
      <main>
        <header className="glass topbar">
          <div>
            <h1>{current}</h1>
            <p>{session.nom} - {session.role}</p>
          </div>
          <button className="secondary" onClick={() => setSession(null)}>
            Déconnexion
          </button>
        </header>

        {current === "Tableau de bord" && (
          <section className="grid">
            <div className="glass card"><h3>Utilisateurs</h3><p>{stats.utilisateurs}</p></div>
            <div className="glass card"><h3>Patients</h3><p>{stats.patients}</p></div>
            <div className="glass card"><h3>Urgences</h3><p>{stats.urgences}</p></div>
            <div className="glass card"><h3>Urgences critiques</h3><p>{stats.urgencesCritiques}</p></div>
            <div className="glass chart">
              <h3>Répartition des urgences</h3>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={urgenceData} dataKey="value" nameKey="name" outerRadius={80}>
                    {urgenceData.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {current === "Utilisateurs" && (
          <section className="glass tableWrap">
            <div className="filters">
              <input placeholder="Recherche nom/email" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
              <select value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
                <option value="">Tous les rôles</option>
                {roleOptions.map((r) => <option key={r}>{r}</option>)}
              </select>
              <select value={filters.actif} onChange={(e) => setFilters({ ...filters, actif: e.target.value })}>
                <option value="">Actif + Inactif</option>
                <option value="1">Actif</option>
                <option value="0">Inactif</option>
              </select>
              <button onClick={() => { setModalUser(null); setOpenModal(true); }}>Créer utilisateur</button>
            </div>
            <table>
              <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Dernière connexion</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nom}</td>
                    <td>{u.email}</td>
                    <td><span className="badge">{u.role}</span></td>
                    <td>{u.actif ? "Actif" : "Inactif"}</td>
                    <td>{u.derniere_connexion || "Jamais"}</td>
                    <td className="rowActions">
                      <button onClick={() => { setModalUser(u); setOpenModal(true); }}>Modifier</button>
                      <button className="secondary" onClick={async () => { await api(`/users/${u.id}/toggle`, { method: "PATCH" }); refresh(); }}>
                        {u.actif ? "Désactiver" : "Activer"}
                      </button>
                      <button className="secondary" onClick={async () => { await api(`/users/${u.id}/reset-password`, { method: "PATCH" }); alert("Mot de passe réinitialisé."); }}>
                        Réinit. MDP
                      </button>
                      <button className="danger" onClick={async () => {
                        if (confirm("Confirmer la suppression ?")) { await api(`/users/${u.id}`, { method: "DELETE" }); refresh(); }
                      }}>Supprimer</button>
                      <button className="secondary" onClick={async () => setSelectedUser(await api(`/users/${u.id}`))}>Détails</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {current === "Urgences" && (
          <section className="glass list">
            <h3>Centre des urgences</h3>
            {urgences.map((u) => (
              <div className="item" key={u.id}>
                <strong>{u.patient_nom}</strong> - {u.symptome}
                <span className={`tag ${u.niveau}`}>{u.niveau}</span>
              </div>
            ))}
          </section>
        )}

        {current === "Patients" && (
          <section className="glass list">
            <h3>Dossiers patients</h3>
            {patients.map((p) => <div className="item" key={p.id}>{p.nom} - {p.age} ans - {p.groupe_sanguin}</div>)}
          </section>
        )}

        {current === "Notifications" && (
          <section className="glass list">
            <h3>Notifications</h3>
            {notifications.map((n) => <div className="item" key={n.id}>{n.message} ({n.type})</div>)}
          </section>
        )}

        {current === "Planning" && (
          <section className="glass list">
            <h3>Planning médical intelligent</h3>
            <p>Module prêt pour l’extension (gardes, conflits, disponibilités).</p>
          </section>
        )}
      </main>
      {openModal && <UserModal user={modalUser} onClose={() => setOpenModal(false)} onSave={saveUser} />}
      {selectedUser && (
        <div className="modal-backdrop" onClick={() => setSelectedUser(null)}>
          <div className="glass modal" onClick={(e) => e.stopPropagation()}>
            <h3>Détails utilisateur</h3>
            <p><strong>Nom:</strong> {selectedUser.nom}</p>
            <p><strong>Email:</strong> {selectedUser.email}</p>
            <p><strong>Rôle:</strong> {selectedUser.role}</p>
            <p><strong>Téléphone:</strong> {selectedUser.telephone || "-"}</p>
            <p><strong>Permissions:</strong> {selectedUser.permissions.join(", ") || "-"}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
