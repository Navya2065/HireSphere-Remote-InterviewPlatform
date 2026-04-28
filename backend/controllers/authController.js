const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

exports.signup = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'name, email, password, role are required' });
  }
  if (!['candidate', 'interviewer'].includes(role)) {
    return res.status(400).json({ message: 'role must be candidate or interviewer' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ message: 'Email already registered' });

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name, email, passwordHash, role });
  const token = signToken(user);
  res.status(201).json({ token, user: user.toSafeJSON() });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await user.verifyPassword(password);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const token = signToken(user);
  res.json({ token, user: user.toSafeJSON() });
};

exports.me = async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
};

// Used by the interviewer when scheduling an interview — needs a list of candidates
exports.listCandidates = async (_req, res) => {
  const candidates = await User.find({ role: 'candidate' }).select('name email role').sort({ name: 1 });
  res.json({ candidates });
};
