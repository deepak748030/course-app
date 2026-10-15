/**
 * The public, sign-in-free policy pages the server serves under /legal.
 *
 * Google Play requires a privacy policy URL that anyone can open in a browser, so these pages are
 * plain HTML: no JavaScript, no session, no account. They render the same documents the app shows —
 * the admin's copy from Settings when there is one, otherwise the built-in text in defaultContent —
 * so the app and the web listing can never drift apart, and the pages keep working while MongoDB
 * is down.
 *
 * The hub (/legal) lists every document; /legal/<key> serves one. Two of them are the URLs the Play
 * Console asks for: /legal/privacy (privacy policy) and /legal/delete-account (account deletion —
 * a page that explains how to delete an account without installing the app). The Content page in
 * the admin dashboard shows these links.
 *
 * The copy can name the contact details as {{supportEmail}}, {{supportPhone}} and {{appName}}; they
 * are filled in from Settings here (as mailto:/tel: links inside the documents) and in the app.
 */

import { defaultLegalDocs } from '../data/defaultContent.js';
import { getSettings } from '../models/Settings.js';

/**
 * The documents served, in hub order. Privacy and account deletion lead — they are the two links
 * the Play Console asks for.
 */
export const LEGAL_KEYS = ['privacy', 'delete-account', 'terms', 'refund', 'about', 'contact', 'disclaimer'];

/** Documents long enough to get an "On this page" index of their clauses. */
const TOC_MIN_SECTIONS = 6;

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

const TOKEN = /\{\{\s*(appName|supportEmail|supportPhone)\s*\}\}/g;

/** Fills the tokens with plain values, for text that page() escapes itself (the title, meta tags). */
function fillText(text, content) {
  return String(text ?? '').replace(TOKEN, (_match, name) => content[name]);
}

/**
 * Escapes admin text, then fills in the contact tokens. Inside a document they become links; in
 * the <title>, the meta description and the hub cards they stay plain text. Unknown tokens are left
 * as written, so a typo shows up on the page instead of vanishing.
 */
function fill(text, content, { links = false } = {}) {
  return esc(text).replace(TOKEN, (_match, name) => {
    const value = content[name];
    if (!links || name === 'appName') return esc(value);
    const href = name === 'supportEmail' ? `mailto:${value}` : telHref(value);
    return `<a href="${esc(href)}">${esc(value)}</a>`;
  });
}

/** A readable anchor for a clause heading — "Deleting your account" → #deleting-your-account. */
function slugify(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-');
}

