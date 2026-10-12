import { Settings } from '../../models/Settings.js';
import { defaultFaqs, defaultLegalDocs, defaultPurchaseTerms } from '../../data/defaultContent.js';
import { emitToApp } from '../../realtime/socket.js';
import { asyncHandler } from '../../utils/http.js';

/**
 * GET /api/admin/settings. `contentDefaults` is the built-in text the app shows while the admin has
 * not written their own, so the Content page can edit it instead of starting blank.
 */
export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await Settings.findById('app').lean();
  res.json({
    settings,
    contentDefaults: { faqs: defaultFaqs, legalDocs: defaultLegalDocs, purchaseTerms: defaultPurchaseTerms },
  });
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
