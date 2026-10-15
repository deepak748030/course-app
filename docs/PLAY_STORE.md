# Publishing YDU Academy on Google Play

Everything Google Play (and Razorpay's website review) asks for, and where it lives in this repo.
The admin dashboard has the same information, with copy buttons and live links, under
**Play Store** in the sidebar.

## 1. Public pages (no sign-in)

The admin dashboard deployment (Vercel) serves a small public website. Replace
`https://YOUR-DASHBOARD-DOMAIN` with its address (or a custom domain pointed at the same project).

| Page | URL | Where it goes |
| --- | --- | --- |
| Privacy Policy | `/privacy-policy` | Play Console → App content → **Privacy policy**; Store listing |
| Delete account | `/delete-account` | App content → Data safety → **Delete account URL** |
| About us | `/about` | Store settings → Store listing contact details → **Website** |
| Terms and Conditions | `/terms` | Razorpay website review; shown in the app |
| Refund and Cancellation | `/refund-policy` | Razorpay website review; shown in the app |
| Shipping and Delivery | `/shipping-policy` | Razorpay website review (digital delivery) |
| Contact us | `/contact` | Razorpay website review; Grievance Officer |
| Courses and pricing | `/pricing` | Razorpay website review (products and prices) |
| All policies | `/legal` | One link for anyone who asks |

Old spellings redirect (`/privacy`, `/terms-and-conditions`, `/account-deletion`, `/contact-us`, …).
`vercel.json` already rewrites every path to the SPA, so these work on a fresh deploy.

### Where the text comes from

- Built-in text: `server/src/data/defaultContent.js` — written from what the app and server really
  do (phone OTP sign-in, optional profile fields, Razorpay, push tokens, analytics events, deletion).
  After editing it, run `node scripts/sync-content.mjs` to refresh the app's and dashboard's copies.
- The admin's own text: dashboard → **Content → Policies and pages** (overrides any document).
- Business details: dashboard → **Settings → Business and legal details** — registered name,
  address, GSTIN, support hours, Grievance Officer, courts for disputes and the website address.
  They fill the `{{placeholders}}` in the documents; a line whose detail is empty is hidden.

**Before submitting, fill in Settings:** a real support email and phone (the seed values
`support@ydu.academy` / `+91 98765 43210` are samples), the registered address, the Grievance
Officer and the website address. The dashboard's Play Store page shows what is still missing.

Have the documents reviewed by your legal adviser — they follow the IT Act 2000, the DPDP Act 2023
and the Consumer Protection (E-Commerce) Rules 2020, but they set real business rules (7-day refund
window under 25% progress, 7 working days for web deletion requests, 24 h / 15 day grievance
timelines) that you must be happy to honour.

## 2. Account deletion (required)

Google requires both an in-app path and a web resource:

- **In the app:** Profile → Settings → **Delete account** → confirmation → the account is deleted
  immediately (`DELETE /api/users/me`) and the phone returns to sign-in.
- **On the web:** `/delete-account` — a request form (mobile number, optional name/reason). Requests
  arrive in the dashboard under **Deletion requests** (live badge + alert). Call or message the
  number to confirm, then press **Delete account** (or **Reject** / **Mark as done**). The page
  promises completion within 7 working days.

What is deleted and what is kept is identical on every path (`server/src/services/accountDeletion.js`):
profile, photo, enrollments + progress, reviews, personal notifications, push tokens, unpaid orders
and OTP codes are deleted; usage events are de-linked; paid/refunded orders stay as the tax record
("Deleted learner"). Closed requests keep a masked number for 180 days, then disappear.

## 3. App access (reviewer sign-in)

The app needs phone + OTP sign-in, and the demo OTP is disabled in production. Set on the API server:

```
PLAY_REVIEW_PHONE=9XXXXXXXXX   # a number that is nobody's real account
PLAY_REVIEW_OTP=123456         # any 6 digits
```

That number always accepts that code and no SMS is sent. In Play Console → App content → App access,
choose "All or some functionality is restricted" and give the number, the code and these steps:
open the app → enter the number → Continue → enter the code.

Paid lessons stay locked for this account (checkout needs a real payment of at least ₹1), so open a
free preview on at least one course (dashboard → Courses → edit → a lesson's preview length) for the
reviewers to watch.

## 4. Sign-in SMS (before real learners arrive)

The reviewer number works without SMS, but every real learner signs in with a code sent by SMS. Set
`SMS_PROVIDER` and its keys on the API server — MSG91, 2Factor or Fast2SMS (server README → Phone
sign-in). Indian SMS must use a DLT-approved template, for example:

> Your YDU Academy sign-in code is {#var#}. It is valid for 5 minutes. Do not share it with anyone.

2Factor also has a default OTP template, handy for a first test (ask 2Factor whether it suits a live
launch). The dashboard's Play Store checklist turns green once the server reports a working setup.

## 5. Data safety — suggested answers

Collected (none is "shared": Razorpay, the SMS gateway, Expo/Firebase push, Cloudinary and hosting are
service providers). All encrypted in transit (keep the production API on `https://`). Users can
request deletion.

| Category → type | Required? | Purposes |
| --- | --- | --- |
| Personal info → Phone number | Required | Account management, App functionality, Fraud prevention & security |
| Personal info → Name | Optional | Account management, App functionality |
| Personal info → Email address | Optional | Account management, App functionality |
| Personal info → User IDs | Required | Account management, Analytics |
| Location → Approximate location (typed city only) | Optional | Account management |
| Financial info → Purchase history | Optional | App functionality, Account management |
| Financial info → User payment info (Razorpay checkout) | Optional | App functionality |
| Photos and videos → Photos (profile photo) | Optional | Account management, App functionality |
| App activity → App interactions | Required | Analytics, App functionality |
| App activity → In-app search history | Required | Analytics |
| App activity → Other user-generated content (reviews) | Optional | App functionality |
| Device or other IDs (push token) | Optional | App functionality |

Not collected: precise location, contacts, messages, audio, files, calendar, health, web history,
crash logs/diagnostics.

Account creation: phone number + one-time code. Delete account URL: `/delete-account`. Partial
deletion without deleting the account: yes (`/delete-account#delete-some-data-and-keep-your-account`).

## 6. Other App content answers

- **Ads:** No.
- **Advertising ID:** No — the build blocks `com.google.android.gms.permission.AD_ID`.
- **Target audience:** 18 and over.
- **Content rating (IARC):** Education/Reference; no violence, sexuality, profanity, drugs or
  gambling; users can share content (public course reviews); digital purchases: yes.
- **News / government / financial features / health:** not applicable.
- **Photo and video permissions:** not needed — the profile photo uses Android's photo picker;
  camera and microphone permissions are blocked in `app/app.json`.
- **Category:** Education.

## 7. The Android build

- `app/app.json` no longer requests `RECORD_AUDIO` (it was unused) and blocks `CAMERA`, `RECORD_AUDIO`
  and `AD_ID`, so the manifest matches the privacy policy ("no camera, no microphone").
- Google Play needs an **Android App Bundle**. `eas.json` keeps the `production` profile (APK, for
  testers) and adds `playstore`:

  ```bash
  cd app
  bunx eas-cli build -p android --profile playstore
  ```

  The first build uploads as version code 1. Every later upload needs a higher one: add
  `"versionCode": 2` (then 3, …) under `expo.android` in `app.json` (`eas.json` reads versions
  locally), and raise `expo.version` when you want the store to show a new version name.

## 8. Store listing draft

The dashboard's Play Store page has a ready app name (≤30), short description (≤80) and full
description (≤4000) with character counts and copy buttons.