/** One id per clause, unique within the document; headings with no Latin letters get section-N. */
function sectionIds(sections) {
  const used = new Set();
  return sections.map((section, index) => {
    let id = slugify(section.heading) || `section-${index + 1}`;
    if (used.has(id)) id = `${id}-${index + 1}`;
    used.add(id);
    return id;
  });
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
.doc, .hub, .missing { background: #ffffff; border: 1px solid #e5eae5; border-radius: 14px; padding: 24px 20px; overflow-wrap: break-word; }
h1 { margin: 0 0 6px; font-size: 23px; line-height: 1.3; }
.summary { margin: 0; color: #5a675e; font-size: 14px; }
h2 { margin: 26px 0 8px; font-size: 16px; scroll-margin-top: 70px; }
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
.toc { margin: 20px 0 4px; padding: 14px 18px; background: #f6f9f6; border: 1px solid #e3e8e3; border-radius: 12px; }
.toc-title { margin: 0 0 6px; color: #5a675e; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
.toc ol { margin: 0; padding-left: 22px; columns: 2 240px; column-gap: 28px; font-size: 14px; }
.toc li { margin: 3px 0; break-inside: avoid; }
.toc a { text-decoration: none; }
.toc a:hover { text-decoration: underline; }
.callout { margin: 20px 0 4px; padding: 16px 18px; background: #eef6ef; border: 1px solid #b9d7bf; border-radius: 12px; }
.callout p { margin: 4px 0; }
.callout-title { color: #01500e; font-size: 16px; font-weight: 700; }
.callout .actions { margin-top: 12px; }
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

/**
 * Play asks the account-deletion page to make the way to request deletion prominent, so that page
 * opens with it: the in-app path, and an email already addressed and worded for the request.
 */
function deletionRequest(content) {
  // The subject the documents tell people to use, so a request written by hand looks the same.
  const subject = 'Delete my account';
  const message = [
    `Please delete my ${content.appName} account and the data linked to it.`,
    '',
    'Mobile number registered with the account: ',
    'Name on the account (optional): ',
  ].join('\r\n'); // mailto bodies break lines with CRLF (RFC 6068)
  const mailto = `mailto:${content.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  return `<div class="callout">
  <p class="callout-title">Request account deletion</p>
  <p>In the app, open <strong>Profile → Settings → Delete account</strong>. No app? Send us a request from any device, with the mobile number registered with your account.</p>
  <div class="actions">
    <a href="${esc(mailto)}">Email a deletion request</a>
    <a class="alt" href="${esc(telHref(content.supportPhone))}">Call ${esc(content.supportPhone)}</a>
  </div>
</div>`;
}

/** One document: its own heading, the summary line, an index for long ones, then clause by clause. */
export function renderDocPage(content, key) {
  const doc = content.docs[key];
  const clauses = doc.sections ?? [];
  const ids = sectionIds(clauses);
  const sections = clauses
    .map((section, index) => {
      const paragraphs = (section.body ?? []).map((text) => `<p>${fill(text, content, { links: true })}</p>`).join('');
      const points = (section.points ?? []).length
        ? `<ul>${section.points.map((point) => `<li>${fill(point, content, { links: true })}</li>`).join('')}</ul>`
        : '';
      return `<section><h2 id="${ids[index]}">${fill(section.heading, content)}</h2>${paragraphs}${points}</section>`;
    })
    .join('\n');

  const toc =
    clauses.length >= TOC_MIN_SECTIONS
      ? `<nav class="toc" aria-label="On this page">
  <p class="toc-title">On this page</p>
  <ol>${clauses.map((section, index) => `<li><a href="#${ids[index]}">${fill(section.heading, content)}</a></li>`).join('')}</ol>
</nav>`
      : '';

  const lead = key === 'delete-account' ? deletionRequest(content) : '';

  // The contact page closes with the two things to act on: the email and the phone number.
  const actions =
    key === 'contact'
      ? `<div class="actions">
  <a href="mailto:${esc(content.supportEmail)}">Email ${esc(content.supportEmail)}</a>
  <a class="alt" href="${esc(telHref(content.supportPhone))}">Call ${esc(content.supportPhone)}</a>
</div>`
      : '';

  const body = `<article class="doc">
  <h1>${fill(doc.heading || doc.title, content)}</h1>
  <p class="summary">${fill(doc.summary, content)}</p>
  ${lead}
  ${toc}
  ${sections}
  ${actions}
</article>`;

  return page({
    content,
    activeKey: key,
    title: `${doc.title} · ${content.appName}`,
    description: doc.summary ? fillText(doc.summary, content) : `${doc.title} for ${content.appName}.`,
    body,
  });
}

/** The hub: every document as one card each, privacy first. */
export function renderHubPage(content) {
  const cards = LEGAL_KEYS.map(
    (key) => `<a href="/legal/${key}">
    <strong>${esc(content.docs[key].title)}</strong>
    <span>${fill(content.docs[key].summary, content)}</span>
  </a>`,
  ).join('\n');

  const body = `<section class="hub">
  <h1>Policies and about</h1>
  <p class="lede">Every page below opens without an account and matches what the app shows. To delete your account and its data, see <a href="/legal/delete-account">${esc(content.docs['delete-account'].title)}</a>.</p>
  <div class="list">
${cards}
  </div>
</section>`;

  return page({
    content,
    activeKey: null,
    title: `Policies · ${content.appName}`,
    description: `Privacy policy, account deletion, terms of use, refund policy, about, contact and disclaimer pages for ${content.appName}.`,
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
