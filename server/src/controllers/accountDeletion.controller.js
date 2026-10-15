import { randomInt } from 'node:crypto';
import { DeletionRequest, closingFields, maskPhone } from '../models/DeletionRequest.js';
import { emitToAdmins, revokeUserSockets } from '../realtime/socket.js';
import { deleteAccountAndData } from '../services/accountDeletion.js';
import { HttpError, asyncHandler } from '../utils/http.js';

// No 0/O or 1/I: the reference is read out over the phone.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newReference = () => `DEL-${Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')}`;

/** Creates a request with a fresh reference, retrying on the (very unlikely) reference collision. */
async function createWithReference(fields) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await DeletionRequest.create({ ...fields, reference: newReference() });
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }
  throw new HttpError(500, 'Could not save the request. Please try again.');
}

/**
 * POST /api/account-deletion — public. The /delete-account page sends this, so someone who uninstalled
 * the app can still ask for their account to be deleted (Google Play requires that path).
 *
 * The reply never says whether an account exists for the number: the form must not become a way to
 * test which numbers have accounts. An admin checks the number and processes the request.
 */
export const createDeletionRequest = asyncHandler(async (req, res) => {
  const { phone, name, reason, details, company } = req.body;

  // Honeypot: the field is hidden from people, so only bots fill it. Answer like a success, save nothing.
  if (company) {
    return res.status(201).json({ ok: true, reference: newReference(), status: 'pending', createdAt: new Date() });
  }

  // Asking twice is the same request: hand back the open one instead of queueing a duplicate.
  const open = await DeletionRequest.findOne({ phone, status: 'pending', source: 'web' }).lean();
  if (open) {
    return res.json({ ok: true, reference: open.reference, status: 'pending', createdAt: open.createdAt, duplicate: true });
  }

  const request = await createWithReference({ phone, name, reason, details, source: 'web' });
  emitToAdmins('deletion.requested', { id: String(request._id), reference: request.reference });
  res.status(201).json({ ok: true, reference: request.reference, status: 'pending', createdAt: request.createdAt });
});

/**
 * DELETE /api/users/me — the learner deletes their own account from the app (Profile → Settings →
 * Delete account). Immediate and permanent; see services/accountDeletion.js for what goes and what stays.
 */
export const deleteMe = asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.role === 'admin') {
    throw new HttpError(403, 'Admin accounts cannot be deleted from the app. Another admin can remove it from the dashboard.');
  }

  const phone = user.phone || '';
  const summary = await deleteAccountAndData(user);
  const now = new Date();

  // An open web request for the same number is now done — close it, and keep the record of this deletion.
  if (phone) {
    await DeletionRequest.updateMany(
      { phone, status: 'pending' },
      {
        $set: {
          status: 'completed',
          accountDeleted: true,
          note: 'The learner deleted the account in the app.',
          ...closingFields(phone, now),
        },
      }
    );
  }
  await createWithReference({
    phone: maskPhone(phone),
    name: '',
    reason: req.body?.reason || '',
    source: 'app',
    status: 'completed',
    accountDeleted: true,
    ...closingFields(phone, now),
  });

  // Other phones signed in to this account sign out now instead of on their next request.
  revokeUserSockets(String(user._id));
  emitToAdmins('deletion.updated', { source: 'app' });
  res.json({ ok: true, deleted: summary });
});
