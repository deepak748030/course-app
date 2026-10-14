# Video platform decision — YouTube vs apna cloud storage

> **Sawaal:** Aisa tool/GitHub project chahiye jo (1) videos YouTube channel par upload kare,
> (2) wahi videos app mein list + play kare, aur (3) player mein YouTube ka logo/naam bilkul na dikhe —
> taaki cloud storage ki problem bhi solve ho jaaye.
>
> **Short jawab:** Aisa **koi ek YouTube-based tool nahi hai** jo teeno shartein ek saath,
> reliably aur YouTube ki terms ke andar rehkar poori kare. Teeno shartein poori karne ka
> ek hi sahi tareeka hai — **video apne cloud storage se chalao (jo is repo mein pehle se bana
> hua hai: Backblaze B2 + `expo-video`), aur YouTube ko sirf ek alag public copy ke liye rakho
> (chaho to).** Is document mein har option ko check karke yehi verdict diya gaya hai.

---

## 1. Teeno shartein aur test

Har option ko in 5 sawalon par check kiya gaya:

| # | Test |
| --- | --- |
| A | Channel par upload ho sakta hai? |
| B | App mein apni branding ke saath list + play ho sakta hai? |
| C | Player mein YouTube logo/naam **bilkul nahi** dikhega? (guaranteed, hack nahi) |
| D | Cloud storage ki problem solve hoti hai? (video file kahin host hai) |
| E | Production mein reliable + terms/legal safe hai? |

## 2. Saare options ki checking

| Option | A Upload | B App list+play | C No YouTube logo | D Storage solve | E Reliable/safe | Verdict |
| --- | :---: | :---: | :---: | :---: | :---: | --- |
| **Invidious** (`iv-org/invidious`) | ❌ upload nahi | ⚠️ unofficial API se list/play possible | ⚠️ technically haan, par hack hai | ❌ YouTube hi host hai | ❌ public instances YouTube blocking se baar-baar toot-te hain; terms risk | **Production ke liye nahi** |
| **Piped** (sahi repo: `TeamPiped/Piped`; `danayer/PipedD` wala link galat/typo hai) | ❌ upload nahi | ⚠️ unofficial API se possible | ⚠️ technically haan, par hack hai | ❌ YouTube hi host hai | ❌ instance reliability/self-host maintenance; terms risk | **Production ke liye nahi** |
| **YouTube Data API v3 + IFrame Player** (official) | ✅ OAuth se upload | ✅ list + official player | ❌ **kabhi guaranteed nahi** | ✅ YouTube host karta hai | ✅ official | Sirf tab jab YouTube branding chalega |
| **React Native YouTube Iframe** (`lonelycpp/react-native-youtube-iframe`) | ❌ | ✅ (WebView mein wahi official IFrame player) | ❌ upar wali hi limitation | ✅ YouTube host | ✅ official player wrapper | Upar wali hi baat — logo rahega |
| **Video.js / Shaka Player** | ❌ (sirf player hai) | ✅ apni files ke liye | ✅ (file apni hai) | ❌ storage alag se chahiye | ✅ | Player hai, poora solution nahi — storage ke saath jodo |
| **Backblaze B2 + `expo-video` — ⭐ is repo mein pehle se implemented** | ⚠️ YouTube par nahi, admin dashboard se apne storage mein | ✅ apni list, apna player | ✅ **100% — YouTube involved hi nahi** | ✅ private bucket, free tier 10 GB | ✅ apna data, apna control | **⭐ Recommended — teeno asli shartein (B, C, D) yahi poori karta hai** |
| Cloudflare R2 + `expo-video` | ⚠️ same as B2 | ✅ | ✅ | ✅ 10 GB free, egress hamesha free | ✅ | B2 ka achha alternative (neeche cost dekho) |
| Bunny Stream / Mux (paid managed video) | ⚠️ API/dashboard upload | ✅ | ✅ | ✅ storage + transcoding + CDN sab included | ✅ | Jab scale/adaptive HLS chahiye tab; per-minute paisa lagta hai |

## 3. Kyun YouTube stream karke logo hatana officially possible nahi

Ye koi tool ki kami nahi, YouTube ki policy hai:

- YouTube API Developer Policies kehti hain ki jahan YouTube content dikhe, wahan YouTube ko
  source ke roop mein clear dikhana zaroori hai, aur embedded player ki attribution ko
  "interfere with or obscure" nahi kar sakte. Player ke links/branding ko remove, alter ya
  disable karna bhi prohibited hai.
  Source: https://developers.google.com/youtube/terms/developer-policies (Section III.F, III.I.4)
- Branding Guidelines: YouTube logo ko alter/obscure nahi kar sakte.
  Source: https://developers.google.com/youtube/terms/branding-guidelines
- `modestbranding=1` August 2023 mein **deprecated** ho gaya — ab uska koi effect nahi.
  Koi supported parameter completely unbranded player guarantee nahi karta.
  Source: https://developers.google.com/youtube/player_parameters#modestbranding

**Matlab:** jo bhi tareeka YouTube ki video stream karke logo chhupata hai (Invidious, Piped,
yt-dlp se stream URL nikaalna, CSS se player crop/cover karna) wo YouTube Terms ke khilaf
jaata hai — app kabhi bhi band sakta hai, aur Play Store/API access ka risk alag hai.
Isi liye wo raasta is paid course app ke liye recommend nahi hai.

## 4. Invidious / Piped production mein kyun fail honge

