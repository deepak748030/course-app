/**
 * Editorial content: FAQs and legal copy — curated in-app material that is
 * deliberately not part of the server catalog.
 */

import type { FaqItem } from '@/types';


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
 * replaces it). The same documents are served as public web pages under /legal on the server — the
 * URLs the Google Play Console asks for (privacy policy and account deletion) — so they describe what
 * the app and the server actually do. Change them when the data handling changes, and have them
 * reviewed by the academy's legal adviser.
 *
 * `{{supportEmail}}`, `{{supportPhone}}` and `{{appName}}` in the copy are filled in from the server
 * settings wherever a document is shown, so the contact details are never out of date.
 *
 * After editing, run `node scripts/export-content.mjs` from app/ to regenerate the server and
 * admin-dashboard copies, which also checks every document against the limits the admin can save.
 */

/**
 * The academy's contact details as the copy uses them before the server's settings arrive (first
 * launch offline, or a database with no settings yet). The same values the server falls back to;
 * once settings load, Admin → Settings wins.
 */
export const supportContact = { email: 'yduacademy@gmail.com', phone: '+91 7489301982' } as const;

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
  /** One line under the heading: the date it was last updated, and what the document covers. */
  summary: string;
  sections: readonly LegalSection[];
};

export const legalDocs: Record<
  'terms' | 'refund' | 'privacy' | 'delete-account' | 'about' | 'contact' | 'disclaimer',
  LegalDoc
