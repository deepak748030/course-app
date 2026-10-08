import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { emitToAdmins } from '../realtime/socket.js';
import { signToken } from '../utils/token.js';
import { HttpError, asyncHandler } from '../utils/http.js';

/** POST /api/auth/register — learners (and bootstrap admins via API, role stays 'user'). */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new HttpError(409, 'An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, phone: phone || '' });

  emitToAdmins('user.registered', { name: user.name, email: user.email });
  res.status(201).json({ token: signToken(user), user });
});

/** POST /api/auth/login — used by both the app and the admin dashboard. */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  // Same message for unknown email and wrong password — no account probing.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Incorrect email or password');
  }
  if (user.blocked) throw new HttpError(403, 'This account is blocked');

  user.lastLoginAt = new Date();
  await user.save();

  res.json({ token: signToken(user), user });
});

/** GET /api/auth/me */
export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