- Dono YouTube ke **unofficial** tareeke se video nikaalte hain. YouTube jaise hi apna
  system badalta/block karta hai, playback toot jaata hai. Public Invidious instances
  blocking ki wajah se bahut kam bache hain, aur Piped instances bhi intermittently
  unavailable rehte hain — khud host karo to server maintenance + blocking se ladna padega.
- Dono mein **upload feature hai hi nahi** — channel par video upload karne ke liye
  YouTube Studio / official API hi lagega.
- Ye personal privacy use ke liye bane hain, kisi paid course business ke playback
  backend banne ke liye nahi. Koi SLA nahi, koi guarantee nahi.

## 5. ⭐ Is repo mein sahi solution pehle se bana hai (verify kiya gaya)

Code check karke confirm kiya — is app mein YouTube ka **koi** player, API ya dependency
hai hi nahi. Flow ye hai:

```
Admin dashboard (Courses → lesson → quality choose karke Upload)
        │  file
        ▼
Server (Express) ──► Backblaze B2 PRIVATE bucket   server/src/services/videoStorage.js
        │                                               server/src/routes/admin.routes.js
        │  enrolled learner ko signed, short-lived URL (6h window)
        ▼                                               server/src/controllers/catalog.controller.js
App (expo-video, apna custom player — YDU branding,
play/pause/seek/quality/speed sab apna)                 app/src/app/lesson/[courseId]/[lessonId].tsx
```

- Qualities: 360p / 480p / 720p / 1080p (har quality alag file), max 4 GB per video.
- Bucket private hai — sirf course khareeda hua learner (ya free-preview lesson) hi
  signed URL paata hai. Video link public leak nahi hota.
- Player mein YouTube ka logo/naam aana **impossible** hai, kyunki video B2 se aata hai.
- Sirf ek cheez baaki hai: `server/.env` mein 4 B2 values daalna (account banana free hai).
  Poora step-by-step setup: [`server/README.md`](../server/README.md) →
  "Course videos on Backblaze B2".

### Cost (andaaz)

| | Backblaze B2 (current) | Cloudflare R2 (alternative) |
| --- | --- | --- |
| Free | 10 GB storage | 10 GB/month + egress free |
| Storage | ~$6.95 / TB / month | $15 / TB / month |
| Playback (egress) | Stored data ke 3× tak free, phir $0.01/GB (Cloudflare CDN se free) | Hamesha free |

Example: 100 videos × 500 MB ≈ 50 GB storage → B2 par lagbhag **$0.3/month** storage.
YouTube "free storage" lagta hai, par uski keemat branding + control khona hai —
paid course ke liye apna storage hi sahi hai, aur keemat bahut kam hai.

**Ek imaandaar limitation:** abhi playback MP4 progressive hai (koi adaptive HLS
transcoding nahi), aur har quality ki file alag upload karni padti hai. Jab students
bahut badh jaayein ya slow network par buffering ki shikayat aaye, tab Bunny Stream /
Mux (automatic transcoding + HLS) par shift karna agla step hoga — tab bhi logo
YouTube ka nahi aayega, kyunki video apna hi rahega.

## 6. Final recommended workflow — "Dual Publish"

Aapki teeno baatein is workflow se poori hoti hain:

1. **Ek master video file** rakho (jo record/edit ki hai).
2. **App ke liye:** Admin dashboard → Course → Lesson → wahi file B2 mein upload karo.
   App mein video apni branding, bina kisi logo ke chalega. ✅ (B, C, D)
3. **Channel ke liye (optional, public reach ke liye):** wahi file YouTube Studio se
   channel par upload karo. Wahan YouTube ka logo chalega — wo YouTube ki apni jagah hai.
   ✅ (A)
4. Dono jagah **ek hi file** jaati hai, isliye alag se kuch maintain nahi karna.

> Future automation (chaho to baad mein): server ek hi upload ko dono jagah bhej sakta
> hai — B2 mein `PutObject` + YouTube Data API `videos.insert` (Google OAuth lagega,
> aur naye unverified API project se upload kiye videos par audit tak private restriction
> lag sakti hai). Ye sirf convenience hai; bina iske bhi workflow poora chalta hai.
>
> Note: YouTube Data API se channel ki video **list** (title/thumbnail) fetch ho sakti
> hai, lekin video **file ya stream URL nahi** milta — isliye "YouTube par upload karo
> aur API se file app mein le aao" wala shortcut officially exist hi nahi karta.

## 7. Ab aapko kya karna hai (sirf 1 kaam)

1. [backblaze.com](https://www.backblaze.com) par free account banao → Private bucket
   banao → restricted App Key banao (steps: `server/README.md`).
2. 4 values `server/.env` mein daalo, server restart karo.
3. `GET /api/admin/uploads/video/status` par `"configured": true` dikha to samajh lo
   ho gaya — dashboard se pehli video upload karke app mein test karo.

**Kabhi bhi ye values chat/GitHub mein paste mat karna** — `.env` git-ignored hai.

---

*Check ki tarikh: 14 Oct 2026. Files verified: `server/src/services/videoStorage.js`,
`server/src/controllers/catalog.controller.js`, `server/src/routes/admin.routes.js`,
`admin-dashboard/src/pages/Courses.tsx`, `app/src/app/lesson/[courseId]/[lessonId].tsx`
(pure codebase mein `youtube`/`invidious`/`piped` ka koi reference nahi mila).*
