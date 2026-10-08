import { Settings } from '../../models/Settings.js';
import { emitToApp } from '../../realtime/socket.js';
import { asyncHandler } from '../../utils/http.js';

/** GET /api/admin/settings (also served publicly at GET /api/settings for the app). */
export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await Settings.findById('app').lean();
  res.json({ settings });
});

/** PUT /api/admin/settings — upserts the singleton and pushes it to every connected app. */
export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.findOneAndUpdate({ _id: 'app' }, req.body, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  }).lean();
  emitToApp('settings.updated', { settings });
  res.json({ settings });
});
