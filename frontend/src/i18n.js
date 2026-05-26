export const roleOptions = [
  "administrateur",
  "médecin généraliste",
  "spécialiste",
  "chirurgien",
  "infirmier",
  "secrétaire médicale",
];

export const allModules = [
  "Tableau de bord",
  "Utilisateurs",
  "Urgences",
  "Patients",
  "Consultations",
  "Notifications",
  "Planning",
  "Rapports",
  "Salles",
  "Opérations",
];

export const roleModules = {
  administrateur: allModules,
  "médecin généraliste": ["Tableau de bord", "Urgences", "Patients", "Consultations", "Notifications", "Planning", "Rapports"],
  spécialiste: ["Tableau de bord", "Urgences", "Patients", "Consultations", "Notifications", "Rapports"],
  chirurgien: ["Tableau de bord", "Urgences", "Patients", "Notifications", "Salles", "Opérations"],
  infirmier: ["Tableau de bord", "Urgences", "Patients", "Notifications"],
  "secrétaire médicale": ["Tableau de bord", "Patients", "Consultations", "Planning", "Notifications", "Salles"],
};

export const roleThemes = {
  administrateur: "theme-admin",
  "médecin généraliste": "theme-medecin",
  spécialiste: "theme-specialiste",
  chirurgien: "theme-chirurgien",
  infirmier: "theme-infirmier",
  "secrétaire médicale": "theme-secretaire",
};

export const quotes = [
  "Every second matters.",
  "Smart coordination saves lives.",
  "Technology supporting medical excellence.",
  "Chaque seconde compte.",
  "La coordination intelligente sauve des vies.",
];

export const permissionsCatalogue = ["users.read", "users.write", "urgences.read", "urgences.write", "patients.read", "stats.read"];

const fr = {
  login: "Se connecter", logout: "Déconnexion", loading: "Connexion...",
  subtitle: "Chaque seconde compte. Coordination intelligente des urgences.",
  invalid: "Identifiants invalides.", lang: "EN", password: "Mot de passe",
  users: "Utilisateurs", patients: "Patients", urgences: "Urgences",
  notifications: "Notifications", planning: "Planning", reports: "Rapports",
  rooms: "Salles", consultations: "Consultations", operations: "Opérations",
  createUrgence: "Déclarer urgence", createPatient: "Ajouter patient",
  createPlanning: "Ajouter créneau", createReport: "Nouveau rapport",
  createRoom: "Ajouter salle", createConsult: "Planifier consultation",
  createOperation: "Programmer opération", createReservation: "Réserver salle",
  conflict: "Conflit de planning détecté.", successUrgence: "Urgence créée",
  critical: "Urgences critiques", breakdown: "Répartition des urgences",
  recent: "Activité récente", search: "Recherche nom/email", allRoles: "Tous les rôles",
  activeAll: "Actif + Inactif", active: "Actif", inactive: "Inactif",
  createUser: "Créer utilisateur", edit: "Modifier", disable: "Désactiver",
  enable: "Activer", resetPwd: "Réinit. MDP", delete: "Supprimer", details: "Détails",
  confirmDelete: "Confirmer la suppression ?", emergencyCenter: "Centre des urgences",
  patient: "Patient", symptom: "Symptôme principal", markTreated: "Marquer traité",
  records: "Dossiers patients", name: "Nom", age: "Âge", blood: "Groupe sanguin",
  allergies: "Allergies", history: "Historique", markRead: "Marquer lu",
  smartSchedule: "Planning médical intelligent", doctor: "Médecin", remove: "Supprimer",
  diagnostic: "Diagnostic", treatment: "Traitement", recommendations: "Recommandations",
  roomName: "Nom salle", places: "places", toggleStatus: "Basculer statut",
  free: "libre", occupied: "occupée", exportPdf: "Exporter PDF",
  viewHistory: "Historique", save: "Enregistrer", cancel: "Annuler", create: "Créer",
  motif: "Motif", date: "Date", scheduled: "Planifiée", done: "Terminée",
  operationType: "Type d'opération", reservation: "Réservation", medecinsDispo: "Médecins disponibles",
  sallesLibres: "Salles libres", consultPlanned: "Consultations planifiées",
  welcome: "Bienvenue", dashboardAdmin: "Supervision système", dashboardMedecin: "Suivi médical",
  dashboardInfirmier: "Surveillance patients", dashboardChirurgien: "Bloc opératoire",
  dashboardSecretaire: "Accueil & rendez-vous", dashboardSpecialiste: "Cas spécialisés",
  realtime: "Temps réel actif", pwdReset: "Mot de passe réinitialisé.",
  formIncomplete: "Veuillez compléter le formulaire.", never: "Jamais", status: "Statut",
  permissions: "Permissions", phone: "Téléphone", fullName: "Nom complet",
  userDetails: "Détails utilisateur", editUser: "Modifier utilisateur",
};

