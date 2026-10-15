/**
 * Editorial content: FAQs and legal copy — curated in-app material that is
 * deliberately not part of the server catalog.
 */

import type { FaqItem } from '@/types';


// <generated:faqs> — written by scripts/sync-content.mjs from server/src/data/defaultContent.js. Edit there.
export const faqs: FaqItem[] = [
  {
    id: 'f1',
    question: 'How long do I have access to a course I buy?',
    answer: 'The access terms for each course are shown on the checkout screen before you pay. Once your payment is confirmed, the course stays unlocked on your account.',
  },
  {
    id: 'f2',
    question: 'Is my payment secure?',
    answer: 'Yes. Payments are processed by Razorpay in its secure checkout. Card, UPI and bank details never reach the YDU Academy app or server, and the course unlocks once the payment is confirmed.',
  },
  {
    id: 'f3',
    question: 'How is my progress saved?',
    answer: 'Your lesson progress and playback position are saved to your account. Notes are kept on this device, so they are removed if you clear the app data or use Clear data on this device in Settings.',
  },
  {
    id: 'f4',
    question: 'Can I watch lessons offline?',
    answer: 'Offline downloads are not available yet, so the app does not offer a download button. Every control you can see in the player works.',
  },
  {
    id: 'f5',
    question: 'Do courses have subtitles?',
    answer: 'Not yet. Captions are not offered in the player until caption tracks are available, rather than showing a control that does nothing.',
  },
  {
    id: 'f6',
    question: 'I followed a method and the batch did not work',
    answer: 'The lessons teach methods and show examples. They are not food-safety, veterinary or licensing guidance. Batch outcomes depend on your milk, your equipment and your local rules, so check with your dairy officer or a qualified advisor before you change a commercial process.',
  },
  {
    id: 'f7',
    question: 'How do I get a refund?',
    answer: 'You can ask for a full refund within 7 days of buying a course if you have completed less than 25% of its lessons. Contact the support team with your registered mobile number and the payment ID from Profile → Transactions. The full rules are in Profile → Refund policy.',
  },
  {
    id: 'f8',
    question: 'How do I delete my account?',
    answer: 'Open Profile → Settings → Delete account and confirm. Your account and learning data are deleted straight away. If you no longer have the app, you can request deletion on our website or by emailing the support team with your registered mobile number.',
  },
];
// </generated:faqs>

/**
 * Default policy text, shown until the academy publishes its own (the admin dashboard's Content page
 * replaces it). Placeholders such as {{supportEmail}} are filled in from the server settings by
 * services/app-content.ts; a line whose detail is not set yet is left out.
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
  /** When the text last changed (ISO date). */
  updatedAt?: string;
};

