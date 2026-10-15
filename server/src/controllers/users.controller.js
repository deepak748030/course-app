import { User } from '../models/User.js';
import { revokeUserSockets } from '../realtime/socket.js';
import { HttpError, asyncHandler } from '../utils/http.js';
import { purgeUserData, releaseAvatar } from './shared.js';

/** PATCH /api/users/me — the learner edits their own profile (app Profile → Edit). */
export const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'avatarUrl', 'city', 'goal', 'interests'];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));

  const previousAvatar = req.user.avatarUrl;
  const user = await User.findByIdAndUpdate(req.user._id, patch, { new: true, runValidators: true });
  // A replaced photo leaves storage, so only the current one is ever kept (and deleted with the account).
  if ('avatarUrl' in patch && previousAvatar && previousAvatar !== user.avatarUrl) {
    void releaseAvatar(previousAvatar, user._id);
  }
  res.json({ user });
});

/**
 * DELETE /api/users/me — the learner deletes their own account, which Google Play asks every
 * account-creating app to offer in the app itself. purgeUserData removes everything the privacy
 * policy says goes with it (the same cascade as the admin's user delete), then this session's
 * sockets are closed: after this the number can sign in again as a brand-new account.
 */
export const deleteMe = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.user._id);
  if (!user) throw new HttpError(404, 'User not found');

  await purgeUserData(user);
  revokeUserSockets(String(user._id));
  res.json({ ok: true });
});
