import { DeletionRequest, closingFields } from '../../models/DeletionRequest.js';
import { Enrollment } from '../../models/Enrollment.js';
import { Order } from '../../models/Order.js';
import { User } from '../../models/User.js';
import { emitToAdmins, revokeUserSockets } from '../../realtime/socket.js';
import { deleteAccountAndData } from '../../services/accountDeletion.js';
import { HttpError, asyncHandler } from '../../utils/http.js';

/** What the admin needs to judge an open request: whose account the number opens, and what is on it. */
async function accountsByPhone(phones) {
  if (phones.length === 0) return new Map();
  const users = await User.find({ phone: { $in: phones } })
    .select('name phone role blocked avatarUrl createdAt lastLoginAt')
    .lean();
  const ids = users.map((user) => user._id);
  const [enrollments, paid] = await Promise.all([
    Enrollment.aggregate([{ $match: { user: { $in: ids } } }, { $group: { _id: '$user', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { user: { $in: ids }, status: 'paid' } },
      { $group: { _id: '$user', count: { $sum: 1 }, total: { $sum: '$amountInr' } } },
    ]),
  ]);
  const enrollmentsBy = new Map(enrollments.map((row) => [String(row._id), row.count]));
  const paidBy = new Map(paid.map((row) => [String(row._id), row]));
  return new Map(
    users.map((user) => [
      user.phone,
      {
        _id: user._id,
        name: user.name,
        role: user.role,
        blocked: user.blocked,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        enrollmentCount: enrollmentsBy.get(String(user._id)) || 0,
        paidOrders: paidBy.get(String(user._id))?.count || 0,
        totalPaidInr: paidBy.get(String(user._id))?.total || 0,
      },
    ])
  );
}

/** GET /api/admin/deletion-requests?status=pending|completed|rejected|all */
export const listDeletionRequests = asyncHandler(async (req, res) => {
  const { status } = req.validatedQuery;
  const filter = status === 'all' ? {} : { status };

  const [requests, grouped] = await Promise.all([
    DeletionRequest.find(filter).sort({ createdAt: -1 }).limit(500).populate('handledBy', 'name email').lean(),
    DeletionRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const openPhones = [...new Set(requests.filter((r) => r.status === 'pending').map((r) => r.phone))];
  const accounts = await accountsByPhone(openPhones);
  const counts = { pending: 0, completed: 0, rejected: 0 };
  for (const row of grouped) counts[row._id] = row.count;

  res.json({
    requests: requests.map((request) => ({
      ...request,
      account: request.status === 'pending' ? accounts.get(request.phone) ?? null : null,
    })),
    counts,
  });
});

/**
 * PATCH /api/admin/deletion-requests/:id — close a request.
 *   { status: 'completed', deleteAccount: true }  delete the account the number opens, then close
 *   { status: 'completed' }                       nothing to delete (no account / already gone)
 *   { status: 'rejected', note }                  could not confirm the request came from the owner
 */
export const updateDeletionRequest = asyncHandler(async (req, res) => {
  const { status, deleteAccount, note } = req.body;
  const request = await DeletionRequest.findById(req.params.id);
  if (!request) throw new HttpError(404, 'Request not found');
  if (request.status !== 'pending') throw new HttpError(409, 'This request is already closed');

  let deleted = null;
  if (status === 'completed' && deleteAccount) {
    const user = await User.findOne({ phone: request.phone });
    if (!user) throw new HttpError(404, 'No account uses this mobile number any more. Close the request without deleting.');
    if (user.role === 'admin') throw new HttpError(400, 'This number belongs to an admin account. Remove its admin access first.');
    deleted = await deleteAccountAndData(user);
    revokeUserSockets(String(user._id));
  }

  request.set({
    status,
    note,
    accountDeleted: Boolean(deleted),
    handledBy: req.user._id,
    ...closingFields(request.phone),
  });
  await request.save();

  emitToAdmins('deletion.updated', { id: String(request._id), status });
  res.json({ request, deleted });
});
