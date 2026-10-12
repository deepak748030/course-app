import { revokeUserSockets } from '../../realtime/socket.js';
import { Enrollment } from '../../models/Enrollment.js';
import { PushToken } from '../../models/PushToken.js';
import { Order } from '../../models/Order.js';
import { Review } from '../../models/Review.js';
import { User } from '../../models/User.js';
import { HttpError, asyncHandler } from '../../utils/http.js';

/** GET /api/admin/users — search + role/blocked filters + enrollment counts. */
export const listUsers = asyncHandler(async (req, res) => {
  const { search, role, blocked } = req.validatedQuery;

  const filter = {};
  if (role) filter.role = role;
  if (blocked === 'true') filter.blocked = true;
  if (blocked === 'false') filter.blocked = false;
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }

  const users = await User.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  const counts = await Enrollment.aggregate([
    { $match: { user: { $in: users.map((u) => u._id) } } },
    { $group: { _id: '$user', count: { $sum: 1 } } },
  ]);
  const spent = await Order.aggregate([
    { $match: { user: { $in: users.map((u) => u._id) }, status: 'paid' } },
    { $group: { _id: '$user', total: { $sum: '$amountInr' } } },
  ]);
  const countByUser = new Map(counts.map((c) => [String(c._id), c.count]));
  const spentByUser = new Map(spent.map((s) => [String(s._id), s.total]));

  res.json({
    users: users.map((user) => ({
      ...user,
      enrollmentCount: countByUser.get(String(user._id)) || 0,
      totalSpentInr: spentByUser.get(String(user._id)) || 0,
    })),
  });
});

/** GET /api/admin/users/:id — detail drawer: profile, enrollments, orders. */
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) throw new HttpError(404, 'User not found');

  const [enrollments, orders] = await Promise.all([
    Enrollment.find({ user: user._id }).populate('course', 'title slug priceInr').lean(),
    Order.find({ user: user._id }).sort({ createdAt: -1 }).lean(),
  ]);

  res.json({ user: { ...user, passwordHash: undefined }, enrollments, orders });
});

/** PATCH /api/admin/users/:id — block/unblock, change role, edit name/phone. */
export const updateUser = asyncHandler(async (req, res) => {
  if (req.user && String(req.user._id) === req.params.id && (req.body.blocked === true || req.body.role === 'user')) {
    throw new HttpError(400, 'You cannot block or demote your own account');
  }
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!user) throw new HttpError(404, 'User not found');
  if (user.blocked) {
    revokeUserSockets(String(user._id));
    // A blocked learner's phones must stop receiving pushes for the account.
    await PushToken.deleteMany({ user: user._id });
  }
  res.json({ user });
});

/** DELETE /api/admin/users/:id — cascades that user's orders, enrollments and reviews. */
export const deleteUser = asyncHandler(async (req, res) => {
  if (req.user && String(req.user._id) === req.params.id) {
    throw new HttpError(400, 'You cannot delete your own account');
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  await Promise.all([
    Order.deleteMany({ user: user._id }),
    Enrollment.deleteMany({ user: user._id }),
    Review.deleteMany({ user: user._id }),
    PushToken.deleteMany({ user: user._id }),
  ]);
  res.json({ ok: true, deleted: user.email });
});