> = {
  terms: {
    title: 'Terms of use',
    heading: 'YDU Academy terms of use',
    summary: 'Last updated 15 October 2026. The agreement between you and YDU Academy for using the app and buying courses.',
    sections: [
      {
        heading: 'About these terms',
        body: [
          'These terms of use (“terms”) are an agreement between you and YDU Academy (“YDU Academy”, “we”, “us” or “our”). They apply to your use of the YDU Academy mobile app, our courses and our related web pages (together, the “service”).',
          'By creating an account, buying a course or otherwise using the service, you agree to these terms and to our Privacy policy, Refund policy and Disclaimer, which form part of them. If you do not agree, please do not use the service.',
          'These terms are an electronic record under the Information Technology Act, 2000 and the rules made under it, and do not need a physical or digital signature.',
        ],
      },
      {
        heading: 'Who can use the service',
        points: [
          'You must be at least 18 years old and able to enter into a binding contract under Indian law.',
          'If you are under 18, you may use the service only through an account created and managed by your parent or lawful guardian, who accepts these terms for you and is responsible for your use.',
          'You must not use the service if we have previously suspended or removed your account for breaking these terms.',
          'The service is offered to users in India. Prices are in Indian rupees.',
        ],
      },
      {
        heading: 'Your account',
        points: [
          'You sign in with your Indian mobile number and a one-time password (OTP) sent to it. Use a number that belongs to you.',
          'Keep your phone and your OTP private. Never share an OTP with anyone — YDU Academy will never ask you for it.',
          'An account is for one person. Do not share, sell or transfer it, or let anyone else use it.',
          'You are responsible for activity on your account. Tell us straight away if you think someone else has used it.',
          'Keep your profile details accurate, and do not pretend to be someone else.',
        ],
      },
      {
        heading: 'Courses and free previews',
        points: [
          'Each course is a series of video lessons, with supporting material such as batch sheets, as described on its course page.',
          'Some lessons, or the first part of a lesson, may be free to watch as a preview. The rest of the course unlocks when you buy it.',
          'We may improve, update, reorder or replace lessons to keep courses accurate. A course you bought will continue to cover substantially the topics described on its course page when you bought it.',
          'Courses are for learning. Unless the course page says otherwise, a course does not lead to a certificate, qualification or licence.',
          'Offline downloads, captions and certificates are not offered at present. If that changes, the course page or checkout will say so.',
        ],
      },
      {
        heading: 'Prices and payment',
        points: [
          'Prices are shown in Indian rupees (₹) on the course page and at checkout, and include applicable taxes unless stated otherwise.',
          'You pay in advance through Razorpay, using the methods it offers, such as UPI, cards, net banking and wallets. YDU Academy does not see or store your card, UPI or bank details.',
          'A course unlocks on your account once Razorpay confirms your payment. If money leaves your account but the course does not unlock, contact us with the payment reference and we will unlock it or refund you.',
          'Coupons are optional, have their own conditions and expiry dates, cannot be exchanged for cash and apply only to the courses and period stated.',
          'We may change prices at any time. A change does not affect a course you have already paid for.',
          'If a course is shown at an obviously wrong price because of an error, we may cancel the order and refund the full amount you paid.',
        ],
      },
      {
        heading: 'Your licence to use a course',
        body: [
          'When you buy a course, we give you a personal, limited, non-exclusive, non-transferable and revocable licence to watch it in the YDU Academy app for your own learning, for as long as your account is active and we offer the course, subject to these terms. Buying a course does not transfer ownership of any content to you.',
          'If we ever have to stop offering a course you bought, we will try to give you notice in advance, and if you have not had a reasonable chance to use it, you can get a refund under our Refund policy.',
        ],
      },
      {
        heading: 'Acceptable use',
        body: ['When you use the service, you must not:'],
        points: [
          'Record, screen-capture, download, copy, share, sell, rent, broadcast or publish any course material, or help anyone else do so.',
          'Share your account or sign-in codes, or access a course you have not bought other than through the free previews in the app.',
          'Copy, modify, reverse engineer or decompile the app, or try to get around its security, payment or access controls.',
          'Use bots, scrapers or other automated tools to access the service or collect data from it.',
          'Post anything that is unlawful, false, misleading, defamatory, obscene, hateful, harmful to children or that infringes someone else’s rights.',
          'Interfere with or overload the service, or spread viruses or other harmful code.',
          'Use the service for any unlawful purpose, or any purpose these terms do not allow.',
        ],
      },
      {
        heading: 'Ratings and reviews',
        points: [
          'Only learners who own a course can rate and review it. A review must be your honest opinion and must follow the acceptable use rules above.',
          'Your profile name, your star rating and your review text are shown publicly on the course page.',
          'You keep ownership of your review, and you give YDU Academy a non-exclusive, royalty-free licence to display and use it in the service.',
          'We may hide or remove reviews that break these terms. Hidden reviews do not count toward a course’s rating.',
        ],
      },
      {
        heading: 'Our content and intellectual property',
        body: [
          'The app, the courses, videos, text, batch sheets, images, logos, the YDU Academy name and all other material in the service belong to YDU Academy or its licensors and are protected by copyright, trademark and other laws. Apart from the licence described above, no rights are given to you.',
          'If you believe something in the service infringes your rights, write to {{supportEmail}} with the details and we will look into it promptly.',
        ],
      },
      {
        heading: 'Learning material is not professional advice',
        body: [
          'Courses teach methods and show examples. They are not food-safety, veterinary, medical, legal, licensing, regulatory or financial advice. You are responsible for how you use what you learn, including following the food-safety, licensing and other laws that apply to you. Please read our Disclaimer.',
        ],
      },
      {
        heading: 'Notifications and messages',
        body: [
          'We may send you service messages about your account, purchases and refunds. If you allow push notifications, we may also send course updates, learning reminders and news about new courses. You can turn push notifications off at any time in your phone’s settings.',
        ],
      },
      {
        heading: 'Availability of the service',
        body: [
          'We work to keep the service available and working well, but we do not promise that it will always be uninterrupted, error-free or available on every device. We may pause the service for maintenance, and we may ask you to update the app to keep using it.',
          'We may change, add or remove features. If a change significantly affects a course you have paid for, we will tell you in advance where we reasonably can.',
        ],
      },
      {
        heading: 'Suspension and termination',
        points: [
          'You can stop using the service at any time, and delete your account from Settings in the app or by following the steps on our Delete account page.',
          'We may suspend or close your account, or remove access to courses, if you break these terms, misuse the service, commit fraud, reverse a payment, or if the law requires us to. Where appropriate, we will tell you why.',
          'When your account is deleted or closed, your licence to its courses ends and you lose access to them. Deleting your own account does not entitle you to a refund.',
          'Parts of these terms that by their nature should continue — such as intellectual property, disclaimers, limitation of liability and governing law — continue after your account ends.',
        ],
      },
      {
        heading: 'Third-party services',
        body: [
          'The service relies on third parties, such as Razorpay for payments, app stores for distribution and mobile networks for sign-in codes. Their own terms apply to your use of their services, and we are not responsible for their acts or omissions.',
        ],
      },
      {
        heading: 'Disclaimer of warranties',
        body: [
          'To the extent permitted by law, the service and all courses are provided “as is” and “as available”. We do not guarantee any particular result, yield, income or business outcome from a course, or that the service will meet every need you have. Nothing in these terms limits rights you have under the Consumer Protection Act, 2019 that cannot be limited by contract.',
        ],
      },
      {
        heading: 'Limitation of liability',
        body: [
          'To the extent permitted by law, YDU Academy is not liable for any indirect, incidental, special or consequential loss, or for any loss of profit, business, data or goodwill, arising from your use of the service or any course.',
          'To the extent permitted by law, our total liability to you for any claim relating to a course or the service is limited to the amount you paid for the course concerned.',
          'Nothing in these terms excludes liability that cannot be excluded by law, such as liability for fraud.',
        ],
      },
      {
        heading: 'Indemnity',
        body: [
          'If you break these terms or the law while using the service, you agree to compensate YDU Academy for the reasonable losses, costs and claims that result, to the extent permitted by law.',
        ],
      },
      {
        heading: 'Governing law and disputes',
        body: [
          'These terms are governed by the laws of India. If you have a problem, please contact us first — most issues can be solved quickly. Any dispute that cannot be resolved will be subject to the jurisdiction of the competent courts in India. This does not take away any right you have to approach a consumer commission under consumer protection law.',
        ],
      },
      {
        heading: 'Complaints',
        body: [
          'If you have a complaint about a course, a payment or the service, contact us at {{supportEmail}} or {{supportPhone}}. We acknowledge complaints within 48 hours and aim to resolve them within 30 days of receiving them.',
        ],
      },
      {
        heading: 'Changes to these terms',
        body: [
          'We may update these terms from time to time. We will change the “Last updated” date at the top and, if a change is significant, tell you in the app before it takes effect. If you keep using the service after a change takes effect, the updated terms apply. The version published in the app and on our website is the one that applies.',
        ],
      },
      {
        heading: 'Contact',
        body: ['Questions about these terms? Email {{supportEmail}} or call {{supportPhone}}.'],
      },
    ],
  },
  refund: {
    title: 'Refund policy',
    heading: 'YDU Academy refund and cancellation policy',
    summary: 'Last updated 15 October 2026. When a course purchase can be cancelled or refunded, how to ask, and how long a refund takes.',
    sections: [
      {
        heading: 'About this policy',
        body: [
          'This policy applies to courses bought in the YDU Academy app and paid for through Razorpay. It forms part of our Terms of use.',
          'Courses are digital content. A course unlocks on your account as soon as your payment is confirmed, and there is nothing to ship or deliver.',
        ],
      },
      {
        heading: 'Cancellations',
        body: [
          'Each course is a one-time purchase, not a subscription, so there are no recurring charges to cancel. If you leave the payment page before paying, or the payment fails, no order is completed and you are not charged.',
          'If money is deducted but the payment does not complete, it is normally reversed automatically by Razorpay or your bank within 5–7 working days. If it is not, contact us with the transaction reference and we will help.',
        ],
      },
      {
        heading: 'When you will get a full refund',
        body: ['We refund the full amount you paid if:'],
        points: [
          'You were charged more than once for the same course. The duplicate payment is refunded.',
          'Your payment succeeded but the course did not unlock, and we cannot unlock it within 3 working days of you telling us.',
          'A technical problem on our side stops the course from playing, and we cannot fix it within 7 days of you reporting it.',
          'The course is materially different from the description on its course page when you bought it.',
          'We cancel your order, for example because of a pricing error, or we stop offering the course before you have had a reasonable chance to use it.',
        ],
      },
      {
        heading: 'Change of mind',
        body: [
          'Because a course unlocks immediately, we do not normally refund a purchase just because you changed your mind. But if you ask within 7 days of buying, and you have completed no more than 25% of the course’s lessons, we will review your request in good faith.',
        ],
      },
      {
        heading: 'When a refund is not available',
        points: [
          'Change-of-mind requests made more than 7 days after purchase, or after more than 25% of the course has been completed.',
          'Problems caused by your device, internet connection or settings, where our team has offered a working solution.',
          'Accounts suspended or closed for breaking our Terms of use, for example by sharing the account or copying course material.',
          'Purchases on an account that has already been deleted.',
          'The value of a coupon or discount. Refunds are always based on the amount you actually paid.',
        ],
      },
      {
        heading: 'How to ask for a refund',
        body: ['Email {{supportEmail}} or call {{supportPhone}} and tell us:'],
        points: [
          'The mobile number registered with your account.',
          'The course name and the order or payment reference, shown under Transactions in the app and in Razorpay’s payment confirmation.',
          'Why you are asking for a refund, with screenshots if something went wrong.',
        ],
      },
      {
        heading: 'How a request is handled',
        points: [
          'We acknowledge every request within 2 working days and tell you our decision within 7 working days of receiving the details we need.',
          'A refund is calculated on the amount you actually paid. A course bought with a coupon is refunded at the price you paid, and the coupon is not reissued.',
          'When a refund is approved, the course is removed from your account.',
          'If we decline a request, we will explain why. You can ask for the decision to be reviewed by writing to us with “Grievance” in the subject line.',
        ],
      },
      {
        heading: 'How and when the money reaches you',
        body: [
          'Approved refunds go back to the original payment method — the same card, UPI account, bank account or wallet you paid with. We cannot refund to a different account or in cash.',
          'We start the refund within 2 working days of approving it. Razorpay and your bank usually take a further 5–7 working days to credit it, and UPI refunds are often faster. The final timing depends on your bank.',
        ],
      },
      {
        heading: 'Payment disputes and chargebacks',
        body: [
          'If something is wrong with a payment, please contact us before you raise a dispute or chargeback with your bank — we can usually fix it faster. While a chargeback is open, we may pause access to the course concerned.',
        ],
      },
      {
        heading: 'Your statutory rights',
        body: [
          'This policy does not affect any rights you have under the Consumer Protection Act, 2019 or other applicable law.',
        ],
      },
      {
        heading: 'Changes to this policy',
        body: [
          'We may update this policy. The version in force when you bought a course applies to that purchase.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    heading: 'YDU Academy privacy policy',
    summary: 'Last updated 15 October 2026. What we collect, why we collect it, who we share it with, how long we keep it and the choices you have.',
    sections: [
      {
        heading: 'About this policy',
        body: [
          'This privacy policy explains how YDU Academy (“YDU Academy”, “we”, “us” or “our”) collects, uses, shares, stores and protects personal data when you use the YDU Academy mobile app, our courses and the web pages we publish, including this one (together, the “service”).',
          'YDU Academy is based in Khandwa, Madhya Pradesh, India. Our contact details, including our Grievance Officer’s, are at the end of this policy.',
          'It applies to everyone who uses the service, whether or not they have an account. Please read it together with our Terms of use. By creating an account or using the service, you agree to the processing described here. If you do not agree, please do not use the service.',
        ],
      },
      {
        heading: 'The short version',
        points: [
          'We collect only what the service needs: your mobile number to sign you in, the profile details you choose to add, your purchases and your learning progress.',
          'Payments happen on Razorpay’s secure checkout. Your card, UPI and bank details never reach YDU Academy.',
          'We do not sell your personal data, we do not show third-party ads and we do not track you across other apps or websites.',
          'You can see, correct or delete your data at any time, and delete your account in the app or without it — see “Deleting your account” below.',
        ],
      },
      {
        heading: 'Information you give us',
        points: [
          'Mobile number: the Indian mobile number you sign in with, using a one-time password (OTP). It identifies your account.',
          'Name: the name on your profile. A new account starts with a placeholder such as “Learner 1234” until you change it.',
          'Optional profile details: an email address, your city, your learning goal and the subjects you are interested in, if you choose to add them.',
          'Profile photo: only if you choose to add one. You pick a single photo, and only that photo is uploaded.',
          'Ratings and reviews: the star rating and the text you write about a course you own.',
          'Messages to us: what you send when you email or call our team, such as a question, a refund request or a complaint.',
        ],
      },
      {
        heading: 'Information created when you use the service',
        points: [
          'Purchases: the course you bought, its price, any coupon and discount, the payment status (pending, paid or refunded), the payment method type (for example UPI or card) and the order and payment references from Razorpay.',
          'Learning progress: the courses you own, the lessons you complete, the last lesson you opened and where you stopped watching, so you can continue on any device.',
          'App activity: events such as opening the app, viewing a course, starting or completing a lesson, starting checkout and the words you search for. Each event records the time and, if you are signed in, your account.',
          'Account records: when your account was created, when you last signed in and whether it is active or blocked.',
          'Inbox messages: the notifications we send to you, kept in your in-app inbox.',
        ],
      },
      {
        heading: 'Information from your device',
        points: [
          'Push notification token: if you allow notifications, your phone gets a token from Expo and Firebase Cloud Messaging (or Apple’s push service). We store it with the platform (Android or iOS) and when it was last used, so notifications reach that phone.',
          'Connection data: when the app connects to our servers, they receive your IP address and basic request details such as the time. We use this to deliver the service, keep it secure and limit abuse, for example how often sign-in codes can be requested.',
          'Our hosting providers may keep short-lived server logs that include IP addresses, for security and troubleshooting.',
          'We do not use your advertising ID, and we do not collect hardware identifiers such as your IMEI.',
        ],
      },
      {
        heading: 'Information that stays on your device',
        body: [
          'Some information is stored only on your phone and is not sent to our servers. You can remove most of it with Clear data on this device in Settings, and all of it by uninstalling the app.',
        ],
        points: [
          'Notes you write on lessons.',
          'Courses you save for later, and your recent searches.',
          'A copy of the course catalog, so the app opens quickly.',
          'Your preferences, such as theme, language and notification switches.',
          'Your sign-in session, kept in your phone’s secure storage.',
        ],
      },
      {
        heading: 'Payments',
        body: [
          'Payments are processed by Razorpay Software Private Limited (“Razorpay”). You enter your card, UPI, net-banking or wallet details directly on Razorpay’s checkout or in your UPI app. Those details never reach YDU Academy’s app or servers.',
          'To take a payment, we give Razorpay your name, mobile number, email address (if your account has one), the amount and our order reference. Razorpay tells us whether the payment succeeded, the payment reference and the payment method type, which we keep with your order. Razorpay handles your payment information under its own privacy policy and the security standards that apply to payment companies.',
        ],
      },
      {
        heading: 'What we do not do',
        points: [
          'We do not sell, rent or trade your personal data.',
          'We do not show third-party advertising, share your data with advertisers or data brokers, or track you across other apps and websites.',
          'We do not access your contacts, call logs, SMS messages, location, microphone or camera.',
          'We do not access the photos or files on your phone, apart from the one profile photo you choose to upload.',
          'We do not collect card numbers, CVV, UPI PINs, net-banking passwords or other payment credentials.',
          'We do not ask for sensitive information such as Aadhaar, PAN, health or bank account details.',
        ],
      },
      {
        heading: 'Permissions the app asks for',
        body: [
          'The app asks for a permission only when a feature needs it. You can say no, and you can change your choice later in your phone’s settings.',
        ],
        points: [
          'Notifications: to send course updates, learning reminders and account messages. The app works without it; you just will not receive push notifications.',
          'Photos: only when you tap to add or change your profile photo, so you can choose a picture. Only the photo you pick is used.',
          'Internet access: to sign you in, load courses, stream lessons and sync your progress.',
        ],
      },
      {
        heading: 'How we use your information',
        body: [
          'We use personal data only for the purposes below, and we will ask for your consent before using it for any new purpose:',
        ],
        points: [
          'To create and secure your account, and to sign you in with a one-time password sent to your mobile number.',
          'To sell you courses, take payment through Razorpay, unlock what you bought and keep records of your orders.',
          'To stream lessons, save your progress and let you continue where you stopped, on any device.',
          'To show your ratings and reviews on course pages and calculate course ratings.',
          'To send you service messages and, if you allow them, push notifications about your courses, new lessons, reminders and new courses.',
          'To answer your questions, process refunds and resolve complaints.',
          'To understand how the service is used — for example which courses are viewed and where learners stop — so we can improve courses and the app and suggest related courses.',
          'To keep the service safe: preventing fraud, abuse and unauthorised access, and enforcing our Terms of use.',
          'To comply with the law, respond to lawful requests from authorities and keep the records the law requires.',
        ],
      },
      {
        heading: 'Legal basis',
        body: [
          'We process your personal data with your consent, which you give when you create an account and use the features described here, and for the legitimate uses allowed by the Digital Personal Data Protection Act, 2023 — for example, where you have voluntarily given us data for a specific purpose, to comply with the law or a court order, or in an emergency.',
          'You can withdraw your consent at any time by deleting your account or contacting us. This does not affect processing that happened before you withdrew it, and features that need the data, such as signing in, will stop working.',
        ],
      },
      {
        heading: 'Who we share information with',
        body: [
          'We share personal data only with the parties below, only as much as each needs, and only for the purposes in this policy. Service providers process data on our behalf and under our instructions.',
        ],
        points: [
          'Razorpay: to process payments, refunds and payment disputes.',
          'Cloud hosting and database providers: to run our servers and store account, order and progress data.',
          'Cloudinary: to store and deliver profile photos and course images.',
          'Video storage providers (such as Backblaze): to stream lesson videos. They receive your IP address when you play a lesson, but not your account details.',
          'Expo, Google Firebase Cloud Messaging and Apple Push Notification service: to deliver push notifications to your phone.',
          'An SMS service provider: to send sign-in codes to your mobile number.',
          'Everyone who views a course page: your profile name, star rating and review text, if you review that course.',
          'Authorities and others where the law requires: to comply with a legal obligation, court order or lawful government request, or to protect the rights, property or safety of our learners, the public or YDU Academy.',
          'A buyer or successor: if YDU Academy is merged, acquired or sells its assets, personal data may be transferred as part of the deal, under this policy or one that protects it at least as well.',
        ],
      },
      {
        heading: 'Where your data is stored',
        body: [
          'Your data is stored on secure servers run by our hosting providers. Some providers, such as Expo, Cloudinary and our cloud hosting providers, may store or process data outside India. Any transfer outside India is made only as Indian law permits, including any restrictions notified by the Government of India under the Digital Personal Data Protection Act, 2023, and only to providers that protect data with appropriate safeguards.',
        ],
      },
      {
        heading: 'How we protect your information',
        body: [
          'We protect personal data with reasonable security practices and procedures. No method of storage or transmission is completely secure, but if a personal data breach happens we will act quickly to contain it and will inform affected users and the Data Protection Board of India as the law requires.',
          'Our safeguards include:',
        ],
        points: [
          'Data between the app and our servers travels over encrypted HTTPS connections.',
          'Sign-in codes are stored only as a one-way cryptographic hash, expire after 5 minutes and stop working after 3 wrong attempts.',
          'Your sign-in session is kept in your phone’s secure storage and expires after a set time.',
          'Lesson videos are kept in private storage and played through short-lived links issued only to learners allowed to watch them.',
          'Only authorised people who need it to run the service can access personal data, and admin accounts are protected by hashed passwords.',
          'Payment details are handled by Razorpay and never stored on our systems.',
        ],
      },
      {
        heading: 'How long we keep your information',
        body: ['We keep personal data only for as long as we need it for the purposes in this policy:'],
        points: [
          'Account and profile data: for as long as your account exists. It is deleted when you delete your account.',
          'Sign-in codes: deleted as soon as they are used, and expire automatically after 5 minutes.',
          'Orders, course access, progress and reviews: for as long as your account exists, then deleted, except records the law requires us to keep.',
          'App activity: deleted automatically about 13 months after it is recorded. If you delete your account sooner, your activity is first separated from your account so it can no longer be linked to you.',
          'Push notification tokens: until you log out, the token stops working or you delete your account.',
          'Support messages: for as long as we need them to resolve your request and handle any follow-up.',
          'Records required by law: tax, accounting and payment records may be kept for as long as Indian law requires (generally up to 8 years), even after your account is deleted.',
          'Backups: deleted data may remain in secure backups for a limited time, until those backups are overwritten in their normal cycle.',
        ],
      },
      {
        heading: 'Deleting your account',
        body: [
          'You can delete your account at any time. In the app, go to Profile → Settings → Delete account and confirm. Your account is deleted immediately.',
          'Without the app, email {{supportEmail}} from any device with the subject “Delete my account” and the mobile number registered with your account. We will confirm the request with you and delete the account within 7 days. Our Delete account page explains the steps, and exactly what is deleted and what is kept.',
          'Deleting your account permanently removes your profile and photo, your purchases and course access, your lesson progress, your ratings and reviews, your inbox messages and your device tokens, and separates your app activity from your account. Deletion cannot be undone, and purchased courses cannot be restored or refunded afterwards.',
        ],
      },
      {
        heading: 'Your rights and choices',
        body: [
          'Under applicable law, including the Digital Personal Data Protection Act, 2023, you can ask us to do the things below. Contact us using the details under “Grievance Officer and contact”. We may first confirm your identity, for example on your registered mobile number, and we will respond within 30 days.',
        ],
        points: [
          'Access: get a summary of the personal data we hold about you, how we use it and who we have shared it with.',
          'Correction: correct, complete or update your data. You can edit your profile details in the app at any time.',
          'Erasure: delete your account, or ask us to delete specific data we no longer need.',
          'Withdraw consent: stop processing that relies on your consent, from then on.',
          'Nomination: name another person to exercise your rights if you die or become unable to do so.',
          'Grievance redressal: have your complaint handled by our Grievance Officer and, if you are not satisfied, complain to the Data Protection Board of India.',
          'Notifications: turn off push notifications at any time in your phone’s settings.',
        ],
      },
      {
        heading: 'Children',
        body: [
          'YDU Academy is made for adults learning a trade. It is not directed at children, and you must be 18 or older to create an account. A parent or lawful guardian may let a child learn with the parent’s own account, under their supervision.',
          'We do not knowingly collect personal data from anyone under 18 without verifiable consent from a parent or guardian, and we do not track children, build profiles of them or show them targeted advertising. If you believe a child has given us personal data, contact us and we will delete it.',
        ],
      },
      {
        heading: 'Cookies and similar technologies',
        body: [
          'The app does not use cookies. It stores some information on your phone, as described under “Information that stays on your device”.',
          'Our policy web pages, including this one, do not set cookies, run analytics scripts or show ads. Razorpay’s checkout pages may use cookies under Razorpay’s own policies.',
        ],
      },
      {
        heading: 'Third-party services',
        body: [
          'The app opens some services run by others, such as Razorpay’s checkout and your UPI app. Their privacy policies govern how they use your information, and we encourage you to read them. We are not responsible for the practices of services we do not control.',
        ],
      },
      {
        heading: 'Changes to this policy',
        body: [
          'We may update this policy when our service or the law changes. We will update the “Last updated” date at the top and, for significant changes, tell you in the app before they take effect. If you keep using the service after a change takes effect, the updated policy applies.',
        ],
      },
      {
        heading: 'Grievance Officer and contact',
        body: [
          'For questions, requests about your personal data, or complaints about how we handle it, contact our Grievance Officer. Please include the mobile number registered with your account. We acknowledge complaints within 48 hours and resolve them within 30 days of receiving them.',
        ],
        points: [
          'Grievance Officer: Deepak Kushwah',
          'Email: {{supportEmail}} (subject “Privacy request” or “Grievance”)',
          'Phone: {{supportPhone}}',
          'Address: YDU Academy, Khandwa, Madhya Pradesh, India',
        ],
      },
    ],
  },
  'delete-account': {
    title: 'Delete account',
    heading: 'Delete your YDU Academy account',
    summary: 'Last updated 15 October 2026. How to delete your YDU Academy account and data, with or without the app, and what is deleted or kept.',
    sections: [
      {
        heading: 'About this page',
        body: [
          'This page explains how to delete your YDU Academy account and the personal data linked to it. You can do it yourself in the YDU Academy app, or ask us to do it for you from any device, without installing or opening the app.',
        ],
      },
      {
        heading: 'Option 1: Delete your account in the app',
        body: ['The quickest way. Your account is deleted immediately.'],
        points: [
          'Open the YDU Academy app and sign in with your mobile number.',
          'Go to Profile, then tap Settings.',
          'Under Account, tap Delete account.',
          'Read the confirmation and tap Delete account again.',
        ],
      },
      {
        heading: 'Option 2: Ask us to delete it, without the app',
        body: ['If you have uninstalled the app, changed your phone or cannot sign in:'],
        points: [
          'Email {{supportEmail}} with the subject “Delete my account”.',
          'Include the mobile number registered with your YDU Academy account.',
          'We will confirm the request with you on that mobile number before deleting anything. We will never ask for a payment, your card details, your UPI PIN or a sign-in code.',
          'We delete the account within 7 days of confirming the request, and tell you when it is done.',
          'Prefer to talk? Call {{supportPhone}} on a working day and we will help.',
        ],
      },
      {
        heading: 'What is deleted',
        body: ['When your account is deleted, we permanently delete from our systems:'],
        points: [
          'Your profile: name, mobile number, profile photo, email address, city, learning goal and interests.',
          'Your purchase history and your access to the courses you bought.',
          'Your lesson progress and playback positions.',
          'Your ratings and reviews.',
          'Messages sent only to you in your in-app inbox, and the push notification tokens of your devices.',
          'Any unused sign-in code for your number.',
        ],
      },
      {
        heading: 'What is kept, and for how long',
        points: [
          'Records the law requires us to keep, such as tax and accounting records of your payments, are kept only for the period Indian law requires (generally up to 8 years) and used only for that purpose.',
          'Razorpay, our payment partner, keeps its own records of your payments as the rules that apply to it require, under Razorpay’s privacy policy.',
          'App activity, such as courses viewed, is separated from your account so it can no longer identify you, and is deleted automatically within about 13 months of being recorded.',
          'Information needed to settle an open refund, payment dispute or legal claim is kept until it is resolved.',
          'Copies in our secure backups are removed when those backups are overwritten in their normal cycle.',
        ],
      },
      {
        heading: 'Before you delete',
        points: [
          'Deletion is permanent. We cannot restore your account, purchases or progress afterwards.',
          'You lose access to every course you bought, and deleting your account does not make you eligible for a refund. If you have a refund request open, wait until it is settled.',
          'Notes are kept only on your phone. Remove them with Clear data on this device in Settings, or by uninstalling the app.',
          'If you sign in again later with the same mobile number, a new, empty account is created.',
          'Uninstalling the app does not delete your account. Use one of the options above.',
        ],
      },
      {
        heading: 'Delete some data and keep your account',
        points: [
          'Edit your name, photo and other profile details from Profile at any time.',
          'Clear notes, saved courses and cached data from your phone with Settings → Clear data on this device.',
          'Turn off push notifications in your phone’s settings.',
          'To delete a specific item, such as a review, email {{supportEmail}} and tell us what to remove.',
        ],
      },
      {
        heading: 'Questions',
        body: [
          'Contact us at {{supportEmail}} or {{supportPhone}}. Our Privacy policy explains in full how we handle your data.',
        ],
      },
    ],
  },
  about: {
    title: 'About us',
    heading: 'About YDU Academy',
    summary: 'An education app that teaches the dairy trade through short, practical video courses.',
    sections: [
      {
        heading: 'Who we are',
        body: [
          'YDU Academy is an online education service for people who work with milk — dairy farmers, milk collection and processing staff, dairy technicians, small dairy owners and anyone learning the trade.',
          'Our aim is simple: practical, honest lessons that you can watch on your phone and put to use the same day, in plain language and at a fair price.',
        ],
      },
      {
        heading: 'What we teach',
        points: [
          'Milk handling: reception, testing, chilling and quality checks',
          'Paneer and chhana, ghee and butter, curd and other fermented products',
          'Cheese and frozen desserts',
          'Farm practice and animal care basics',
          'Running a dairy as a business',
        ],
      },
      {
        heading: 'How courses work',
        points: [
          'Every course is a sequence of short video lessons, filmed with real equipment, with batch sheets you can follow along with.',
          'Free previews let you watch part of a course before you decide to buy it.',
          'You buy a course once, pay securely through Razorpay, and it unlocks on your account straight away.',
          'Your progress is saved to your account, so you can pick up where you stopped on any phone.',
          'The app’s menus and buttons are available in English and Hindi.',
        ],
      },
      {
        heading: 'What we do not do',
        points: [
          'We do not issue certificates, diplomas or licences, and our courses do not replace training or certification that the law requires.',
          'We do not give food-safety, veterinary, legal or financial advice. See our Disclaimer.',
          'We do not sell your data or show third-party advertising. See our Privacy policy.',
        ],
      },
      {
        heading: 'Our promises to learners',
        points: [
          'Clear prices in rupees, shown before you pay.',
          'A fair Refund policy, and a real person to talk to.',
          'Your data handled with care, and deleted when you ask.',
        ],
      },
      {
        heading: 'Getting in touch',
        body: [
          'Questions about a course, an order or your account? Email {{supportEmail}} or call {{supportPhone}}. More ways to reach us are on the Contact us page.',
        ],
      },
    ],
  },
  contact: {
    title: 'Contact us',
    heading: 'Contact YDU Academy',
    summary: 'How to reach the YDU Academy team for help with courses, payments, refunds, privacy and complaints.',
    sections: [
      {
        heading: 'Support',
        body: ['Email or call the YDU Academy team with any question about the app, a course, a payment or your account.'],
        points: ['Email: {{supportEmail}}', 'Phone: {{supportPhone}}', 'Address: YDU Academy, Khandwa, Madhya Pradesh, India'],
      },
      {
        heading: 'When we are available',
        body: [
          'We answer emails and calls on working days, except public holidays. We aim to reply to emails within 2 working days, and payment and refund questions are handled first.',
        ],
      },
      {
        heading: 'What to include',
        points: [
          'The mobile number registered with your account',
          'What you were doing when something went wrong, with a screenshot if you can',
          'The course and lesson, if it is about one',
          'Your order or payment reference for anything about a payment or refund',
        ],
      },
      {
        heading: 'Payments and refunds',
        body: [
          'For a payment that went through but did not unlock a course, a double charge or a refund request, include your payment reference. Our Refund policy explains what happens next and how long it takes.',
        ],
      },
      {
        heading: 'Privacy and account deletion',
        body: [
          'To get a summary of your data, correct it or delete your account, see our Privacy policy and Delete account page, or email us with the subject “Privacy request” or “Delete my account”.',
        ],
      },
      {
        heading: 'Grievance Officer',
        body: [
          'If your issue is not resolved, or you want to make a formal complaint — including about your personal data — write to our Grievance Officer, Deepak Kushwah, at {{supportEmail}} with “Grievance” in the subject line. We acknowledge complaints within 48 hours and resolve them within 30 days of receiving them.',
        ],
      },
      {
        heading: 'Stay safe',
        points: [
          'YDU Academy will never ask for your OTP, UPI PIN, card number, CVV or net-banking password — not by phone, email, SMS or WhatsApp.',
          'We never ask you to pay a fee to receive a refund, or to install a screen-sharing or remote-access app.',
          'If someone claiming to be from YDU Academy asks for any of these, do not share them, and tell us at {{supportEmail}}.',
        ],
      },
    ],
  },
  disclaimer: {
    title: 'Disclaimer',
    heading: 'YDU Academy disclaimer',
    summary: 'Last updated 15 October 2026. What the courses cover, what they do not, and the responsibilities that stay with you.',
    sections: [
      {
        heading: 'Educational content only',
        body: [
          'YDU Academy courses are for general education. They teach methods and show examples from real dairies. They are not food-safety, veterinary, medical, legal, licensing, regulatory, financial or business advice, and they do not replace advice from a qualified professional who knows your situation.',
        ],
      },
      {
        heading: 'Results depend on your conditions',
        body: [
          'Batch outcomes depend on your milk, your animals, your equipment, your ingredients, your hygiene, the climate and how closely you follow a method. We cannot guarantee that you will get the results shown in a lesson, or any particular yield, quality, income or profit.',
        ],
      },
      {
        heading: 'Food safety and the law',
        points: [
          'If you make or sell dairy products, you are responsible for following the Food Safety and Standards Act, 2006, FSSAI licensing or registration rules, labelling rules and any state or local requirements that apply to you.',
          'Check with your food safety officer, dairy development officer or a qualified advisor before you change a commercial process or sell a new product.',
          'Follow safe practices with hygiene, cleaning chemicals, hot liquids, steam and electrical equipment. Lessons show methods, not a complete safety procedure for your premises.',
        ],
      },
      {
        heading: 'Animal health',
        body: [
          'Lessons about animals and farm practice are general information. For illness, injury, breeding, medicines or vaccination, always consult a registered veterinarian.',
        ],
      },
      {
        heading: 'Accuracy of content',
        body: [
          'We work to keep courses accurate and up to date, but rules, standards and good practice change, and lessons may contain errors or omissions. Courses are updated over time; the version of a lesson available in the app when you watch it is the one that applies. If you spot a mistake, please tell us at {{supportEmail}}.',
        ],
      },
      {
        heading: 'Brands, equipment and reviews',
        body: [
          'Equipment, ingredients and brands that appear in lessons are shown as examples only. Unless we say so, we have no relationship with them and do not endorse or guarantee them. Reviews on course pages are the personal opinions of learners, not statements by YDU Academy.',
        ],
      },
      {
        heading: 'Payments',
        body: [
          'Payments are handled by Razorpay. YDU Academy does not store card, UPI or bank details and is not responsible for delays or failures caused by Razorpay, your bank or your payment app — though we will always help you sort them out.',
        ],
      },
      {
        heading: 'Limitation of liability',
        body: [
          'To the extent permitted by law, YDU Academy is not responsible for any loss, damage, injury, illness or penalty arising from how you use information from the courses. Our full liability terms are in our Terms of use.',
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
