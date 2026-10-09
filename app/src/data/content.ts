/**
 * Editorial content: notifications, FAQs and legal copy — curated in-app material that is
 * deliberately not part of the server catalog.
 */

import type { FaqItem, NotificationItem } from '@/types';

export const notifications: NotificationItem[] = [
  {
    id: 'n1',
    kind: 'learning-reminder',
    title: 'Pick up where you left off',
    body: 'You were 4 minutes into “Reading a lactometer correctly”. A short session today keeps the streak going.',
    minutesAgo: 45,
    courseId: 'milk-foundations',
  },
  {
    id: 'n2',
    kind: 'course-update',
    title: 'Paneer Craft: acid strength',
    body: 'Meera added a short lesson on checking citric acid strength before a batch. It is now part of the troubleshooting section.',
    minutesAgo: 190,
    courseId: 'paneer-craft',
  },
  {
    id: 'n3',
    kind: 'course-update',
    title: 'Ghee, step by step',
    body: '“Ghee & Butter at Home” now includes a longer walkthrough of the clarification stages.',
    minutesAgo: 1450,
    courseId: 'ghee-butter',
  },
  {
    id: 'n4',
    kind: 'course-update',
    title: 'A small addition to Artisan Cheese',
    body: 'A new lesson covers cleaning and turning shelves between wheels in a small maturing room.',
    minutesAgo: 2900,
    courseId: 'artisan-cheese',
  },
  {
    id: 'n5',
    kind: 'product',
    title: 'Notes are live in the player',
    body: 'You can now write batch notes and they stay with the lesson on this device.',
    minutesAgo: 4300,
  },
];

export const faqs: FaqItem[] = [
  {
    id: 'f1',
    question: 'How long do I have access to a course I buy?',
    answer:
      'Access terms are set per course and shown on the checkout screen before you pay. In this prototype every course is a sample product with sample terms, so nothing is charged and nothing expires.',
  },
  {
    id: 'f2',
    question: 'Are the purchases in this app real?',
    answer:
      'No. YDU Academy currently ships a demo checkout: no payment gateway is connected, no card details are ever collected, and no money moves. The course unlocks locally so you can see the full journey.',
  },
  {
    id: 'f3',
    question: 'How is my progress tracked?',
    answer:
      'Lesson completion, playback position and your notes are stored on this device only. Clearing them from Settings → Reset demo data removes them.',
  },
  {
    id: 'f4',
    question: 'Can I watch lessons offline?',
    answer:
      'Offline downloads are not implemented, so the app does not offer a download button. Any control you can see in the player is functional.',
  },
  {
    id: 'f5',
    question: 'Do courses have subtitles?',
    answer:
      'Not yet. Captions are not offered in the player until real caption tracks are available, rather than showing a control that does nothing.',
  },
  {
    id: 'f6',
    question: 'I followed a method and the batch did not work',
    answer:
      'The make-sheets in the app are sample educational content, not food-safety, veterinary or licensing guidance. Batch outcomes depend on your milk, your equipment and your local rules — check with your dairy officer or a qualified advisor before you change a commercial process.',
  },
];

/** Sample legal copy. Replace with reviewed documents before shipping. */
/**
 * The three policy documents, shaped like the documents they stand in for: a heading per clause, a
 * paragraph or two, and bullet points where the copy lists things. `SampleDocument` in the screen
 * renders `points` as a bulleted list.
 *
 * The copy is deliberately plain-English and short — it is placeholder material that has to be
 * replaced wholesale, so the honest thing is to say what the prototype does rather than to imitate
 * legal language it cannot back up.
 */
/** One clause of a policy document: a heading, then paragraphs and/or bullet points. */
export type LegalSection = {
  heading: string;
  body?: readonly string[];
  /** Points the clause lists. Rendered as a bullet list, in order. */
  points?: readonly string[];
};

export type LegalDoc = {
  /** Screen name: the app bar, the Profile row and the document's own heading all come from these. */
  title: string;
  /** The document's own heading, spelled out the way the document itself would be titled. */
  heading: string;
  summary: string;
  sections: readonly LegalSection[];
};

