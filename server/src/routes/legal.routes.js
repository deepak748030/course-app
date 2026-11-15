import { Router } from 'express';
import { LEGAL_KEYS, loadLegalContent, renderDocPage, renderHubPage, renderNotFoundPage } from '../legal/pages.js';

const router = Router();

/** Short cache: these pages change when the admin saves the Content page, not per request. */
const CACHE = 'public, max-age=300';
const LEGAL_CSP = "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

function applyLegalHeaders(res) {
  res.set({
    'Cache-Control': CACHE,
    'Content-Security-Policy': LEGAL_CSP,
    'X-Frame-Options': 'DENY',
  });
}

/**
 * Public policy pages — no auth, no session, plain HTML for the URLs the Play Console asks for.
 *   GET /legal                  — the hub, every document
 *   GET /legal/privacy          — one document (terms, refund, about, contact, disclaimer too)
 *   GET /legal/delete-account   — how to delete an account with or without the app
 */
router.get('/', async (_req, res) => {
  const content = await loadLegalContent();
  applyLegalHeaders(res);
  res.type('html').send(renderHubPage(content));
});

router.get('/:doc', async (req, res) => {
  const content = await loadLegalContent();
  applyLegalHeaders(res);
  if (!LEGAL_KEYS.includes(req.params.doc)) {
    res.status(404).type('html').send(renderNotFoundPage(content));
    return;
  }
  res.type('html').send(renderDocPage(content, req.params.doc));
});

export default router;
