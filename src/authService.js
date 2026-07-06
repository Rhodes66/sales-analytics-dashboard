const crypto = require('crypto');

const users = [
  {
    id: 1,
    name: 'Sales Manager',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'sales_manager'
  },
  {
    id: 2,
    name: 'Data Analyst',
    email: 'analyst@example.com',
    password: 'analyst123',
    role: 'data_analyst'
  },
  {
    id: 3,
    name: 'Viewer',
    email: 'viewer@example.com',
    password: 'viewer123',
    role: 'viewer'
  }
];

const sessions = new Map();

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

function login(email, password) {
  const user = users.find((item) => item.email === email && item.password === password);
  if (!user) return null;

  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, sanitizeUser(user));
  return { token, user: sanitizeUser(user) };
}

function getUserByToken(token) {
  return sessions.get(token) || null;
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.replace('Bearer ', '') : '';
  const user = getUserByToken(token);

  if (!user) {
    return res.status(401).json({ message: 'Unauthorized. Please login first.' });
  }

  req.user = user;
  return next();
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden. You do not have permission.' });
    }
    return next();
  };
}

module.exports = {
  users,
  login,
  requireAuth,
  requireRole
};