export const legalDocs: Record<'terms' | 'refund' | 'privacy', LegalDoc> = {
  terms: {
    title: 'Terms of use',
    heading: 'YDU Academy terms of use',
    summary: 'The terms this prototype runs on',
    sections: [
      {
        heading: 'What this document is',
        body: [
          'YDU Academy is a prototype. This page is placeholder text, not a legal agreement, and it has to be replaced with reviewed terms before the app is distributed.',
        ],
      },
      {
        heading: 'Courses, prices and reviews',
        body: ['Everything in the catalog is sample material, written to show how the app works.'],
        points: [
          'Courses, prices and ratings are fictional.',
          'Purchases are simulated end to end: no payment is processed and no money moves.',
          'Lesson videos are demo clips, not the training material they describe.',
        ],
      },
      {
        heading: 'Applying what you learn',
        body: ['You decide how to apply the methods shown in a lesson.'],
        points: [
          'Batch sheets are teaching samples, not certified production records.',
          'Nothing here is food-safety, veterinary, licensing or regulatory advice.',
          'Check the rules that apply to your own dairy before you change how it works.',
        ],
      },
      {
        heading: 'Your device, your data',
        body: [
          'Progress, notes and saved items live on this device only. Clearing the app data removes them, and there is no backup yet.',
        ],
      },
    ],
  },
  refund: {
    title: 'Refund policy',
    heading: 'YDU Academy refund policy',
    summary: 'When a course can be refunded',
    sections: [
      {
        heading: 'In this build',
        body: [
          'Checkout is a demo. It unlocks a course on this device and takes no money, so there is nothing to refund yet.',
        ],
        points: [
          'No card, UPI or bank details are collected.',
          'Nothing is sent to a payment provider.',
          'A demo purchase can be cleared from Transactions on this device.',
        ],
      },
      {
        heading: 'The window a shipped app would run on',
        body: ['A released app would refund on these terms:'],
        points: [
          'Seven days from the date of purchase.',
          'Full refund while no lesson has been started.',
          'No refund once a quarter or more of the lessons are done.',
        ],
      },
      {
        heading: 'What the refund is calculated on',
        body: [
          'Refunds are calculated on the amount actually paid. A course bought with a coupon is refunded at the coupon price, never at the list price. Batch sheets, notes and downloaded material follow the same rule as the lessons.',
        ],
      },
      {
        heading: 'How the money reaches you',
        body: [
          'An approved refund goes back to the original payment method within five to seven working days, and the course locks again once the refund is processed.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    heading: 'YDU Academy privacy policy',
    summary: 'What is stored, and where',
    sections: [
      {
        heading: 'What this prototype stores',
        body: ['Everything below is kept in this app on this device.'],
        points: [
          'Your mobile number, used to sign in.',
          'The session token, in the platform secure store.',
          'Saved courses, batch sheets, lesson progress and your notes.',
          'The profile details you type in yourself.',
        ],
      },
      {
        heading: 'What it does not do',
        points: [
          'No analytics, advertising or third-party tracking.',
          'No data leaves the device — there is no server to send it to.',
          'No contact list, camera roll or location access.',
        ],
      },
      {
        heading: 'Removing your data',
        body: [
          'Logging out clears the session, progress and notes stored for it. Reset demo data on the Settings screen puts the app back to a clean slate.',
        ],
      },
      {
        heading: 'What this document is',
        body: [
          'Placeholder copy for a prototype. It is not a privacy policy, and it has to be replaced with a reviewed document before YDU Academy is distributed.',
        ],
      },
    ],
  },
};

/** What a purchase includes in this prototype. Deliberately conservative — nothing is promised
 *  that the product does not actually do. */
/**
 * The rating page's vocabulary.
 *
 * Both lists are read through `t()` where they are rendered, exactly like the catalog's sort and
 * price options: the words stay in the data layer, the translation happens at the call site.
 */
export const ratingWords: string[] = ['Not for me', 'Could be better', 'It was fine', 'Really good', 'Excellent'];

/** What stood out: a fixed list, so reviews stay comparable instead of turning into free text. */
export const ratingHighlights: string[] = [
  'Clear explanations',
  'Practical, step by step',
  'Good camera work',
  'Honest about mistakes',
  'Worth the price',
];

export const purchaseTerms: string[] = [
  'Stream every lesson of this course on this account',
  'Lessons unlock immediately after the demo purchase completes',
  'Batch notes, progress and playback position are saved on this device',
  'Downloads, certificates, captions and live classes are not offered in this prototype',
];
