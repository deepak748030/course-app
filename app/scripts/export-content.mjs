/**
 * Copies the app's built-in copy — FAQs, policy documents, purchase terms — to the server and the
 * admin dashboard, so all three show the same text.
 *
 *   node scripts/export-content.mjs           write both files
 *   node scripts/export-content.mjs --check   fail (exit 1) if either file is out of date
 *
 * app/src/data/content.ts is the source. It is written to:
 *
 *   server/src/data/defaultContent.js            served at /legal and sent to the admin as defaults
 *   admin-dashboard/src/data/builtInContent.ts   the admin's fallback when an older server sends none
 *
 * Before writing, every entry is checked against the limits the admin dashboard can save
 * (server/src/routes/admin.routes.js). Copy that breaks one would load into the Content page fine but
 * fail the moment the academy pressed Save, so the script refuses to write it.
 *
 * Needs Node 22.18 or newer, which reads TypeScript directly (on 22.6–22.17 add
 * --experimental-strip-types).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = new URL('../src/data/content.ts', import.meta.url);
const serverFile = new URL('../../server/src/data/defaultContent.js', import.meta.url);
const adminFile = new URL('../../admin-dashboard/src/data/builtInContent.ts', import.meta.url);

const content = await import(source.href);

/** Mirrors the zod schemas behind PUT /api/admin/settings. */
const LIMITS = {
  faqs: 50,
  question: 300,
  answer: 2000,
  title: 60,
  heading: 160,
  summary: 200,
  sections: 30,
  sectionHeading: 160,
  paragraphs: 20,
  paragraph: 1000,
  points: 20,
  point: 300,
  purchaseTerms: 30,
  purchaseTerm: 300,
};

const problems = [];
function within(label, text, max, { required = true } = {}) {
  if (typeof text !== 'string') return problems.push(`${label} is not text`);
  const length = text.trim().length;
  if (required && length === 0) problems.push(`${label} is empty`);
  if (length > max) problems.push(`${label} is ${length} characters (limit ${max})`);
}
function count(label, list, max) {
  if (list.length > max) problems.push(`${label} has ${list.length} entries (limit ${max})`);
}

const faqs = content.faqs.map(({ question, answer }) => ({ question, answer }));
count('faqs', faqs, LIMITS.faqs);
faqs.forEach((faq, i) => {
  within(`faqs[${i}].question`, faq.question, LIMITS.question);
  within(`faqs[${i}].answer`, faq.answer, LIMITS.answer, { required: false });
});

const legalDocs = {};
for (const [key, doc] of Object.entries(content.legalDocs)) {
  within(`${key}.title`, doc.title, LIMITS.title);
  within(`${key}.heading`, doc.heading, LIMITS.heading, { required: false });
  within(`${key}.summary`, doc.summary, LIMITS.summary, { required: false });
  count(`${key}.sections`, doc.sections, LIMITS.sections);
  const seen = new Set();
  const sections = doc.sections.map((section, i) => {
    const at = `${key}.sections[${i}] (${section.heading})`;
    within(`${at}.heading`, section.heading, LIMITS.sectionHeading);
    // The app keys each clause by its heading, so two alike in one document would collide.
    if (seen.has(section.heading)) problems.push(`${at}: the heading appears twice in ${key}`);
    seen.add(section.heading);
    const body = [...(section.body ?? [])];
    const points = [...(section.points ?? [])];
    count(`${at}.body`, body, LIMITS.paragraphs);
    count(`${at}.points`, points, LIMITS.points);
    body.forEach((text, j) => within(`${at}.body[${j}]`, text, LIMITS.paragraph));
    points.forEach((text, j) => within(`${at}.points[${j}]`, text, LIMITS.point));
    return { heading: section.heading, body, points };
  });
  legalDocs[key] = { title: doc.title, heading: doc.heading, summary: doc.summary, sections };
}

const purchaseTerms = [...content.purchaseTerms];
count('purchaseTerms', purchaseTerms, LIMITS.purchaseTerms);
purchaseTerms.forEach((term, i) => within(`purchaseTerms[${i}]`, term, LIMITS.purchaseTerm));

if (problems.length) {
  process.stderr.write(`content.ts breaks the limits the admin can save:\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}

const json = (value) => JSON.stringify(value, null, 2);

const serverText = `// Generated from app/src/data/content.ts — the built-in text the app shows when the academy has
// not written its own. The admin Content page edits from these, so nothing starts blank.
export const defaultFaqs = ${json(faqs)};

export const defaultLegalDocs = ${json(legalDocs)};

export const defaultPurchaseTerms = ${json(purchaseTerms)};
`;

const adminText = `// Generated from server/src/data/defaultContent.js (itself generated from app/src/data/content.ts).
// Used only when the server does not send contentDefaults (an older deploy), so the Content page
// still shows the built-in text instead of a blank form. Regenerate when the app copy changes.
import type { ContentDefaults } from '../api/types';

export const BUILT_IN_CONTENT: ContentDefaults = ${json({ faqs, legalDocs, purchaseTerms })};
`;

const outputs = [
  [serverFile, serverText],
  [adminFile, adminText],
];
const relative = (url) => fileURLToPath(url).replace(fileURLToPath(new URL('../../', import.meta.url)), '');

if (process.argv.includes('--check')) {
  const stale = outputs.filter(([file, text]) => readFileSync(file, 'utf8') !== text).map(([file]) => relative(file));
  if (stale.length) {
    process.stderr.write(`Out of date — run node scripts/export-content.mjs:\n  ${stale.join('\n  ')}\n`);
    process.exit(1);
  }
  process.stdout.write('Server and admin copies match content.ts\n');
} else {
  for (const [file, text] of outputs) {
    writeFileSync(file, text);
    process.stdout.write(`wrote ${relative(file)}\n`);
  }
}
