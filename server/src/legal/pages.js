/**
 * The public, sign-in-free policy pages the server serves under /legal.
 *
 * Google Play requires a privacy policy URL that anyone can open in a browser, so these pages are
 * plain HTML: no JavaScript, no session, no account. They render the same documents the app shows —
 * the admin's copy from Settings when there is one, otherwise the built-in text in defaultContent —
 * so the app and the web listing can never drift apart, and the pages keep working while MongoDB
 * is down.
 *
 * The hub (/legal) lists all six documents; /legal/<key> serves one. The Content page in the admin
 * dashboard shows these links for the Play Console.
 */

import { defaultLegalDocs } from '../data/defaultContent.js';
import { getSettings } from '../models/Settings.js';

/** The documents served, in hub order. Privacy leads — it is the link the Play Console asks for. */
export const LEGAL_KEYS = ['privacy', 'terms', 'refund', 'about', 'contact', 'disclaimer'];

/** Used when there is no Settings document yet (fresh database, or MongoDB unreachable). */
const DEFAULTS = {
  appName: 'YDU Academy',
  tagline: 'Learn the dairy trade, one batch at a time.',
  supportEmail: 'support@ydu.academy',
  supportPhone: '+91 98765 43210',
};

/**
 * Resolves what the pages render: the admin's documents when saved, the built-in text otherwise.
 * A database failure is not an error here — the built-in copy is a complete fallback.
 */
export async function loadLegalContent() {
  let settings = null;
  try {
    settings = await getSettings();
  } catch {
    settings = null;
  }

  const docs = {};
  for (const key of LEGAL_KEYS) {
    const stored = settings?.legalDocs?.[key];
    docs[key] = stored && stored.title ? stored : defaultLegalDocs[key];
  }

  return {
    appName: settings?.appName || DEFAULTS.appName,
    tagline: settings?.tagline || DEFAULTS.tagline,
    supportEmail: settings?.supportEmail || DEFAULTS.supportEmail,
    supportPhone: settings?.supportPhone || DEFAULTS.supportPhone,
    docs,
  };
}

/** Everything on these pages is text from the database or the admin: escape all of it. */
function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** The phone as a tel: link: keep the + and digits, drop the formatting. */
function telHref(phone) {
  return `tel:${String(phone).replace(/[^\d+]/g, '')}`;
}

const STYLE = `
*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0;
  background: #f4f6f4;
  color: #16201a;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.65;
  -webkit-text-size-adjust: 100%;
}
a { color: #0b5d22; }
.wrap { max-width: 760px; margin: 0 auto; padding-left: 20px; padding-right: 20px; }
.top { background: #01500e; color: #ffffff; padding: 22px 0 20px; }
.brand { display: inline-block; color: #ffffff; font-size: 20px; font-weight: 700; text-decoration: none; letter-spacing: 0.2px; }
.tagline { margin: 4px 0 0; color: #cfe3d3; font-size: 13px; }
.tabs { background: #ffffff; border-bottom: 1px solid #e3e8e3; position: sticky; top: 0; z-index: 1; }
.tabs .wrap { display: flex; gap: 8px; overflow-x: auto; padding-top: 10px; padding-bottom: 10px; -webkit-overflow-scrolling: touch; }
.tabs a {
  flex: 0 0 auto;
  font-size: 13px;
  font-weight: 600;
  color: #0b5d22;
  text-decoration: none;
  border: 1px solid #d8e2d9;
  border-radius: 999px;
  padding: 6px 12px;
  white-space: nowrap;
}
.tabs a:hover { border-color: #0b5d22; }
.tabs a.active { background: #01500e; border-color: #01500e; color: #ffffff; }
main { padding-top: 24px; padding-bottom: 8px; }
.doc, .hub, .missing { background: #ffffff; border: 1px solid #e5eae5; border-radius: 14px; padding: 24px 20px; }
h1 { margin: 0 0 6px; font-size: 23px; line-height: 1.3; }
.summary { margin: 0; color: #5a675e; font-size: 14px; }
h2 { margin: 26px 0 8px; font-size: 16px; }
p { margin: 8px 0; }
ul { margin: 8px 0; padding-left: 20px; }
li { margin: 4px 0; }
.lede { margin: 10px 0 18px; color: #5a675e; font-size: 14px; }
.list { display: grid; gap: 10px; margin-top: 4px; }
.list a {
  display: block;
  background: #ffffff;
  border: 1px solid #e5eae5;
  border-radius: 12px;
  padding: 14px 16px;
  color: inherit;
  text-decoration: none;
}
.list a:hover { border-color: #0b5d22; }
.list strong { display: block; color: #0b5d22; font-size: 15px; }
.list span { display: block; margin-top: 2px; color: #5a675e; font-size: 13px; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
.actions a {
  display: inline-block;
  background: #01500e;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  border-radius: 10px;
  padding: 10px 16px;
}
.actions a.alt { background: #ffffff; color: #01500e; border: 1px solid #0b5d22; }
footer { padding: 18px 0 44px; color: #68766d; font-size: 12.5px; text-align: center; }
footer a { color: #0b5d22; }
footer p { margin: 4px 0; }
@media (min-width: 600px) {
  .doc, .hub, .missing { padding: 32px; }
  h1 { font-size: 26px; }
}
`;

