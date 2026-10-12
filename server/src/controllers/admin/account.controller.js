import bcrypt from 'bcryptjs';
import { User } from '../../models/User.js';
import { HttpError, asyncHandler } from '../../utils/http.js';

/** PATCH /api/admin/account — change the admin's username (login email) and/or password. */
export const updateAccount = asyncHandler(async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  if (!user || !user.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new HttpError(401, 'The current password is incorrect');
  }

  if (email && email !== user.email) {
    const taken = await User.exists({ email, _id: { $ne: user._id } });
    if (taken) throw new HttpError(409, 'That username is already used by another account');
    user.email = email;
  }
  if (newPassword) user.passwordHash = await bcrypt.hash(newPassword, 10);

  await user.save();
  res.json({ user });
});
