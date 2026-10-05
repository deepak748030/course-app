/**
 * Editorial sample content: notifications, FAQs, demo coupons and legal copy.
 * All of it is clearly-labelled sample material for the prototype.
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

export const demoCoupons: { code: string; percentOff: number; label: string }[] = [
  { code: 'YDU10', percentOff: 10, label: '10% off any course' },
  { code: 'DAIRY20', percentOff: 20, label: '20% off dairy essentials tracks' },
];

/** Sample legal copy. Replace with reviewed documents before shipping. */
export const legalDocs = {
  terms: {
    title: 'Terms of use',
    updated: 'Sample document',
    paragraphs: [
      'This is placeholder copy for a prototype. It is not a legal agreement and must be replaced with reviewed terms before YDU Academy is distributed.',
      'In this build, courses, prices and reviews are fictional sample content. Purchases are simulated and no payment is processed.',
      'You are responsible for how you apply the methods shown. Batch sheets are educational sample material, not food-safety, veterinary, licensing or regulatory advice.',
    ],
  },
  privacy: {
    title: 'Privacy',
    updated: 'Sample document',
    paragraphs: [
      'This is placeholder copy for a prototype and is not a privacy policy.',
      'The prototype stores your mobile number, session token, saved courses, lesson progress and notes on this device only. The token is kept in the platform secure store; everything else uses local app storage.',
      'No analytics, advertising or third-party tracking is included in this build, and no data leaves the device.',
    ],
  },
} as const;

/** What a purchase includes in this prototype. Deliberately conservative — nothing is promised
 *  that the product does not actually do. */
export const purchaseTerms: string[] = [
  'Stream every lesson of this course on this account',
  'Lessons unlock immediately after the demo purchase completes',
  'Batch notes, progress and playback position are saved on this device',
  'Downloads, certificates, captions and live classes are not offered in this prototype',
];
