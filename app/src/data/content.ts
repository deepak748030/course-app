/**
 * Editorial content: notifications, FAQs and legal copy — curated in-app material that is
 * deliberately not part of the server catalog.
 */

import type { FaqItem, NotificationItem } from '@/types';

// Notifications are not invented here. The list stays empty until the academy sends real ones,
// and the screen then shows its empty state.
export const notifications: NotificationItem[] = [];

export const faqs: FaqItem[] = [
  {
    id: 'f1',
    question: 'How long do I have access to a course I buy?',
    answer:
      'The access terms for each course are shown on the checkout screen before you pay. Once your payment is confirmed, the course stays unlocked on your account.',
  },
  {
    id: 'f2',
    question: 'Is my payment secure?',
    answer:
      'Yes. Payments are processed by Razorpay in its secure checkout. Card, UPI and bank details never reach the YDU Academy app or server, and the course unlocks once the payment is confirmed.',
  },
  {
    id: 'f3',
    question: 'How is my progress saved?',
    answer:
      'Your lesson progress and playback position are saved to your account. Notes are kept on this device, so they are removed if you clear the app data or use Clear data on this device in Settings.',
  },
  {
    id: 'f4',
    question: 'Can I watch lessons offline?',
    answer:
      'Offline downloads are not available yet, so the app does not offer a download button. Every control you can see in the player works.',
  },
  {
    id: 'f5',
    question: 'Do courses have subtitles?',
    answer:
      'Not yet. Captions are not offered in the player until caption tracks are available, rather than showing a control that does nothing.',
  },
  {
    id: 'f6',
    question: 'I followed a method and the batch did not work',
    answer:
      'The lessons teach methods and show examples. They are not food-safety, veterinary or licensing guidance. Batch outcomes depend on your milk, your equipment and your local rules, so check with your dairy officer or a qualified advisor before you change a commercial process.',
  },
];

/**
 * Default policy text, shown until the academy publishes its own (the admin dashboard's Content page
 * replaces it). It must be reviewed by the academy's legal adviser before it is relied on.
 */
/** One clause of a policy document/** One clause of a policy document: a heading, then paragraphs and/or bullet points. */
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
    summary: 'Please read these terms before you use the academy.',
    sections: [
      {
        heading: 'Using the academy',
        body: [
          'YDU Academy gives you access to dairy courses for your own learning. By creating an account or buying a course, you agree to these terms.',
        ],
      },
      {
        heading: 'Purchases',
        points: [
          'Prices are shown in Indian rupees.',
          'Payment is processed by Razorpay. YDU Academy does not store card, UPI or bank details.',
          'A course unlocks on your account once the payment is confirmed.',
        ],
      },
      {
        heading: 'Learning material',
        body: [
          'The lessons teach methods and show examples. They are not food-safety, veterinary, licensing or regulatory advice.',
        ],
        points: ['Check the rules that apply to your own dairy before you change how it works.'],
      },
      {
        heading: 'Your account',
        points: ['Keep your sign-in details private.', 'Do not share or resell course material.'],
      },
      {
        heading: 'Changes to these terms',
        body: ['The academy may update these terms. The version shown in the app is the one that applies.'],
      },
    ],
  },
  refund: {
    title: 'Refund policy',
    heading: 'YDU Academy refund policy',
    summary: 'How refund requests are handled.',
    sections: [
      {
        heading: 'Asking for a refund',
        body: [
          'Contact the academy team through the support details in Help, and include your order number.',
        ],
      },
      {
        heading: 'How a request is decided',
        body: [
          'Each request is reviewed by the academy team. A refund is calculated on the amount you actually paid, so a course bought with a coupon is refunded at the coupon price.',
        ],
      },
      {
        heading: 'After a refund',
        body: [
          'An approved refund goes back to your original payment method, and the course is locked on your account.',
        ],
      },
      {
        heading: 'Timing',
        body: [
          'Refunds usually reach your bank within a few working days. The final timing depends on your bank.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    heading: 'YDU Academy privacy policy',
    summary: 'What we collect, and why.',
    sections: [
      {
        heading: 'What we collect',
        points: [
          'Your mobile number, used to sign in.',
          'Your name and the profile details you add.',
          'Your purchases, lesson progress and ratings.',
        ],
      },
      {
        heading: 'Payments',
        body: [
          'Card, UPI and bank details are entered on Razorpay’s checkout and never reach YDU Academy.',
        ],
      },
      {
        heading: 'What we do not do',
        points: ['We do not sell your personal data.', 'We do not access your contacts or your location.'],
      },
      {
        heading: 'Notes and device data',
        body: ['Notes are stored on your device. Clearing the app data removes them.'],
      },
      {
        heading: 'Removing your data',
        body: [
          'You can clear the data kept on this device from Settings. To ask for your account to be deleted, contact the academy team through Help.',
        ],
      },
    ],
  },
};

/** What a purchase includes. Only things the app actually does are listed. */
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
  'Access to every lesson of this course on your account',
  'Lessons unlock as soon as your payment is confirmed',
  'Your progress and playback position are saved to your account',
  'Downloads, certificates and captions are not offered yet',
];
