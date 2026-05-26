import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import { io } from "socket.io-client";
import { api, setToken, exportTextReport } from "./api";
import {
  roleOptions, roleModules, roleThemes, quotes, permissionsCatalogue,
  i18n, moduleLabels, dashboardTitles,
} from "./i18n";
import "./App.css";

const SOCKET_URL = "http://localhost:4000";

function Login({ onLogin, lang, setLang }) {
  const t = i18n[lang];
  const [form, setForm] = useState({ email: "admin@medsync.dz", password: "admin123" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [mouse, setMouse] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const id = setInterval(() => setQuoteIdx((i) => (i + 1) % quotes.length), 4000);
    return () => clearInterval(id);
  }, []);

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setMouse({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);
      const data = await api("/auth/login", { method: "POST", body: JSON.stringify(form) });
      setToken(data.token);
      onLogin(data.user);
    } catch {
      setError(t.invalid);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg" onMouseMove={onMove} style={{ "--mx": `${mouse.x}%`, "--my": `${mouse.y}%` }}>
      <div className="glow-orb" aria-hidden="true" />
      <div className="particles" aria-hidden="true">
        {Array.from({ length: 30 }).map((_, i) => (
          <span key={i} className="particle" style={{ "--i": i, "--px": `${(i * 13) % 100}%`, "--py": `${(i * 17) % 100}%` }} />
        ))}
      </div>
      <button type="button" className="lang-toggle secondary" onClick={() => setLang(lang === "fr" ? "en" : "fr")}>{t.lang}</button>
      <motion.form className="glass login-card glow-border" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit}>
        <h1>MedSync Platforme</h1>
        <p className="subtitle">{t.subtitle}</p>
        <AnimatePresence mode="wait">
          <motion.p key={quoteIdx} className="quote" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            &ldquo;{quotes[quoteIdx]}&rdquo;
          </motion.p>
        </AnimatePresence>
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder={t.password} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <div className="error">{error}</div>}
        <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          {loading ? t.loading : t.login}
        </motion.button>
      </motion.form>
    </div>
  );
}

