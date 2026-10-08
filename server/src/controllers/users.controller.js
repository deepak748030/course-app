import { User } from '../models/User.js';
import { asyncHandler } from '../utils/http.js';

/** PATCH /api/users/me — the learner edits their own profile (app Profile → Edit). */
export const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'avatarUrl', 'dateOfBirth', 'city', 'goal', 'interests'];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));

  const user = await User.findByIdAndUpdate(req.user._id, patch, { new: true, runValidators: true });
  res.json({ user });
});
