// Generated from app/src/data/content.ts — the built-in text the app shows when the admin has
// not written its own. The admin Content page edits from these, so nothing starts blank.
export const defaultFaqs = [
  {
    "question": "How long do I have access to a course I buy?",
    "answer": "Access terms are set per course and shown on the checkout screen before you pay. In this prototype every course is a sample product with sample terms, so nothing is charged and nothing expires."
  },
  {
    "question": "Are the purchases in this app real?",
    "answer": "Yes. Payments are processed by Razorpay in its secure checkout. Card, UPI and bank details never reach the YDU Academy app or server, and the course unlocks on your account once the payment is confirmed."
  },
  {
    "question": "How is my progress tracked?",
    "answer": "Lesson completion, playback position and your notes are stored on this device only. Clearing them from Settings → Reset demo data removes them."
  },
  {
    "question": "Can I watch lessons offline?",
    "answer": "Offline downloads are not implemented, so the app does not offer a download button. Any control you can see in the player is functional."
  },
  {
    "question": "Do courses have subtitles?",
    "answer": "Not yet. Captions are not offered in the player until real caption tracks are available, rather than showing a control that does nothing."
  },
  {
    "question": "I followed a method and the batch did not work",
    "answer": "The make-sheets in the app are sample educational content, not food-safety, veterinary or licensing guidance. Batch outcomes depend on your milk, your equipment and your local rules — check with your dairy officer or a qualified advisor before you change a commercial process."
  }
];

export const defaultLegalDocs = {
  "terms": {
    "title": "Terms of use",
    "heading": "YDU Academy terms of use",
    "summary": "The terms this prototype runs on",
    "sections": [
      {
        "heading": "What this document is",
        "body": [
          "YDU Academy is a prototype. This page is placeholder text, not a legal agreement, and it has to be replaced with reviewed terms before the app is distributed."
        ]
      },
      {
        "heading": "Courses, prices and reviews",
        "body": [
          "Everything in the catalog is sample material, written to show how the app works."
        ],
        "points": [
          "Courses, prices and ratings are fictional.",
          "Purchases are simulated end to end: no payment is processed and no money moves.",
          "Lesson videos are demo clips, not the training material they describe."
        ]
      },
      {
        "heading": "Applying what you learn",
        "body": [
          "You decide how to apply the methods shown in a lesson."
        ],
        "points": [
          "Batch sheets are teaching samples, not certified production records.",
          "Nothing here is food-safety, veterinary, licensing or regulatory advice.",
          "Check the rules that apply to your own dairy before you change how it works."
        ]
      },
      {
        "heading": "Your device, your data",
        "body": [
          "Progress, notes and saved items live on this device only. Clearing the app data removes them, and there is no backup yet."
        ]
      }
    ]
  },
  "refund": {
    "title": "Refund policy",
    "heading": "YDU Academy refund policy",
    "summary": "When a course can be refunded",
    "sections": [
      {
        "heading": "In this build",
        "body": [
          "Checkout is a demo. It unlocks a course on this device and takes no money, so there is nothing to refund yet."
        ],
        "points": [
          "No card, UPI or bank details are collected.",
          "Nothing is sent to a payment provider.",
          "A demo purchase can be cleared from Transactions on this device."
        ]
      },
      {
        "heading": "The window a shipped app would run on",
        "body": [
          "A released app would refund on these terms:"
        ],
        "points": [
          "Seven days from the date of purchase.",
          "Full refund while no lesson has been started.",
          "No refund once a quarter or more of the lessons are done."
        ]
      },
      {
        "heading": "What the refund is calculated on",
        "body": [
          "Refunds are calculated on the amount actually paid. A course bought with a coupon is refunded at the coupon price, never at the list price. Batch sheets, notes and downloaded material follow the same rule as the lessons."
        ]
      },
      {
        "heading": "How the money reaches you",
        "body": [
          "An approved refund goes back to the original payment method within five to seven working days, and the course locks again once the refund is processed."
        ]
      }
    ]
  },
  "privacy": {
    "title": "Privacy policy",
    "heading": "YDU Academy privacy policy",
    "summary": "What is stored, and where",
    "sections": [
      {
        "heading": "What this prototype stores",
        "body": [
          "Everything below is kept in this app on this device."
        ],
        "points": [
          "Your mobile number, used to sign in.",
          "The session token, in the platform secure store.",
          "Saved courses, batch sheets, lesson progress and your notes.",
          "The profile details you type in yourself."
        ]
      },
      {
        "heading": "What it does not do",
        "points": [
          "No analytics, advertising or third-party tracking.",
          "No data leaves the device — there is no server to send it to.",
          "No contact list, camera roll or location access."
        ]
      },
      {
        "heading": "Removing your data",
        "body": [
          "Logging out clears the session, progress and notes stored for it. Reset demo data on the Settings screen puts the app back to a clean slate."
        ]
      },
      {
        "heading": "What this document is",
        "body": [
          "Placeholder copy for a prototype. It is not a privacy policy, and it has to be replaced with a reviewed document before YDU Academy is distributed."
        ]
      }
    ]
  }
};

export const defaultPurchaseTerms = [
  "Stream every lesson of this course on this account",
  "Lessons unlock immediately after the demo purchase completes",
  "Batch notes, progress and playback position are saved on this device",
  "Downloads, certificates, captions and live classes are not offered in this prototype"
];