/** The shared chrome: brand bar, the pill nav across the documents, and the contact footer. */
function page({ content, activeKey, title, description, body }) {
  const { appName, tagline, supportEmail, supportPhone, docs } = content;

  const nav = LEGAL_KEYS.map((key) => {
    const current = key === activeKey;
    return `<a href="/legal/${key}"${current ? ' class="active" aria-current="page"' : ''}>${esc(docs[key].title)}</a>`;
  }).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow">
<style>${STYLE}</style>
</head>
<body>
<header class="top">
  <div class="wrap">
    <a class="brand" href="/legal">${esc(appName)}</a>
    <p class="tagline">${esc(tagline)}</p>
  </div>
</header>
<nav class="tabs" aria-label="Policy pages">
  <div class="wrap">${nav}</div>
</nav>
<main class="wrap">
${body}
</main>
<footer class="wrap">
  <p>${esc(appName)} · <a href="mailto:${esc(supportEmail)}">${esc(supportEmail)}</a> · <a href="${esc(telHref(supportPhone))}">${esc(supportPhone)}</a></p>
  <p>These pages open without an account and are also available inside the app.</p>
</footer>
</body>
</html>
`;
}

/** One document: its own heading, the summary line, then clause by clause. */
export function renderDocPage(content, key) {
  const doc = content.docs[key];
  const sections = (doc.sections ?? [])
    .map((section) => {
      const paragraphs = (section.body ?? []).map((text) => `<p>${esc(text)}</p>`).join('');
      const points = (section.points ?? []).length
        ? `<ul>${section.points.map((point) => `<li>${esc(point)}</li>`).join('')}</ul>`
        : '';
      return `<section><h2>${esc(section.heading)}</h2>${paragraphs}${points}</section>`;
    })
    .join('\n');

  // The contact page is the one document with something to act on: the email and the phone number.
  const actions =
    key === 'contact'
      ? `<div class="actions">
  <a href="mailto:${esc(content.supportEmail)}">Email ${esc(content.supportEmail)}</a>
  <a class="alt" href="${esc(telHref(content.supportPhone))}">Call ${esc(content.supportPhone)}</a>
</div>`
      : '';

  const body = `<article class="doc">
  <h1>${esc(doc.heading || doc.title)}</h1>
  <p class="summary">${esc(doc.summary)}</p>
  ${sections}
  ${actions}
</article>`;

  return page({
    content,
    activeKey: key,
    title: `${doc.title} · ${content.appName}`,
    description: doc.summary || `${doc.title} for ${content.appName}.`,
    body,
  });
}

/** The hub: every document as one card each, privacy first. */
export function renderHubPage(content) {
  const cards = LEGAL_KEYS.map(
    (key) => `<a href="/legal/${key}">
    <strong>${esc(content.docs[key].title)}</strong>
    <span>${esc(content.docs[key].summary)}</span>
  </a>`,
  ).join('\n');

  const body = `<section class="hub">
  <h1>Policies and about</h1>
  <p class="lede">Every page below opens without an account. The Google Play listing links to the privacy policy on this site.</p>
  <div class="list">
${cards}
  </div>
</section>`;

  return page({
    content,
    activeKey: null,
    title: `Policies · ${content.appName}`,
    description: `Privacy policy, terms of use, refund policy, about and contact pages for ${content.appName}.`,
    body,
  });
}

/** A plain 404 in the same chrome, so a mistyped link still lands somewhere useful. */
export function renderNotFoundPage(content) {
  const body = `<section class="missing">
  <h1>Page not found</h1>
  <p class="lede">There is no policy page at this address.</p>
  <p><a href="/legal">Back to all policies</a></p>
</section>`;

  return page({
    content,
    activeKey: null,
    title: `Page not found · ${content.appName}`,
    description: 'Page not found.',
    body,
  });
}