const en = {
  login: "Sign in", logout: "Logout", loading: "Signing in...",
  subtitle: "Every second matters. Smart emergency coordination.",
  invalid: "Invalid credentials.", lang: "FR", password: "Password",
  users: "Users", patients: "Patients", urgences: "Emergencies",
  notifications: "Notifications", planning: "Schedule", reports: "Reports",
  rooms: "Rooms", consultations: "Appointments", operations: "Operations",
  createUrgence: "Report emergency", createPatient: "Add patient",
  createPlanning: "Add slot", createReport: "New report",
  createRoom: "Add room", createConsult: "Schedule appointment",
  createOperation: "Schedule operation", createReservation: "Book room",
  conflict: "Schedule conflict detected.", successUrgence: "Emergency created",
  critical: "Critical emergencies", breakdown: "Emergency breakdown",
  recent: "Recent activity", search: "Search name/email", allRoles: "All roles",
  activeAll: "Active + Inactive", active: "Active", inactive: "Inactive",
  createUser: "Create user", edit: "Edit", disable: "Disable",
  enable: "Enable", resetPwd: "Reset pwd", delete: "Delete", details: "Details",
  confirmDelete: "Confirm deletion?", emergencyCenter: "Emergency center",
  patient: "Patient", symptom: "Main symptom", markTreated: "Mark treated",
  records: "Patient records", name: "Name", age: "Age", blood: "Blood type",
  allergies: "Allergies", history: "History", markRead: "Mark read",
  smartSchedule: "Smart medical schedule", doctor: "Doctor", remove: "Remove",
  diagnostic: "Diagnosis", treatment: "Treatment", recommendations: "Recommendations",
  roomName: "Room name", places: "seats", toggleStatus: "Toggle status",
  free: "free", occupied: "occupied", exportPdf: "Export PDF",
  viewHistory: "History", save: "Save", cancel: "Cancel", create: "Create",
  motif: "Reason", date: "Date", scheduled: "Scheduled", done: "Completed",
  operationType: "Operation type", reservation: "Booking", medecinsDispo: "Available doctors",
  sallesLibres: "Free rooms", consultPlanned: "Scheduled appointments",
  welcome: "Welcome", dashboardAdmin: "System supervision", dashboardMedecin: "Medical follow-up",
  dashboardInfirmier: "Patient monitoring", dashboardChirurgien: "Operating block",
  dashboardSecretaire: "Reception & appointments", dashboardSpecialiste: "Specialized cases",
  realtime: "Real-time active", pwdReset: "Password reset.",
  formIncomplete: "Please complete the form.", never: "Never", status: "Status",
  permissions: "Permissions", phone: "Phone", fullName: "Full name",
  userDetails: "User details", editUser: "Edit user",
};

export const moduleLabels = {
  fr: Object.fromEntries(allModules.map((m) => [m, m === "Consultations" ? "Consultations" : m === "Opérations" ? "Opérations" : m])),
  en: {
    "Tableau de bord": "Dashboard", Utilisateurs: "Users", Urgences: "Emergencies",
    Patients: "Patients", Consultations: "Appointments", Notifications: "Notifications",
    Planning: "Schedule", Rapports: "Reports", Salles: "Rooms", Opérations: "Operations",
  },
};

export const dashboardTitles = {
  fr: {
    administrateur: fr.dashboardAdmin, "médecin généraliste": fr.dashboardMedecin,
    spécialiste: fr.dashboardSpecialiste, chirurgien: fr.dashboardChirurgien,
    infirmier: fr.dashboardInfirmier, "secrétaire médicale": fr.dashboardSecretaire,
  },
  en: {
    administrateur: en.dashboardAdmin, "médecin généraliste": en.dashboardMedecin,
    spécialiste: en.dashboardSpecialiste, chirurgien: en.dashboardChirurgien,
    infirmier: en.dashboardInfirmier, "secrétaire médicale": en.dashboardSecretaire,
  },
};

export const i18n = { fr, en };