function UserModal({ user, t, onClose, onSave }) {
  const [form, setForm] = useState(user ?? { nom: "", email: "", password: "", role: roleOptions[0], telephone: "", actif: true, permissions: [] });
  const togglePermission = (code) => {
    const has = form.permissions.includes(code);
    setForm({ ...form, permissions: has ? form.permissions.filter((p) => p !== code) : [...form.permissions, code] });
  };
  return (
    <div className="modal-backdrop">
      <motion.div className="glass modal glow-border" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <h3>{user ? t.editUser : t.createUser}</h3>
        <div className="grid2">
          <input placeholder={t.fullName} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          {!user && <input placeholder={t.password} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {roleOptions.map((r) => <option key={r}>{r}</option>)}
          </select>
          <input placeholder={t.phone} value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
        </div>
        <p>{t.permissions}</p>
        <div className="chips">
          {permissionsCatalogue.map((p) => (
            <button key={p} type="button" className={form.permissions.includes(p) ? "chip active" : "chip"} onClick={() => togglePermission(p)}>{p}</button>
          ))}
        </div>
        <div className="actions">
          <button type="button" className="secondary" onClick={onClose}>{t.cancel}</button>
          <button type="button" onClick={() => onSave(form)}>{user ? t.save : t.create}</button>
        </div>
      </motion.div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [lang, setLang] = useState("fr");
  const [current, setCurrent] = useState("Tableau de bord");
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [urgences, setUrgences] = useState([]);
  const [patients, setPatients] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [plannings, setPlannings] = useState([]);
  const [rapports, setRapports] = useState([]);
  const [salles, setSalles] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [operations, setOperations] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [filters, setFilters] = useState({ q: "", role: "", actif: "" });
  const [modalUser, setModalUser] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [editPatient, setEditPatient] = useState(null);
  const [toast, setToast] = useState("");
  const [urgenceForm, setUrgenceForm] = useState({ patient_id: "", symptome: "" });
  const [patientForm, setPatientForm] = useState({ nom: "", age: "", groupe_sanguin: "", allergies: "", historique: "" });
  const [planningForm, setPlanningForm] = useState({ medecin_id: "", date: "", horaire: "08:00-12:00" });
  const [rapportForm, setRapportForm] = useState({ patient_id: "", diagnostic: "", traitement: "", recommandations: "" });
  const [salleForm, setSalleForm] = useState({ nom: "", type: "consultation", capacite: 1 });
  const [consultForm, setConsultForm] = useState({ patient_id: "", medecin_id: "", date_consultation: "", motif: "" });
  const [operationForm, setOperationForm] = useState({ patient_id: "", salle_id: "", date_operation: "", type_operation: "" });
  const [reservationForm, setReservationForm] = useState({ salle_id: "", patient_id: "", medecin_id: "", date_debut: "", date_fin: "", motif: "" });

  const t = i18n[lang];
  const labels = moduleLabels[lang];
  const modules = session ? roleModules[session.role] || ["Tableau de bord"] : [];
  const theme = session ? roleThemes[session.role] || "theme-admin" : "";
  const dashTitle = session ? dashboardTitles[lang][session.role] : "";

  const medecins = useMemo(() => users.filter((u) => u.role.includes("médecin") || u.role === "chirurgien" || u.role === "spécialiste"), [users]);
  const userNotifications = useMemo(() => notifications.filter((n) => n.utilisateur_id === session?.id), [notifications, session]);
  const unreadCount = userNotifications.filter((n) => n.statut === "non_lu").length;

  const showToast = useCallback((msg, isUrgence = false) => {
    setToast(msg);
    if (isUrgence) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880; gain.gain.value = 0.06;
        osc.start(); osc.stop(ctx.currentTime + 0.25);
      } catch { /* optional */ }
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!session) return;
    const reqs = [
      api("/stats"), api("/urgences"), api("/patients"),
      api(`/notifications?user_id=${session.id}`), api("/plannings"),
      api("/rapports"), api("/salles"), api("/consultations"),
      api("/operations"), api("/reservations"),
    ];
    if (session.role === "administrateur") reqs.unshift(api(`/users?q=${filters.q}&role=${filters.role}&actif=${filters.actif}`));
    const results = await Promise.all(reqs);
    let i = 0;
    if (session.role === "administrateur") setUsers(results[i++]);
    setStats(results[i++]); setUrgences(results[i++]); setPatients(results[i++]);
    setNotifications(results[i++]); setPlannings(results[i++]); setRapports(results[i++]);
    setSalles(results[i++]); setConsultations(results[i++]); setOperations(results[i++]);
    setReservations(results[i++]);
  }, [session, filters.q, filters.role, filters.actif]);

  useEffect(() => { if (session) refresh(); }, [session, refresh]);

  useEffect(() => {
    if (!session) return undefined;
    const socket = io(SOCKET_URL);
    socket.emit("join", session.id);
    socket.on("notification", (n) => {
      if (n.utilisateur_id === session.id) {
        setNotifications((prev) => [n, ...prev]);
        showToast(n.message, n.type === "urgence");
      }
    });
    socket.on("urgence", (u) => showToast(`${t.successUrgence}: ${u.niveau} – ${u.patient}`, u.niveau === "critique"));
    socket.on("urgence-update", () => refresh());
    return () => socket.disconnect();
  }, [session, showToast, t.successUrgence, refresh]);

  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(""), 4000); return () => clearTimeout(id); } return undefined; }, [toast]);
  useEffect(() => { if (session && !modules.includes(current)) setCurrent(modules[0]); }, [session, current, modules]);

  const urgenceData = useMemo(() => [
    { name: "Critique", value: urgences.filter((u) => u.niveau === "critique").length, color: "#ef4444" },
    { name: "Moyenne", value: urgences.filter((u) => u.niveau === "moyenne").length, color: "#f59e0b" },
    { name: "Normale", value: urgences.filter((u) => u.niveau === "normale").length, color: "#22c55e" },
  ], [urgences]);

  const barData = useMemo(() => [
    { label: t.patients, val: stats.patients || 0 },
    { label: t.urgences, val: stats.urgences || 0 },
    { label: t.consultations, val: stats.consultations || 0 },
  ], [stats, t]);

  if (!session) return <Login onLogin={setSession} lang={lang} setLang={setLang} />;

  const logout = () => { setToken(null); setSession(null); };

  const saveUser = async (payload) => {
    if (!payload.nom || !payload.email || (!modalUser && !payload.password)) return showToast(t.formIncomplete);
    if (modalUser) await api(`/users/${modalUser.id}`, { method: "PUT", body: JSON.stringify(payload) });
    else await api("/users", { method: "POST", body: JSON.stringify(payload) });
    setOpenModal(false); setModalUser(null); refresh();
  };

  const loadPatientHistory = async (id) => setSelectedPatient(await api(`/patients/${id}/historique`));

  const exportRapport = (r) => exportTextReport(`Rapport_${r.patient_nom}`, [
    `Patient: ${r.patient_nom}`, `Médecin: ${r.medecin_nom}`, `Diagnostic: ${r.diagnostic}`,
    `Traitement: ${r.traitement}`, `Recommandations: ${r.recommandations}`, `Date: ${r.date_rapport}`,
  ]);

  return (
    <div className={`app ${theme}`}>
      <AnimatePresence>{toast && <motion.div className="toast" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{toast}</motion.div>}</AnimatePresence>
      <aside className="glass sidebar glow-border">
        <h2>MedSync</h2>
        <p className="role-badge">{session.role}</p>
        {modules.map((item) => (
          <motion.button key={item} type="button" className={current === item ? "nav active" : "nav"} onClick={() => setCurrent(item)} whileHover={{ x: 4 }}>
            {labels[item] || item}
          </motion.button>
        ))}
      </aside>
      <main>
        <header className="glass topbar glow-border">
          <div>
            <h1>{labels[current] || current}</h1>
            <p>{session.nom} · {dashTitle} · <span className="realtime-dot">{t.realtime}</span></p>
          </div>
          <div className="topbar-actions">
            <button type="button" className="bell" onClick={() => setCurrent("Notifications")} title={t.notifications}>
              🔔{unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
            </button>
            <button type="button" className="secondary" onClick={() => setLang(lang === "fr" ? "en" : "fr")}>{t.lang}</button>
            <button type="button" className="secondary" onClick={logout}>{t.logout}</button>
          </div>
        </header>

        {current === "Tableau de bord" && (
          <section className="grid">
            <motion.div className="glass card hover-glow" whileHover={{ y: -3 }}><h3>{t.users}</h3><p className="stat">{stats.utilisateurs}</p></motion.div>
            <motion.div className="glass card hover-glow" whileHover={{ y: -3 }}><h3>{t.patients}</h3><p className="stat">{stats.patients}</p></motion.div>
            <motion.div className="glass card hover-glow" whileHover={{ y: -3 }}><h3>{t.urgences}</h3><p className="stat">{stats.urgences}</p></motion.div>
            <motion.div className="glass card hover-glow critical-card" whileHover={{ y: -3 }}><h3>{t.critical}</h3><p className="stat">{stats.urgencesCritiques}</p></motion.div>
            <motion.div className="glass card hover-glow" whileHover={{ y: -3 }}><h3>{t.medecinsDispo}</h3><p className="stat">{stats.medecinsDisponibles}</p></motion.div>
            <motion.div className="glass card hover-glow" whileHover={{ y: -3 }}><h3>{t.sallesLibres}</h3><p className="stat">{stats.sallesLibres}</p></motion.div>
            <div className="glass chart"><h3>{t.breakdown}</h3><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={urgenceData} dataKey="value" nameKey="name" outerRadius={75}>{urgenceData.map((e) => <Cell key={e.name} fill={e.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
            <div className="glass chart"><h3>{t.recent}</h3><ResponsiveContainer width="100%" height={220}><BarChart data={barData}><XAxis dataKey="label" /><YAxis /><Bar dataKey="val" fill="#00b0f4" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
            <div className="glass card wide"><h3>{t.recent}</h3>{urgences.slice(0, 5).map((u) => <div key={u.id} className="mini-item">{u.patient_nom} – <span className={`tag ${u.niveau}`}>{u.niveau}</span> – {u.statut}</div>)}</div>
          </section>
        )}

        {current === "Utilisateurs" && (
          <section className="glass tableWrap">
            <div className="filters">
              <input placeholder={t.search} value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
              <select value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}><option value="">{t.allRoles}</option>{roleOptions.map((r) => <option key={r}>{r}</option>)}</select>
              <select value={filters.actif} onChange={(e) => setFilters({ ...filters, actif: e.target.value })}><option value="">{t.activeAll}</option><option value="1">{t.active}</option><option value="0">{t.inactive}</option></select>
              <button type="button" onClick={() => { setModalUser(null); setOpenModal(true); }}>{t.createUser}</button>
            </div>
            <table><thead><tr><th>{t.name}</th><th>Email</th><th>{t.status}</th><th>Rôle</th><th>Connexion</th><th>Actions</th></tr></thead>
              <tbody>{users.map((u) => (
                <tr key={u.id}><td>{u.nom}</td><td>{u.email}</td><td>{u.actif ? t.active : t.inactive}</td><td><span className={`badge role-${u.role.split(" ")[0]}`}>{u.role}</span></td><td>{u.derniere_connexion || t.never}</td>
                  <td className="rowActions">
                    <button type="button" onClick={() => { setModalUser(u); setOpenModal(true); }}>{t.edit}</button>
                    <button type="button" className="secondary" onClick={async () => { await api(`/users/${u.id}/toggle`, { method: "PATCH" }); refresh(); }}>{u.actif ? t.disable : t.enable}</button>
                    <button type="button" className="secondary" onClick={async () => { await api(`/users/${u.id}/reset-password`, { method: "PATCH" }); showToast(t.pwdReset); }}>{t.resetPwd}</button>
                    <button type="button" className="danger" onClick={async () => { if (confirm(t.confirmDelete)) { await api(`/users/${u.id}`, { method: "DELETE" }); refresh(); } }}>{t.delete}</button>
                    <button type="button" className="secondary" onClick={async () => setSelectedUser(await api(`/users/${u.id}`))}>{t.details}</button>
                  </td></tr>
              ))}</tbody></table>
          </section>
        )}

        {current === "Urgences" && (
          <section className="glass list">
            <h3>{t.emergencyCenter}</h3>
            {(session.role === "infirmier" || session.role === "administrateur") && (
              <form className="inline-form" onSubmit={async (e) => { e.preventDefault(); const res = await api("/urgences", { method: "POST", body: JSON.stringify({ ...urgenceForm, patient_id: Number(urgenceForm.patient_id) }) }); showToast(`${t.successUrgence}: ${res.niveau}`, res.niveau === "critique"); setUrgenceForm({ patient_id: "", symptome: "" }); refresh(); }}>
                <select required value={urgenceForm.patient_id} onChange={(e) => setUrgenceForm({ ...urgenceForm, patient_id: e.target.value })}><option value="">{t.patient}</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select>
                <input required placeholder={t.symptom} value={urgenceForm.symptome} onChange={(e) => setUrgenceForm({ ...urgenceForm, symptome: e.target.value })} />
                <button type="submit">{t.createUrgence}</button>
              </form>
            )}
            {urgences.map((u) => (
              <motion.div className="item hover-glow" key={u.id} whileHover={{ scale: 1.01 }}>
                <strong>{u.patient_nom}</strong> – {u.symptome}
                <span className={`tag ${u.niveau}`}>{u.niveau}</span><span className="badge">{u.statut}</span>
                {u.medecin_nom && <span className="badge">{u.medecin_nom}</span>}
                {(session.role.includes("médecin") || session.role === "administrateur" || session.role === "chirurgien" || session.role === "spécialiste") && u.statut !== "Traité" && (
                  <button type="button" className="secondary" onClick={async () => { await api(`/urgences/${u.id}/statut`, { method: "PATCH", body: JSON.stringify({ statut: "Traité" }) }); refresh(); }}>{t.markTreated}</button>
                )}
              </motion.div>
            ))}
          </section>
        )}

        {current === "Patients" && (
          <section className="glass list">
            <h3>{t.records}</h3>
            {(session.role === "secrétaire médicale" || session.role === "administrateur") && (
              <form className="inline-form grid2" onSubmit={async (e) => { e.preventDefault(); await api("/patients", { method: "POST", body: JSON.stringify({ ...patientForm, age: Number(patientForm.age) }) }); setPatientForm({ nom: "", age: "", groupe_sanguin: "", allergies: "", historique: "" }); refresh(); }}>
                <input required placeholder={t.name} value={patientForm.nom} onChange={(e) => setPatientForm({ ...patientForm, nom: e.target.value })} />
                <input required type="number" placeholder={t.age} value={patientForm.age} onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })} />
                <input placeholder={t.blood} value={patientForm.groupe_sanguin} onChange={(e) => setPatientForm({ ...patientForm, groupe_sanguin: e.target.value })} />
                <input placeholder={t.allergies} value={patientForm.allergies} onChange={(e) => setPatientForm({ ...patientForm, allergies: e.target.value })} />
                <input placeholder={t.history} value={patientForm.historique} onChange={(e) => setPatientForm({ ...patientForm, historique: e.target.value })} />
                <button type="submit">{t.createPatient}</button>
              </form>
            )}
            {patients.map((p) => (
              <div className="item" key={p.id}>
                <strong>{p.nom}</strong> – {p.age} – {p.groupe_sanguin}
                <div className="mini">{t.allergies}: {p.allergies || "-"} | {t.history}: {p.historique || "-"}</div>
                <div className="rowActions">
                  <button type="button" className="secondary" onClick={() => loadPatientHistory(p.id)}>{t.viewHistory}</button>
                  {(session.role === "administrateur" || session.role === "secrétaire médicale") && (
                    <>
                      <button type="button" onClick={() => setEditPatient({ ...p })}>{t.edit}</button>
                      {session.role === "administrateur" && <button type="button" className="danger" onClick={async () => { if (confirm(t.confirmDelete)) { await api(`/patients/${p.id}`, { method: "DELETE" }); refresh(); } }}>{t.delete}</button>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {current === "Consultations" && (
          <section className="glass list">
            <h3>{t.consultations}</h3>
            {(session.role === "secrétaire médicale" || session.role === "administrateur") && (
              <form className="inline-form grid2" onSubmit={async (e) => { e.preventDefault(); await api("/consultations", { method: "POST", body: JSON.stringify({ ...consultForm, patient_id: Number(consultForm.patient_id), medecin_id: Number(consultForm.medecin_id) }) }); setConsultForm({ patient_id: "", medecin_id: "", date_consultation: "", motif: "" }); refresh(); }}>
                <select required value={consultForm.patient_id} onChange={(e) => setConsultForm({ ...consultForm, patient_id: e.target.value })}><option value="">{t.patient}</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select>
                <select required value={consultForm.medecin_id} onChange={(e) => setConsultForm({ ...consultForm, medecin_id: e.target.value })}><option value="">{t.doctor}</option>{medecins.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}</select>
                <input required type="datetime-local" value={consultForm.date_consultation} onChange={(e) => setConsultForm({ ...consultForm, date_consultation: e.target.value })} />
                <input required placeholder={t.motif} value={consultForm.motif} onChange={(e) => setConsultForm({ ...consultForm, motif: e.target.value })} />
                <button type="submit">{t.createConsult}</button>
              </form>
            )}
            {consultations.map((c) => (
              <div className="item" key={c.id}>{c.patient_nom} – {c.medecin_nom} – {c.date_consultation} – {c.motif}
                <span className="badge">{c.statut}</span>
                {c.statut !== "Terminée" && (session.role.includes("médecin") || session.role === "administrateur" || session.role === "secrétaire médicale") && (
                  <button type="button" className="secondary" onClick={async () => { await api(`/consultations/${c.id}/statut`, { method: "PATCH", body: JSON.stringify({ statut: "Terminée" }) }); refresh(); }}>{t.done}</button>
                )}
              </div>
            ))}
          </section>
        )}

        {current === "Notifications" && (
          <section className="glass list"><h3>{t.notifications}</h3>
            {userNotifications.map((n) => (
              <div className={`item ${n.statut === "non_lu" ? "unread" : ""}`} key={n.id}>{n.message} ({n.type})
                {n.statut === "non_lu" && <button type="button" className="secondary" onClick={async () => { await api(`/notifications/${n.id}/read`, { method: "PATCH" }); refresh(); }}>{t.markRead}</button>}
              </div>
            ))}
          </section>
        )}

        {current === "Planning" && (
          <section className="glass list"><h3>{t.smartSchedule}</h3>
            {(session.role === "administrateur" || session.role === "secrétaire médicale") && (
              <form className="inline-form" onSubmit={async (e) => { e.preventDefault(); try { await api("/plannings", { method: "POST", body: JSON.stringify({ ...planningForm, medecin_id: Number(planningForm.medecin_id) }) }); setPlanningForm({ medecin_id: "", date: "", horaire: "08:00-12:00" }); refresh(); } catch (err) { showToast(err.message.includes("Conflit") ? t.conflict : err.message); } }}>
                <select required value={planningForm.medecin_id} onChange={(e) => setPlanningForm({ ...planningForm, medecin_id: e.target.value })}><option value="">{t.doctor}</option>{medecins.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}</select>
                <input required type="date" value={planningForm.date} onChange={(e) => setPlanningForm({ ...planningForm, date: e.target.value })} />
                <select value={planningForm.horaire} onChange={(e) => setPlanningForm({ ...planningForm, horaire: e.target.value })}><option>08:00-12:00</option><option>14:00-18:00</option><option>20:00-08:00</option></select>
                <button type="submit">{t.createPlanning}</button>
              </form>
            )}
            <div className="calendar-grid">{plannings.map((p) => (
              <div className="calendar-slot" key={p.id}><strong>{p.medecin}</strong><span>{p.date}</span><span>{p.horaire}</span>
                {session.role === "administrateur" && <button type="button" className="danger" onClick={async () => { await api(`/plannings/${p.id}`, { method: "DELETE" }); refresh(); }}>{t.remove}</button>}
              </div>
            ))}</div>
          </section>
        )}

        {current === "Rapports" && (
          <section className="glass list"><h3>{t.reports}</h3>
            {(session.role.includes("médecin") || session.role === "chirurgien" || session.role === "spécialiste" || session.role === "administrateur") && (
              <form className="inline-form grid2" onSubmit={async (e) => { e.preventDefault(); await api("/rapports", { method: "POST", body: JSON.stringify({ ...rapportForm, patient_id: Number(rapportForm.patient_id) }) }); setRapportForm({ patient_id: "", diagnostic: "", traitement: "", recommandations: "" }); refresh(); }}>
                <select required value={rapportForm.patient_id} onChange={(e) => setRapportForm({ ...rapportForm, patient_id: e.target.value })}><option value="">{t.patient}</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select>
                <input required placeholder={t.diagnostic} value={rapportForm.diagnostic} onChange={(e) => setRapportForm({ ...rapportForm, diagnostic: e.target.value })} />
                <input placeholder={t.treatment} value={rapportForm.traitement} onChange={(e) => setRapportForm({ ...rapportForm, traitement: e.target.value })} />
                <input placeholder={t.recommendations} value={rapportForm.recommandations} onChange={(e) => setRapportForm({ ...rapportForm, recommandations: e.target.value })} />
                <button type="submit">{t.createReport}</button>
              </form>
            )}
            {rapports.map((r) => (
              <div className="item" key={r.id}><strong>{r.patient_nom}</strong> – {r.diagnostic}<div className="mini">{r.medecin_nom} | {r.traitement}</div>
                <button type="button" className="secondary" onClick={() => exportRapport(r)}>{t.exportPdf}</button>
              </div>
            ))}
          </section>
        )}

        {current === "Salles" && (
          <section className="glass list"><h3>{t.rooms}</h3>
            {session.role === "administrateur" && (
              <form className="inline-form" onSubmit={async (e) => { e.preventDefault(); await api("/salles", { method: "POST", body: JSON.stringify({ ...salleForm, capacite: Number(salleForm.capacite) }) }); setSalleForm({ nom: "", type: "consultation", capacite: 1 }); refresh(); }}>
                <input required placeholder={t.roomName} value={salleForm.nom} onChange={(e) => setSalleForm({ ...salleForm, nom: e.target.value })} />
                <select value={salleForm.type} onChange={(e) => setSalleForm({ ...salleForm, type: e.target.value })}><option value="consultation">Consultation</option><option value="bloc">Bloc</option><option value="urgence">Urgence</option></select>
                <input type="number" min="1" value={salleForm.capacite} onChange={(e) => setSalleForm({ ...salleForm, capacite: e.target.value })} />
                <button type="submit">{t.createRoom}</button>
              </form>
            )}
            {(session.role === "administrateur" || session.role === "secrétaire médicale" || session.role === "chirurgien") && (
              <form className="inline-form grid2" onSubmit={async (e) => { e.preventDefault(); await api("/reservations", { method: "POST", body: JSON.stringify({ ...reservationForm, salle_id: Number(reservationForm.salle_id), patient_id: Number(reservationForm.patient_id), medecin_id: reservationForm.medecin_id ? Number(reservationForm.medecin_id) : null }) }); setReservationForm({ salle_id: "", patient_id: "", medecin_id: "", date_debut: "", date_fin: "", motif: "" }); refresh(); }}>
                <select required value={reservationForm.salle_id} onChange={(e) => setReservationForm({ ...reservationForm, salle_id: e.target.value })}><option value="">{t.rooms}</option>{salles.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</select>
                <select required value={reservationForm.patient_id} onChange={(e) => setReservationForm({ ...reservationForm, patient_id: e.target.value })}><option value="">{t.patient}</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select>
                <input required type="datetime-local" value={reservationForm.date_debut} onChange={(e) => setReservationForm({ ...reservationForm, date_debut: e.target.value })} />
                <input required type="datetime-local" value={reservationForm.date_fin} onChange={(e) => setReservationForm({ ...reservationForm, date_fin: e.target.value })} />
                <button type="submit">{t.createReservation}</button>
              </form>
            )}
            {salles.map((s) => (
              <div className="item" key={s.id}><strong>{s.nom}</strong> – {s.type}
                <span className={`tag ${s.statut === "libre" ? "normale" : "moyenne"}`}>{s.statut}</span><span className="badge">{s.capacite} {t.places}</span>
                <button type="button" className="secondary" onClick={async () => { await api(`/salles/${s.id}/statut`, { method: "PATCH", body: JSON.stringify({ statut: s.statut === "libre" ? "occupée" : "libre" }) }); refresh(); }}>{t.toggleStatus}</button>
              </div>
            ))}
            {reservations.length > 0 && <h4>{t.reservation}</h4>}
            {reservations.map((r) => <div className="mini-item" key={r.id}>{r.salle_nom} – {r.patient_nom} – {r.date_debut} → {r.date_fin}</div>)}
          </section>
        )}

        {current === "Opérations" && (
          <section className="glass list"><h3>{t.operations}</h3>
            {(session.role === "chirurgien" || session.role === "administrateur") && (
              <form className="inline-form grid2" onSubmit={async (e) => { e.preventDefault(); await api("/operations", { method: "POST", body: JSON.stringify({ ...operationForm, patient_id: Number(operationForm.patient_id), salle_id: operationForm.salle_id ? Number(operationForm.salle_id) : null }) }); setOperationForm({ patient_id: "", salle_id: "", date_operation: "", type_operation: "" }); refresh(); }}>
                <select required value={operationForm.patient_id} onChange={(e) => setOperationForm({ ...operationForm, patient_id: e.target.value })}><option value="">{t.patient}</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select>
                <select value={operationForm.salle_id} onChange={(e) => setOperationForm({ ...operationForm, salle_id: e.target.value })}><option value="">{t.rooms}</option>{salles.filter((s) => s.type === "bloc").map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</select>
                <input required type="datetime-local" value={operationForm.date_operation} onChange={(e) => setOperationForm({ ...operationForm, date_operation: e.target.value })} />
                <input required placeholder={t.operationType} value={operationForm.type_operation} onChange={(e) => setOperationForm({ ...operationForm, type_operation: e.target.value })} />
                <button type="submit">{t.createOperation}</button>
              </form>
            )}
            {operations.map((o) => (
              <div className="item" key={o.id}><strong>{o.patient_nom}</strong> – {o.type_operation} – {o.date_operation}
                <span className="badge">{o.statut}</span>{o.salle_nom && <span className="badge">{o.salle_nom}</span>}
                {o.statut !== "terminée" && (session.role === "chirurgien" || session.role === "administrateur") && (
                  <button type="button" className="secondary" onClick={async () => { await api(`/operations/${o.id}/statut`, { method: "PATCH", body: JSON.stringify({ statut: "terminée" }) }); refresh(); }}>{t.done}</button>
                )}
              </div>
            ))}
          </section>
        )}
      </main>

      {openModal && <UserModal user={modalUser} t={t} onClose={() => setOpenModal(false)} onSave={saveUser} />}
      {selectedUser && (
        <div className="modal-backdrop" onClick={() => setSelectedUser(null)}>
          <div className="glass modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t.userDetails}</h3><p><strong>{t.name}:</strong> {selectedUser.nom}</p><p><strong>Email:</strong> {selectedUser.email}</p>
            <p><strong>Rôle:</strong> {selectedUser.role}</p><p><strong>{t.phone}:</strong> {selectedUser.telephone || "-"}</p>
            <p><strong>{t.permissions}:</strong> {selectedUser.permissions?.join(", ") || "-"}</p>
          </div>
        </div>
      )}
      {editPatient && (
        <div className="modal-backdrop" onClick={() => setEditPatient(null)}>
          <div className="glass modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t.edit} {editPatient.nom}</h3>
            <div className="grid2">
              <input value={editPatient.nom} onChange={(e) => setEditPatient({ ...editPatient, nom: e.target.value })} />
              <input type="number" value={editPatient.age} onChange={(e) => setEditPatient({ ...editPatient, age: e.target.value })} />
              <input value={editPatient.groupe_sanguin || ""} onChange={(e) => setEditPatient({ ...editPatient, groupe_sanguin: e.target.value })} />
              <input value={editPatient.allergies || ""} onChange={(e) => setEditPatient({ ...editPatient, allergies: e.target.value })} />
              <input value={editPatient.historique || ""} onChange={(e) => setEditPatient({ ...editPatient, historique: e.target.value })} />
            </div>
            <div className="actions">
              <button type="button" className="secondary" onClick={() => setEditPatient(null)}>{t.cancel}</button>
              <button type="button" onClick={async () => { await api(`/patients/${editPatient.id}`, { method: "PUT", body: JSON.stringify({ ...editPatient, age: Number(editPatient.age) }) }); setEditPatient(null); refresh(); }}>{t.save}</button>
            </div>
          </div>
        </div>
      )}
      {selectedPatient && (
        <div className="modal-backdrop" onClick={() => setSelectedPatient(null)}>
          <div className="glass modal wide-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t.viewHistory}: {selectedPatient.patient.nom}</h3>
            <p>{t.allergies}: {selectedPatient.patient.allergies} | {t.history}: {selectedPatient.patient.historique}</p>
            <h4>{t.reports}</h4>{selectedPatient.rapports.map((r) => <div className="mini-item" key={r.id}>{r.diagnostic} – {r.traitement}</div>)}
            <h4>{t.consultations}</h4>{selectedPatient.consultations.map((c) => <div className="mini-item" key={c.id}>{c.motif} – {c.date_consultation}</div>)}
            <h4>{t.urgences}</h4>{selectedPatient.urgences.map((u) => <div className="mini-item" key={u.id}>{u.symptome} – <span className={`tag ${u.niveau}`}>{u.niveau}</span></div>)}
            <h4>{t.operations}</h4>{selectedPatient.operations.map((o) => <div className="mini-item" key={o.id}>{o.type_operation} – {o.date_operation}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
