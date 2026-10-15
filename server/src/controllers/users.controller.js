import { User } from '../models/User.js';
import { OtpCode } from '../models/OtpCode.js';
import { Order } from '../models/Order.js';
import { Enrollment } from '../models/Enrollment.js';
import { PushToken } from '../models/PushToken.js';
import { Review } from '../models/Review.js';
import { revokeUserSockets } from '../realtime/socket.js';
import { HttpError, asyncHandler } from '../utils/http.js';

/** PATCH /api/users/me — the learner edits their own profile (app Profile → Edit). */
export const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'avatarUrl', 'city', 'goal', 'interests'];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));

  const user = await User.findByIdAndUpdate(req.user._id, patch, { new: true, runValidators: true });
  res.json({ user });
});

/**
 * DELETE /api/users/me — the learner deletes their own account, which Google Play asks every
 * account-creating app to offer in the app itself. The cascade mirrors the admin's user delete
 * (orders, enrollments, reviews, push tokens), plus the phone's live OTP and this session's
 * sockets: after this the number can sign in again as a brand-new account.
 */
export const deleteMe = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.user._id);
  if (!user) throw new HttpError(404, 'User not found');

  await Promise.all([
    Order.deleteMany({ user: user._id }),
    Enrollment.deleteMany({ user: user._id }),
    Review.deleteMany({ user: user._id }),
    PushToken.deleteMany({ user: user._id }),
    user.phone ? OtpCode.deleteMany({ phone: user.phone }) : Promise.resolve(),
  ]);
  revokeUserSockets(String(user._id));
  res.json({ ok: true });
});
