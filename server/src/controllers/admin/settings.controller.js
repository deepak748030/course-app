import { Settings } from '../../models/Settings.js';
import {
  DEFAULT_CONTENT_UPDATED_AT,
  LEGAL_DOC_KEYS,
  defaultFaqs,
  defaultLegalDocs,
  defaultPurchaseTerms,
} from '../../data/defaultContent.js';
import { emitToApp } from '../../realtime/socket.js';
import { asyncHandler } from '../../utils/http.js';

// Clients get both lists on every section (an editor field per list), even when one is empty.
const withBothLists = (doc) => ({
  ...doc,
  sections: doc.sections.map((section) => ({
    heading: section.heading,
    body: section.body ?? [],
    points: section.points ?? [],
  })),
});

const contentDefaults = {
  faqs: defaultFaqs,
  legalDocs: Object.fromEntries(LEGAL_DOC_KEYS.map((key) => [key, withBothLists(defaultLegalDocs[key])])),
  purchaseTerms: defaultPurchaseTerms,
  legalDocKeys: LEGAL_DOC_KEYS,
  updatedAt: DEFAULT_CONTENT_UPDATED_AT,
};

/**
 * GET /api/settings (public) and GET /api/admin/settings. `contentDefaults` is the built-in text shown
 * while the admin has not written their own, so the Content page edits it instead of starting blank and
 * the public policy pages always have something to show.
 */
export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await Settings.findById('app').lean();
  res.json({ settings, contentDefaults });
});

/** The parts of a document a reader sees — what decides whether "Last updated" moves. */
function docFingerprint(doc) {
  return JSON.stringify([
    doc?.title ?? '',
    doc?.heading ?? '',
    doc?.summary ?? '',
    (doc?.sections ?? []).map((section) => [section.heading ?? '', section.body ?? [], section.points ?? []]),
  ]);
}

/**
 * PUT /api/admin/settings — upserts the singleton and pushes it to every connected app.
 *
 * Documents and business details are written field by field (`legalDocs.terms`, `business.address`),
 * so a client that only knows some of them never wipes the others. A document's `updatedAt` moves
 * only when its text actually changed.
 */
export const updateSettings = asyncHandler(async (req, res) => {
  const { legalDocs, business, ...rest } = req.body;
  const $set = { ...rest };

  if (business) {
    for (const [field, value] of Object.entries(business)) {
      if (value !== undefined) $set[`business.${field}`] = value;
    }
  }

  if (legalDocs) {
    const current = await Settings.findById('app').select('legalDocs').lean();
    const now = new Date();
    for (const [key, doc] of Object.entries(legalDocs)) {
      if (doc === undefined) continue;
      if (doc === null) {
        $set[`legalDocs.${key}`] = null;
        continue;
      }
      const before = current?.legalDocs?.[key];
      const unchanged = before && docFingerprint(before) === docFingerprint(doc);
      $set[`legalDocs.${key}`] = { ...doc, updatedAt: unchanged && before.updatedAt ? before.updatedAt : now };
    }
  }

  const settings = await Settings.findOneAndUpdate(
    { _id: 'app' },
    { $set },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  emitToApp('settings.updated', { settings });
  res.json({ settings });
});
