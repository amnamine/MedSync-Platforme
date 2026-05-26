const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "medsync-secret-2026";

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(plain, stored) {
  if (!stored) return false;
  if (stored.startsWith("$2")) return bcrypt.compare(plain, stored);
  return plain === stored;
}

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email, nom: user.nom }, JWT_SECRET, { expiresIn: "24h" });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentification requise." });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Session expirée ou token invalide." });
  }
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Accès refusé pour ce rôle." });
    }
    next();
  };
}

module.exports = { hashPassword, verifyPassword, signToken, authMiddleware, requireRoles, JWT_SECRET };