// <generated:legal> — written by scripts/sync-content.mjs from server/src/data/defaultContent.js. Edit there.
export const legalDocs: Record<'terms' | 'refund' | 'privacy', LegalDoc> = {
  terms: {
    title: 'Terms and conditions',
    heading: '{{appName}} Terms and Conditions',
    summary: 'The agreement between you and {{legalName}} when you use {{appName}}. Please read it before you create an account or buy a course.',
    updatedAt: '2026-10-15',
    sections: [
      {
        heading: 'About these terms',
        body: [
          'These terms are an agreement between you and {{legalName}} (“we”, “us”, “our”), which operates {{appName}} — an online academy that teaches the dairy trade through video courses, available as a mobile app and on the web (together, the “Service”).',
          'By creating an account, buying a course or otherwise using the Service, you agree to these terms, our Privacy Policy and our Refund and Cancellation Policy. If you do not agree, please do not use the Service.',
        ],
      },
      {
        heading: 'Who can use the Service',
        points: [
          'You must be at least 18 years old and able to enter into a binding contract under Indian law. If you are under 18, you may use the Service only with the consent and supervision of a parent or legal guardian, who accepts these terms for you.',
          'You need an Indian mobile number to create an account. The Service is offered to learners in India.',
          'You must give accurate information and keep it up to date.',
        ],
      },
      {
        heading: 'Your account',
        points: [
          'You sign in with your mobile number and a one-time code sent by SMS. Never share a sign-in code with anyone — our team will never ask you for it.',
          'Your account is for you alone. Do not share it, sell it or let other people learn through it.',
          'You are responsible for activity in your account. Tell us straight away if you lose your phone or number, or think someone else has used your account.',
          'You can delete your account at any time from the app (Profile → Settings → Delete account) or from our website.',
        ],
      },
      {
        heading: 'Courses and access',
        points: [
          'When your payment is confirmed, the course unlocks on your account and you get a personal, non-exclusive, non-transferable right to watch it in the {{appName}} app for your own learning.',
          'What each course includes is shown on its course page and at checkout before you pay. Unless stated otherwise, a course stays available on your account for as long as your account is active and we offer the course.',
          'Some lessons can be watched as free previews. Previews may be changed or removed at any time.',
          'We may update, re-record, reorder or improve lessons to keep courses accurate and useful.',
          'If we have to withdraw a course you paid for, we will give you reasonable notice to finish it, or offer a replacement course or a refund under our Refund and Cancellation Policy.',
          'You need a compatible phone and an internet connection to watch lessons, and your mobile operator’s data charges apply. Offline downloads, captions and certificates are not offered unless a course page says so.',
        ],
      },
      {
        heading: 'Prices and payments',
        points: [
          'Prices are in Indian rupees (₹). The amount you pay, including any applicable taxes, is shown at checkout before you pay.',
          'Payments are processed by Razorpay using UPI, cards, net banking, wallets or the other methods it offers. Your payment is also subject to Razorpay’s terms and your bank’s rules.',
          'Each course is a one-time purchase. There are no subscriptions and nothing renews automatically.',
          'Coupons apply only as described in the offer, cannot be exchanged for cash and may be withdrawn at any time. One coupon can be used per purchase.',
          'If a price is shown incorrectly because of an obvious error, we may cancel the order and refund the full amount you paid.',
        ],
      },
      {
        heading: 'Refunds and cancellation',
        body: [
          'Courses are delivered digitally and unlock as soon as your payment is confirmed. Refunds and cancellations are handled under our Refund and Cancellation Policy, which forms part of these terms.',
        ],
      },
      {
        heading: 'Acceptable use',
        body: [
          'When you use the Service, you agree not to:',
        ],
        points: [
          'download, record, screen-capture, copy, share, sell or publish course videos, batch sheets or any other course material;',
          'share your account or sign-in codes, or try to access courses you have not bought;',
          'post reviews or other content that is false, abusive, hateful, obscene, defamatory, misleading, infringing or unlawful, or that contains someone else’s personal information, advertising or spam;',
          'interfere with the Service — for example by hacking, scraping, overloading it, spreading malware, or getting around security or payment checks;',
          'use the Service for any unlawful purpose or in any way that breaks these terms.',
        ],
      },
      {
        heading: 'Reviews and other content you post',
        points: [
          'You can rate and review courses you own. Your name, rating and review are shown to other learners.',
          'You keep ownership of what you write, and you give us a free, non-exclusive licence to show it on the Service and to use it to improve our courses for as long as it is published.',
          'Reviews must be honest and about the course. We may hide or remove reviews that break these terms, and you can ask us to remove your own review at any time.',
          'To report a review or any content you find objectionable, email {{supportEmail}}. We look into every report and act on it promptly.',
        ],
      },
      {
        heading: 'Educational content, not professional advice',
        body: [
          'Our courses teach practical methods for milk handling, dairy products, animal care and running a dairy business. They are for general education only.',
        ],
        points: [
          'Lessons, batch sheets and recipes are not food-safety, veterinary, medical, legal, licensing, financial or business advice, and they do not replace advice from a qualified professional.',
          'If you make or sell dairy products, you are responsible for following the law that applies to you, including the Food Safety and Standards Act, 2006 and FSSAI licensing, registration, hygiene and labelling requirements.',
          'Results depend on your milk, equipment, hygiene, skill, local conditions and market. We do not guarantee any particular result, income, business outcome or job.',
          'Take care with hot equipment, cleaning chemicals, animals and food allergies when you follow a lesson, and consult a veterinarian about the health of your animals.',
        ],
      },
      {
        heading: 'Intellectual property',
        body: [
          'The Service and everything in it — course videos, batch sheets, text, graphics, logos and software — belong to us or our licensors and are protected by copyright, trademark and other laws. Apart from the personal right to watch courses described above, these terms do not give you any right to use our content or our brand.',
        ],
      },
      {
        heading: 'Third-party services',
        body: [
          'Parts of the Service rely on other companies, such as Razorpay for payments, Google Play for app distribution and your phone’s notification service. We are not responsible for their services, which are governed by their own terms and policies.',
        ],
      },
      {
        heading: 'Availability, changes and suspension',
        points: [
          'We work to keep the Service available, but it may sometimes be interrupted for maintenance, updates or reasons outside our control. You may need to update the app to keep using it.',
          'We may change, add or remove features of the Service.',
          'We may suspend or close an account, without a refund, if it breaks these terms — for example by sharing the account or copying course material — or if the law requires it. Where appropriate, we will tell you why.',
          'You may stop using the Service and delete your account at any time.',
        ],
      },
      {
        heading: 'Limitation of liability',
        body: [
          'The Service and its content are provided “as is” and “as available”. To the fullest extent permitted by law, we do not promise that the Service will be uninterrupted or error-free, or that the content will suit your particular purpose.',
          'To the fullest extent permitted by law, we are not liable for any indirect, incidental or consequential loss — including loss of profit, business, milk, products or animals — arising from your use of the Service or of any method taught in it. Our total liability to you for any claim about a course is limited to the amount you paid for that course.',
          'Nothing in these terms limits any rights you have as a consumer under Indian law that cannot be excluded.',
        ],
      },
      {
        heading: 'Indemnity',
        body: [
          'You agree to make good any loss, claim or expense (including reasonable legal fees) that we suffer because you broke these terms or the law, or infringed someone else’s rights, while using the Service.',
        ],
      },
      {
        heading: 'Governing law and disputes',
        points: [
          'These terms are governed by the laws of India.',
          'If you have a complaint, please contact us first — most problems can be solved quickly.',
          'Subject to your rights under consumer protection law, the courts at {{jurisdiction}} have exclusive jurisdiction over any dispute arising from these terms or the Service.',
        ],
      },
      {
        heading: 'Grievance redressal',
        body: [
          'If you have a complaint about the Service, a purchase or any content, contact our Grievance Officer. We acknowledge every complaint within 24 hours and resolve it within 15 days of receiving it.',
        ],
        points: [
          'Grievance Officer: {{grievanceName}}',
          'Email: {{grievanceEmail}}',
          'Phone: {{grievancePhone}}',
          'Address: {{address}}',
        ],
      },
      {
        heading: 'Changes to these terms',
        body: [
          'We may update these terms from time to time. The “Last updated” date shows the current version. If a change significantly affects your rights, we will tell you in the app before it takes effect. If you keep using the Service after that, you accept the updated terms.',
        ],
      },
      {
        heading: 'Contact us',
        points: [
          'Operated by: {{legalName}}',
          'Email: {{supportEmail}}',
          'Phone: {{supportPhone}}',
          'Support hours: {{supportHours}}',
          'Address: {{address}}',
          'GSTIN: {{gstin}}',
        ],
      },
    ],
  },
  refund: {
    title: 'Refund policy',
    heading: 'Refund and Cancellation Policy',
    summary: 'When you can cancel a purchase or get a refund for a {{appName}} course, and how long it takes.',
    updatedAt: '2026-10-15',
    sections: [
      {
        heading: 'Overview',
        body: [
          '{{appName}} courses are digital and unlock on your account as soon as your payment is confirmed. Because you get access straight away, purchases are refunded in the situations described below. This policy is part of our Terms and Conditions.',
        ],
      },
      {
        heading: 'Refund within 7 days',
        body: [
          'You can ask for a full refund of a course if both of these are true:',
        ],
        points: [
          'you ask within 7 days of the date you bought it; and',
          'you have completed less than 25% of its lessons.',
        ],
      },
      {
        heading: 'Always refunded',
        body: [
          'Whatever the date or your progress, we refund you in full if:',
        ],
        points: [
          'you were charged more than once for the same course;',
          'money was taken from your account but the course did not unlock, and we cannot fix it within 48 hours of you telling us;',
          'a technical problem on our side stops you from watching the course and we cannot fix it within 7 days; or',
          'we withdraw the course before you have had reasonable time to complete it.',
        ],
      },
      {
        heading: 'When a refund is not given',
        points: [
          'More than 7 days after purchase, or once 25% or more of the course’s lessons are completed — except in the cases listed above.',
          'Courses unlocked for free, for example with a 100% discount coupon.',
          'Accounts suspended for breaking our Terms and Conditions, such as sharing an account or copying course material.',
          'Problems caused only by your own device, phone storage or internet connection.',
        ],
      },
      {
        heading: 'How to ask for a refund',
        body: [
          'Email your request to {{supportEmail}}.',
          'You can also call us on {{supportPhone}}.',
          'Please include:',
        ],
        points: [
          'the mobile number registered on your account;',
          'the course name and the payment ID or order number (shown in the app under Profile → Transactions); and',
          'the reason for your request.',
        ],
      },
      {
        heading: 'What happens next',
        points: [
          'We reply within 2 working days to tell you whether the refund is approved.',
          'Approved refunds are paid to the original payment method through Razorpay. We cannot refund to a different account or in cash.',
          'We start the refund within 2 working days of approving it. It usually reaches your account within 5–7 working days, depending on your bank.',
          'We refund the full amount you actually paid. If you used a coupon, that is the discounted amount.',
          'Once a refund is made, the course is removed from your account and your access to it ends.',
        ],
      },
      {
        heading: 'Cancellation',
        points: [
          'Because a course unlocks immediately, a completed purchase cannot be cancelled on its own. To undo a purchase, ask for a refund under this policy.',
          'If you close the checkout before paying, nothing is charged and no order is completed.',
          'If money leaves your account but the payment fails or stays pending, your bank or Razorpay usually returns it automatically within 5–7 working days. If it does not, contact us with the payment details.',
          'There are no subscriptions, so there is never anything to cancel to stop future charges.',
        ],
      },
      {
        heading: 'Contact',
        points: [
          'Email: {{supportEmail}}',
          'Phone: {{supportPhone}}',
          'Support hours: {{supportHours}}',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    heading: '{{appName}} Privacy Policy',
    summary: 'What we collect when you learn with {{appName}}, why we collect it, who we share it with and the choices you have.',
    updatedAt: '2026-10-15',
    sections: [
      {
        heading: 'About this policy',
        body: [
          '{{appName}} is an online learning app for the dairy trade, operated by {{legalName}} (“we”, “us”, “our”). This policy explains how we collect, use, share and protect your personal data when you use the {{appName}} mobile app, our website and our support channels (together, the “Service”).',
          'We process personal data in line with Indian law, including the Information Technology Act, 2000 and its rules and the Digital Personal Data Protection Act, 2023. When you create an account you agree to the processing described here.',
        ],
      },
      {
        heading: 'The short version',
        points: [
          'We use your mobile number to create your account and sign you in with a one-time code.',
          'Everything else in your profile — name, email, city, goal and photo — is optional.',
          'Payments are handled by Razorpay. Your card, UPI and bank details never reach us.',
          'We show no ads, we never sell your personal data, and we do not use your phone’s location, contacts, camera or microphone.',
          'You can delete your account at any time, from the app or from our website.',
        ],
      },
      {
        heading: 'Information you give us',
        points: [
          'Mobile number (required): an Indian mobile number, used to create your account and to sign you in with a one-time password (OTP) sent by SMS.',
          'Profile details (optional): your name, email address, city, dairy goal and the subjects you are interested in.',
          'Profile photo (optional): a picture you choose from your phone’s gallery. It is uploaded to our image storage and shown on your profile.',
          'Ratings and reviews (optional): the stars and comments you post about a course you own. Your name and review are visible to other learners.',
          'Messages to us: what you send when you contact support or ask for a refund or account deletion, including your mobile number and any details you give.',
        ],
      },
      {
        heading: 'Information created when you use the Service',
        points: [
          'Purchases: the course you bought, its price, any coupon used, the payment status and method, and the payment and order references we receive from Razorpay.',
          'Learning progress: the courses on your account, the lessons you have completed and where you stopped in a video, so you can resume on any phone.',
          'App activity: events such as opening the app, viewing a course, starting or finishing a lesson, starting a checkout and the words you search for. They are linked to your account when you are signed in, and recorded without an account otherwise.',
          'Notifications: the messages we send you, plus a push notification token and your phone’s platform (Android or iOS) so we can deliver them.',
          'Technical data: your IP address and basic request details are processed by our servers and hosting providers to deliver the Service, limit repeated sign-in attempts and keep it secure. We do not store your IP address in our learning or usage records.',
        ],
      },
      {
        heading: 'Information that stays on your phone',
        body: [
          'Some information is kept only on your device and is never sent to us. Clearing the app’s data or uninstalling the app removes it:',
        ],
        points: [
          'your lesson notes, saved courses and saved batch sheets;',
          'your theme, language and notification preferences;',
          'a copy of the course catalogue, so the app opens quickly; and',
          'your sign-in session, kept in your phone’s secure storage.',
        ],
      },
      {
        heading: 'What we do not do',
        points: [
          'We do not sell or rent your personal data to anyone.',
          'We do not show advertising, and we do not use advertising IDs or third-party ad trackers.',
          'We do not access your device location, contacts, call logs, SMS messages, camera or microphone.',
          'We never see or store your card number, CVV, UPI PIN or net-banking password.',
        ],
      },
      {
        heading: 'How we use your information',
        body: [
          'We use personal data only for these purposes, on the basis of your consent or for uses the law allows without it — such as completing a purchase you ask for, meeting legal obligations and preventing fraud:',
        ],
        points: [
          'to create your account, verify your mobile number and keep you signed in;',
          'to give you access to the courses you buy and save your progress across devices;',
          'to process payments, refunds and coupons and keep the records the law requires;',
          'to send service messages — purchase confirmations, course updates, announcements and learning reminders;',
          'to answer your questions and handle refund, complaint and deletion requests;',
          'to understand how the app is used, such as which courses and lessons are popular, so we can improve our courses and recommend relevant ones;',
          'to protect the Service, our learners and our content from fraud, account sharing, piracy and abuse; and',
          'to comply with the law and respond to lawful requests from authorities.',
        ],
      },
      {
        heading: 'Who we share it with',
        body: [
          'We share personal data only as described below. Service providers may use it only to provide their service to us.',
        ],
        points: [
          'Razorpay processes payments. We send it your name, mobile number and email address (if you added one) to fill in the checkout, and receive the payment result.',
          'SMS service providers deliver your one-time sign-in codes.',
          'Expo and Google Firebase Cloud Messaging deliver push notifications to your phone.',
          'Cloudinary stores and serves images, including profile photos.',
          'Cloud hosting, database and video-storage providers run our servers, keep our database and stream course videos.',
          'Other learners see only what you post publicly: your name, rating and review on a course.',
          'Authorities, when required by law, a court order or a lawful government request, or to protect the rights, property or safety of our learners, the public or us.',
          'A buyer or successor, if our business is merged, sold or reorganised, under the same protections described here.',
        ],
      },
      {
        heading: 'Payments',
        body: [
          'When you buy a course, you pay on Razorpay’s secure checkout, inside the app or on Razorpay’s payment page. Your card, UPI and bank details go directly to Razorpay and never reach our servers. We receive only the result of the payment and its reference numbers, which we use to unlock your course, handle refunds and keep our accounts. Razorpay handles your payment data under its own privacy policy.',
        ],
      },
      {
        heading: 'Push notifications',
        body: [
          'If you allow notifications, your phone gives the app a push token, which we store with your account so we can send purchase confirmations, course updates, announcements and reminders. You can turn notifications off at any time in your phone’s settings. Signing out or deleting your account removes the token from your account.',
        ],
      },
      {
        heading: 'Where your data is stored',
        body: [
          'Your data is stored on secure servers run by our hosting and cloud providers, which may be located in India or in other countries. Wherever it is processed, we protect it as this policy describes and as Indian law requires.',
        ],
      },
      {
        heading: 'How long we keep it',
        points: [
          'Account and profile data: for as long as your account exists. It is deleted when you delete your account.',
          'Learning progress, reviews, personal notifications and push tokens: deleted with your account.',
          'One-time sign-in codes: stored only in hashed form, valid for 5 minutes and deleted once used or expired.',
          'App activity records: deleted automatically after about 13 months. When you delete your account, any that remain are separated from your identity.',
          'Payment and order records: kept for as long as tax and accounting laws require (currently up to 8 years), even after your account is deleted, but no longer linked to your profile.',
          'Account deletion requests: a record of the request, with your mobile number masked, is kept for up to 180 days after it is closed, to show it was handled.',
          'Support messages: for as long as needed to resolve your request and any follow-up.',
        ],
      },
      {
        heading: 'How we protect your data',
        body: [
          'No method of storage or transmission is completely secure, but we take reasonable security measures and will inform you and the authorities of a personal data breach as the law requires. These include:',
        ],
        points: [
          'all traffic between the app and our servers is encrypted over HTTPS;',
          'sign-in codes are stored only in hashed form, and repeated attempts are blocked;',
          'your sign-in session is kept in your phone’s encrypted secure storage;',
          'course videos are kept in private storage and played through short-lived links; and',
          'only authorised team members can use the admin tools, and only to run the Service.',
        ],
      },
      {
        heading: 'Your rights and choices',
        body: [
          'Under Indian law you have the right to:',
        ],
        points: [
          'Access: ask for a summary of the personal data we hold about you and how we use it.',
          'Correction: update your name, email, city, goal and photo at any time in Profile, or ask us to correct anything else.',
          'Erasure: delete your account and personal data, as described in the next section.',
          'Withdraw consent: stop using the Service and delete your account at any time; withdrawal does not affect processing that already happened.',
          'Grievance redressal: complain to our Grievance Officer (details below) and get a response.',
          'Nominate: name another person to exercise these rights for you in the event of your death or incapacity.',
          'Complain to the regulator: if you are not satisfied with our response, you may approach the Data Protection Board of India.',
          'To use any of these rights, email {{supportEmail}} with your registered mobile number. We may confirm your identity before we act on the request.',
        ],
      },
      {
        heading: 'Deleting your account',
        body: [
          'You can permanently delete your account and the personal data linked to it at any time:',
        ],
        points: [
          'In the app: open Profile → Settings → Delete account and confirm. Your account is deleted immediately.',
          'On the web, without the app: submit a request at {{deleteUrl}} with your registered mobile number. We confirm the request and delete the account within 7 working days.',
          'By email: write to {{supportEmail}} with the subject “Delete my account” and your registered mobile number.',
          'Deleting your account removes your profile, profile photo, course access, learning progress, reviews and notifications. Payment records the law requires us to keep are retained as described above, without your profile.',
        ],
      },
      {
        heading: 'Children',
        body: [
          'The Service is meant for adults who work in, or want to learn, the dairy trade, and it is not directed at children. If you are under 18, you may use it only with the verifiable consent of a parent or legal guardian. If we learn that we have collected a child’s personal data without that consent, we will delete it.',
        ],
      },
      {
        heading: 'Links to other services',
        body: [
          'The Service may link to websites or services run by others, such as Razorpay’s payment pages. Their own privacy policies apply to the information you give them.',
        ],
      },
      {
        heading: 'Changes to this policy',
        body: [
          'We may update this policy as the Service or the law changes. The “Last updated” date shows when it last changed. If we make significant changes, we will tell you in the app before they take effect.',
        ],
      },
      {
        heading: 'Contact and Grievance Officer',
        body: [
          'For any question, request or complaint about your personal data, contact our Grievance Officer. We acknowledge every complaint within 24 hours and resolve it within 15 days of receiving it.',
        ],
        points: [
          'Grievance Officer: {{grievanceName}}',
          'Email: {{grievanceEmail}}',
          'Phone: {{grievancePhone}}',
          'Address: {{address}}',
          'Operated by: {{legalName}}',
        ],
      },
    ],
  },
};
// </generated:legal>

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

// <generated:purchase-terms> — written by scripts/sync-content.mjs from server/src/data/defaultContent.js. Edit there.
export const purchaseTerms: string[] = [
  'Access to every lesson of this course on your account',
  'Lessons unlock as soon as your payment is confirmed',
  'Your progress and playback position are saved to your account',
  'Downloads, certificates and captions are not offered yet',
];
// </generated:purchase-terms>
