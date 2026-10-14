# YouTube-only research — saare options ki gehri jaanch

> **Scope (user ki shart):** Sirf YouTube based solution chahiye. B2/apna storage is report se
> bahar rakha hai. Requirement teeno ek saath: **(1)** videos YouTube channel par upload hon,
> **(2)** channel ki videos app mein apne design mein list + app ke andar play hon,
> **(3)** player mein YouTube ka logo/naam na dikhe.
>
> **Research date:** 14 Oct 2026 — GitHub API se live repo stats, official Google docs, aur
> public Invidious/Piped instances ko **asal mein API calls karke** test kiya gaya (Section 7).

---

## 1. Ek line ka nateeja

YouTube-only duniya mein teeno shartein do hisso mein batt jaati hain — koi ek tool teeno nahi deta:

| Rasta | Upload | App list + play | No YouTube logo | Bharosa |
| --- | --- | --- | --- | --- |
| **Official:** YouTube Data API v3 + IFrame player (`react-native-youtube-iframe`) | ✅ Studio/API | ✅ | ❌ player mein YouTube UI rahega | ✅✅ official, tootega nahi |
| **Unofficial:** Piped API (ya Invidious API) se stream nikaal ke apne player mein chalana | ✅ Studio se | ✅ | ✅ apna player (`expo-video`) | ⚠️ YouTube ke badlav se kabhi bhi toot sakta hai |

Aur in dono ke beech ka sahi sawal ye hai: **aapko "logo bilkul nahi" zyada zaroori hai
ya "playback kabhi na toote + terms safe"?**

### Iske alawa 3 kadwi sachaiyan (research se confirm)

1. **Upload koi tool nahi karta.** Invidious, Piped, Video.js, Shaka, `react-native-youtube-iframe` —
   inmein se koi bhi channel par video upload nahi karta. Upload sirf **YouTube Studio** se
   ya **YouTube Data API `videos.insert`** (OAuth) se hoga. Baaki tools sirf list/player hain.
2. **Paid course ki paywall YouTube par nahi banti.** App mein chalane ke liye video
   Public ya Unlisted rakhna padega. Unlisted ka matlab: jiske paas link hai wo dekh sakta hai —
   link ek student aage share kar de to bina course khareede sab dekh lenge. Private video
   embed/play hi nahi hoga. Ye is app ke liye (Razorpay paid courses) sabse bada practical issue hai.
3. **Extractor ki ladai chal rahi hai.** YouTube ab PO Token (Proof-of-Origin) aur SABR
   streaming la raha hai, isliye saare unofficial tools baar-baar update hote hain aur
   kabhi-kabhi toot jaate hain. Neeche live test mein iska saboot hai.

---

## 2. Option A — YouTube Data API v3 + official player (SAFE rasta)

### Channel ki videos automatically app mein kaise aayengi (ye hissa pakka kaam karta hai)

Har channel ki ek khaas "uploads playlist" hoti hai. Official tareeka:

```
1) GET /youtube/v3/channels?part=contentDetails&id=<CHANNEL_ID>&key=<API_KEY>
   → contentDetails.relatedPlaylists.uploads  (playlistId, aam taur par UU...)
2) GET /youtube/v3/playlistItems?part=snippet&playlistId=<UU...>&maxResults=50&pageToken=...
   → har video ka title, thumbnail, videoId, publishedAt   (har page = 1 quota unit)
3) GET /youtube/v3/videos?part=contentDetails,statistics&id=<50 ids tak ek saath>
   → duration, viewCount waghera                          (1 unit per batch)
```

- Default quota **10,000 units/day** per Google Cloud project. 500 videos wala channel bhi
  lagbhag 11–20 units mein sync ho jayega. `search.list` (100 units/call) channel listing ke
  liye **kabhi mat** use karna — uploads playlist usi kaam ka 100× sasta rasta hai.
- Auth: public channel data ke liye sirf **API key**. Key server (`server/.env`) mein rakho,
  app mein kabhi mat daalo. Server cache karke app ko apni API se data de — quota bhi bachega,
  key bhi safe rahegi.
- Data 30 din se zyada store karna ho to refresh karna padta hai (YouTube Developer Policies) —
  roz ka sync cron iske liye kaafi hai.

### Upload API se karna hai to

- `videos.insert` ke liye **OAuth 2.0** (`youtube.upload` scope) lagega, API key nahi chalegi,
  service account bhi nahi chalega — channel owner ko ek baar consent dena padega.
- **Sabse bada catch:** 28 July 2020 ke baad bane unverified API project se upload ki gayi
  har video **private lock** ho jati hai, jab tak project Google ka compliance **audit** pass
  na kar le. `privacyStatus: "public"` likhne se kuch nahi hota.
- Isi liye aasan rasta: upload YouTube Studio/app se haath se, aur API ko sirf listing ke liye.

### Player: `react-native-youtube-iframe` (is app ke liye fit check)

| Baat | Detail |
| --- | --- |
| Repo | `LonelyCpp/react-native-youtube-iframe` — 704★, MIT, npm v2.4.1 (1 Jul 2025), repo mein Sep 2026 tak activity |
| Kya hai | Official IFrame Player API ka wrapper, andar `react-native-webview` (is app mein **pehle se installed hai**, v13.16.1) |
| Expo | Official taur par supported hai; dev build lagega (is project mein waise bhi `expo-video` ke liye dev build chalta hai) |
| Control | play/pause/seek/quality events milte hain, progress track kar sakte ho |
| Kami | Player YouTube ka hi hai — neeche wala section dekho |

### Player mein kya-kya NAHI hata sakte (official docs se)

- `modestbranding=1` — **15 Aug 2023 se deprecated, zero effect.** Player ab branding khud
  decide karta hai. (developers.google.com/youtube/player_parameters)
- `showinfo=0` — 2018 se khatam. Title/channel info rahega.
- `rel=0` — related videos band nahi karta, sirf **usi channel** ke videos dikhata hai
  (aapke case mein ye actually theek hai — student aapke hi channel mein rahega).
- `controls=0` — controls chhupa sakte ho, par branding/title/"Watch on YouTube" fir bhi
  aa sakta hai; aur controls chhupane par apne custom controls IFrame ke upar rakhna
  Required Minimum Functionality ke "overlays must not obscure the player" rule se takrata hai.
- `youtube-nocookie.com` (privacy-enhanced) — sirf cookies/personalisation kam karta hai.
  Logo, suggestions, "Watch on YouTube" sab waisa ka waisa.
- RMF saaf kehta hai: player par overlay/frame laga ke koi hissa **obscure nahi** kar sakte,
  aur branding sirf documented tareeke se hi badal sakte ho.
  (developers.google.com/youtube/terms/required-minimum-functionality)

**Matlab:** official raste mein listing 100% apni branding ki hogi (apne thumbnail, title,
category, search — sab apna), lekin **jaise hi video chalega, andar YouTube ka player dikhega.**
Requirement (3) yahan poori nahi hoti. Requirement (1)+(2) sabse mazbooti se yahi poori hoti hain.

---

## 3. Option B — Piped (unofficial, no-logo wala sabse mazboot candidate)

### Pehle ek galatfehmi door kar dein

Aapne jo link diya tha — `github.com/danayer/PipedD` — wo **official project nahi hai**:
GitHub API se verify kiya, wo `TeamPiped/Piped` ka ek **fork** hai (0 stars, Dec 2025 mein
fork hua). Asli project: **`TeamPiped/Piped`** (10,283★). Hamesha wahi use karna.

### Piped asal mein hai kya

- Open-source alternative YouTube frontend (AGPL-3.0). Official YouTube API use **nahi**
  karta — andar **NewPipeExtractor** (Java library) YouTube se data/stream nikaalta hai.
- 3 hisse: Frontend (Vue), Backend (Java, `Piped-Backend`), Proxy (alag process jo
  `googlevideo.com` ki stream ko apne domain se proxy karta hai — isi liye player mein
  YouTube domain/logo dikhai nahi deta).
- Khaas baat: iska **public JSON API** hai, bina kisi key ke. Yahi API aapke kaam ki hai.

### Aapke kaam ke API endpoints (docs.piped.video)

| Kaam | Endpoint |
| --- | --- |
| Channel ki saari videos (list) | `GET /channel/:channelId` → `relatedStreams[]` + `nextpage` token |
| Aur videos (pagination) | `GET /nextpage/channel/:channelId` |
| Search | `GET /search?q=...&filter=videos` |
| Video ki stream (play karne ke liye) | `GET /streams/:videoId` → `videoStreams[]`, `audioStreams[]`, `dash`, `hls` |
| Playlist | `GET /playlists/:playlistId` |
| Trending (test ke liye achha) | `GET /trending?region=IN` |

List mein har video ka `url` (`/watch?v=...`), title, thumbnail (proxy URL), duration,
views, upload date milta hai — app ki course/lesson list banane ke liye kaafi hai.

### Aapke app mein ye kaise baithega

```
YouTube Studio se upload (channel)
        │
Server (aapka Express) ──► Piped API /channel/:id ──► video list cache (apni DB)
        │                    (multi-instance fallback ke saath)
Student lesson kholta hai
        ▼
Server ──► Piped API /streams/:videoId ──► best stream URL chunta hai
        ▼
App ka MAUJODA player (expo-video, VideoView) wahi URL chala deta hai
Player mein sirf AAPKE controls — YouTube ka logo/naam kahin nahi ✅
```

Aapke app mein `expo-video` player pehle se hai aur B2 ke signed URL chala raha hai —
uske liye Piped ka stream URL bhi bas ek URL hai. Player side par lagbhag **zero badlav**,
saara kaam server par ek `youtube` (piped) service ka hai. Yahi is raste ki sabse badi taqat hai.

### Quality ki asaliyat (jo zyadaatar blog nahi batate)

- 360p tak ka format aam taur par **combined** (audio+video ek file, itag 18) milta hai —
  ye har player mein seedha chalta hai.
- Usse upar ki quality (720p/1080p) aksar **video-only** hoti hai, audio alag stream mein.
  Dono ko jodne ke liye DASH chahiye. Piped `dash` manifest tab deta hai jab available ho.
- **iOS par musibat:** AVPlayer (`expo-video` ka iOS engine) DASH nahi chala sakta, sirf HLS.
  Matlab iPhone par ya to 360p combined, ya pehle se HLS wala format. Course videos ke liye
  phone par 360p–480p aam taur par chal jata hai, par "HD quality" ka vaada is raste par
  Android-jaisa pakka nahi hai.
- Stream URL **IP-bound aur time-bound** hota hai (proxy/googlevideo ka signed URL,
  kuch ghanto mein expire). Isliye URL ko DB mein store **nahi** karna — play dabane par
  fresh maangna hai (aapka maujooda lesson-video endpoint bilkul yahi pattern hai).

### Public instance bharosemand hai ya self-host?

- **Public instances:** 15 ke aas-paas listed hain (official docs). Par hamare live test
  (Section 7) mein official `pipedapi.kavin.rocks` jawab hi nahi de paya, ek 502 de raha tha,
  ek khaali — sirf `pipedapi.ducks.party` saaf chala. Public instance kisi aur ka server hai:
  kal band ho sakta hai, rate-limit kar sakta hai, aapke students ka data usse guzrega.
  **Paid app ko public instance par mat chalao** — fallback ke liye theek hai.
- **Self-host (sahi tareeka):** Docker Compose se Frontend+Backend+Proxy+Postgres,
  3 hostnames (site, api, proxy), apna reverse proxy + TLS. Piped ke docs khud kehte hain:
  "Because YouTube tends to ban IP addresses" — iske liye IPv6 rotator ya VPN/proxy
  rakhne ki salah di jati hai. Matlab ek chhota VPS (₹400–800/mahina class) + kabhi-kabhi
  dekhbhaal.
- Self-host karne se aapke control mein rehta hai, par **band hone ka khatra khatam nahi
  hota** — YouTube aapke server ki IP ko bhi block kar sakta hai, fir rotator/VPN ka
  intezaam karna padega.

---

## 4. Option C — Invidious (Piped ka purana bhai)

### Haal

- `iv-org/invidious` — 25,444★, AGPL-3.0, Crystal language. Project **zinda hai**
  (13 Oct 2026 ko bhi commit), lekin uski duniya chhoti ho gayi hai.
- Official docs seedha kehte hain: *"The list of public instances is short due to the
  recent YouTube issues. If you can, please host Invidious at home instead."*
  Aaj ke din sirf **3 HTTPS public instances** official list mein hain.
- Ab Invidious akela nahi chalta — saath mein **`invidious-companion`** (212★) chahiye,
  jo YouTube.js (InnerTube) se video stream aur **PO Token** generate karta hai.
  Purana `youtube-trusted-session-generator` deprecated ho chuka hai.

### API (Piped jaisi hi kshamata)

`GET /api/v1/channels/:id/videos` (channel list), `GET /api/v1/videos/:id` (metadata +
`formatStreams` combined + `adaptiveFormats` + `dashUrl`), search, playlists — sab hai.
Kaagaz par Piped ke barabar.

### Live test iski kamzori dikha gaya (Section 7 detail)

- Instances monitor mein 5 mein se sirf **ek** instance (`invidious.f5.si`) par API on tha.
- Uspar `/channels/.../videos` (list) to chal gaya, lekin `/videos/:id` (jo asal mein
  stream deta hai) ne jawab diya: **"Youtube API returned status code 403"**.
- Yani jis din test kiya, duniya ke sabse bade chal rahe Invidious API instance se
  video ki stream jaankaari hi nahi nikal payi. Kabhi chalta hai, kabhi nahi — yahi pattern hai.
- Self-host karne par bhi yahi ladai aapke server par aa jayegi: companion ke PO Token
  kabhi kabhi atak jaate hain (GitHub par "Companion is starting... valid potoken" wale
  khule issues iske saboot hain).

**Verdict:** Naye project ke liye Invidious, Piped se peeche hai — instances kam,
ek extra companion service, aur Crystal stack (aapki Node team ke liye ajnabi).

---

## 5. Option D — Video.js / Shaka Player (YouTube ke liye galat auzaar)

- **Video.js** (39,965★) apni host ki hui files (MP4/HLS/DASH) ke liye badhiya player hai.
  YouTube ke liye iska `videojs-youtube` plugin asal mein **andar YouTube IFrame player hi**
  chalata hai — branding waisa hi rahega, upar se plugin purana aur kam maintained hai.
  React Native app ke liye ye web player waise bhi kaam ka nahi.
- **Shaka Player** (8,248★, Google ka DASH/HLS player) YouTube URL **khel hi nahi sakta** —
  YouTube use koi manifest (`.mpd`/`.m3u8`) deta hi nahi. Shaka tabhi chalega jab
  Piped/Invidious se DASH manifest mile — yani ye player nahi, upar wale raste ka ek
  optional hissa hai, wo bhi sirf web par. Aapke app mein `expo-video` pehle se ye kaam
  native tareeke se karta hai.

**Verdict:** Dono ko YouTube wali list se hata do. Ye "apni file, apna player" wale
auzaar hain, YouTube ke auzaar nahi.

---

## 6. Option E — Extractor library khud apne server mein (sabse zyada mehnat)

Piped/Invidious ke andar jo chalta hai, wo khud bhi laga sakte ho:

| Library | Repo | Stack fit | Haal |
| --- | --- | --- | --- |
| **YouTube.js** (`youtubei.js`) | `LuanRT/YouTube.js` 5,376★, npm v18.x | ✅ Node — aapke Express server mein baith sakta hai | InnerTube (YouTube ka private API) ka client. Stream decipher karta hai, par PO Token ke liye alag intezaam (BgUtils/companion jaisa) chahiye |
| **yt-dlp** | 197,628★ (sabse bada) | ❌ Python process ko server se bulana padega | Download king hai, par 2025–26 mein iski apni ladai: web client par SABR-only formats, "PO Token required" warnings, kabhi sirf 360p milta hai. Roz ke nightly fix aate hain — matlab tootna iski fitrat hai |
| **NewPipeExtractor** | 2,004★, GPL-3.0 | ❌ Java — Node/Expo stack mein nahi baithega | Yehi Piped ke andar hai. GPL license bhi dhyaan dena (app band-source rakhna hai to) |

**Verdict:** Ye rasta matlab "khud ka chhota Piped banana". Piped pehle se ye karke,
multi-instance fallback ke saath, muft de raha hai — wahi mehnat dobara karne ka fayda nahi.
Sirf tab socho jab Piped kal ko band ho jaye aur majboori ho.

---

## 7. Live test ke saboot (14 Oct 2026, is machine se)

Blog ki baaton par nahi, asal API calls par:

| Test | Nateeja |
| --- | --- |
| Invidious official instances list (docs.invidious.io) | Sirf **3** HTTPS instances; docs ki salah: ghar par host karo |
| `api.invidious.io` monitor | 5 HTTPS instances; sirf **1** par API `true` (`invidious.f5.si`, uptime ~81%) |
| `invidious.f5.si/api/v1/channels/<Rick Astley>/videos` | ✅ Chal gaya — video list mili |
| `invidious.f5.si/api/v1/videos/dQw4w9WgXcQ` | ❌ **"Youtube API returned status code 403"** — stream jaankaari fail |
| `pipedapi.kavin.rocks` (Piped official API) | ❌ Jawaab nahi aaya |
| `pipedapi.leptons.xyz/trending` | ❌ **502 Bad Gateway** |
| `pipedapi-libre.kavin.rocks` | ❌ HTTP 500 |
| `pipedapi.ducks.party/trending?region=IN` | ✅ Chal gaya — Indian trending list mili |
| `pipedapi.ducks.party/channel/<Rick Astley>` | ✅ Channel + videos ki poori list mili |
| `pipedapi.ducks.party/streams/dQw4w9WgXcQ` | ✅ Stream mili — par sirf **360p combined (itag 18)** + LBRY copy; HD ke liye DASH/alag audio ka jhanjhat upar bataya hai |

Ek din ka snapshot hai, par pattern saaf hai: **Piped zinda hai par instance chunna padta hai;
Invidious public API lagbhag khatam ho chuka hai.**

## 8. GitHub health snapshot (14 Oct 2026, GitHub API)

| Project | ★ | Aakhiri push | License | Note |
| --- | --- | --- | --- | --- |
| iv-org/invidious | 25,444 | 13 Oct 2026 | AGPL-3.0 | Active, par instances doobe hue |
| iv-org/invidious-companion | 212 | 19 Sep 2026 | AGPL-3.0 | Invidious ke liye ab zaroori |
| TeamPiped/Piped (+Backend/Proxy) | 10,283 | 10–13 Oct 2026 | AGPL-3.0 | Teeno hisse active |
| LonelyCpp/react-native-youtube-iframe | 704 | Sep 2026 (release Jul 2025) | MIT | Expo support |
| LuanRT/YouTube.js | 5,376 | 12 Oct 2026 | MIT | Extractor ki ladai mein aage |
| TeamNewPipe/NewPipeExtractor | 2,004 | 13 Oct 2026 | GPL-3.0 | Piped ka dil |
| yt-dlp/yt-dlp | 197,628 | 10 Oct 2026 | Unlicense | Sabse bada, par roz toot-ta/sudhar-ta hai |
| videojs/video.js | 39,965 | 14 Oct 2026 | — | YouTube ke liye bekaar (Section 5) |
| shaka-project/shaka-player | 8,248 | 14 Oct 2026 | Apache-2.0 | YouTube URL nahi chala sakta |

---

## 9. Final sifarish — YouTube-only ke andar

### Agar "logo bilkul nahi" hi sabse upar hai → **Piped (self-host) + aapka maujooda player**

1. Upload YouTube Studio se (jaisa kar rahe ho).
2. Ek chhota VPS par Piped self-host karo (docs ka Docker Compose + IPv6 rotator ready rakho).
   Public instances (jaise ducks.party) sirf **fallback** ki list mein.
3. Aapke server mein ek `youtube` service: Piped `/channel/:id` se list cache kare,
   `/streams/:videoId` se play ke time fresh stream URL laaye, 2–3 instances par fallback.
4. App mein **koi naya player nahi** — maujooda `expo-video` player wahi URL chalega,
   sirf YDU ke controls dikhenge. YouTube ka naam/logo player mein aana mumkin hi nahi.
5. **Hybrid majboori:** list (title/thumbnail) ke liye chaaho to official Data API (Section 2)
   ko bhi saath rakh sakte ho — list kabhi nahi tootegi, sirf playback unofficial rahega.

### Agar "kabhi na toote + legal safe" sabse upar hai → **Official API + `react-native-youtube-iframe`**

Listing bilkul apni branding ki, upload Studio/API se, player ke andar YouTube UI
maan kar chalna padega. Ye Google Play/App Store aur YouTube terms dono mein sabse safe hai.

### Dono mein jo kabhi nahi milega

- YouTube host karke **paywall** (Section 1, baat 2) — paid course ka content link-share
  se khul sakta hai. Isko business decision ki tarah lo: free/lead-gen content YouTube par
  badhiya hai; band paywall wala premium content ke liye YouTube bana hi nahi hai.
- "Official tareeke se bina logo" — aisa parameter/mode exist hi nahi karta (Section 2).

---

## 11. Special case: UNLISTED video bina logo ke play karna

**Ek-naam jawab: Piped** (`TeamPiped/Piped` API + app ka maujooda `expo-video` player).
Lekin unlisted ke 3 niyam samajhna zaroori hai:

1. **Unlisted video channel-list/search mein kabhi nahi aayega** — na YouTube par, na Piped/
   Invidious ki channel list mein. Isliye "channel sync" wala rasta unlisted par kaam nahi
   karega. Video ka **ID haath se** dena padega (Admin dashboard mein lesson ke saath
   YouTube Video ID chipka do). Ek chaal hai: unlisted videos ko ek **Public playlist**
   mein daal do to wo playlist ke zariye list ho sakte hain.
2. **ID milne ke baad** Piped ka kaam wahi hai: `GET /streams/:videoId` stream deta hai,
   app ka player bina kisi YouTube logo/icon ke chalata hai. Invidious par bhi log
   `youtube.com/watch?v=ID` ko instance ke `watch?v=ID` mein badal kar unlisted chala
   paaye hain (Techlore forum) — par Section 7 ke live test mein uska API abhi 403 de raha hai.
3. **Private video koi nahi chala sakta** (owner login bina). Unlisted ≠ Private.
   Video par Studio mein **embedding allowed** bhi hona chahiye.

### Live test — unlisted par (14 Oct 2026)

Ek asal unlisted video (ID `A5X7I-45WvA`, oEmbed se confirm ki video maujood + embeddable hai)
ko test kiya:

| Test | Nateeja |
| --- | --- |
| Piped `ducks.party/streams/<unlisted-id>` | ❌ `LOGIN_REQUIRED: "Sign in to confirm that you're not a bot"` |
| Piped `private.coffee/streams/<unlisted-id>` | ❌ Wahi bot-check error |
| Wahi instance, public video (`dQw4w9WgXcQ`) | ✅ Poori stream mili (360p combined) |
| Invidious `f5.si/api/v1/videos/<koi-bhi-id>` | ❌ 403 (public par bhi — instance hi playback mein toota hai) |

**Iska matlab:** extractor kabhi kabhi unlisted/anonymous playback par YouTube ke bot-check
se takra jaata hai — instance aur video ke hisaab se hit-miss hai. Isliye **pakka jawab
aapke apne unlisted video ID par test karke hi milega** — ek test link mile to saare bade
instances par chala kar dikha denge ki kaun-sa asal mein play karta hai.

## 13. Kya Piped se Admin Dashboard se video UPLOAD bhi ho sakta hai?

**Nahi. Piped mein upload ka koi option hai hi nahi.** Pakka saboot (14 Oct 2026 ko check):

- Piped ki OpenAPI spec (`TeamPiped/OpenAPI/swagger.yaml`) mein saare routes sirf padhne
  wale hain: `/trending`, `/streams/{id}`, `/channel/{id}`, `/search`, `/playlists/...` —
  koi `/upload` route nahi hai.
- `Piped-Backend` ke handlers bhi sirf Channel, Search, Stream, Playlist, Feed, User
  (login/preferences) ke hain — koi Upload handler nahi hai.
- Piped ke login/account ka kaam sirf subscriptions, apni playlists aur preferences
  sync karna hai. Wo aapke YouTube channel mein login karke video **daal hi nahi sakta** —
  uske paas aapke channel ki koi permission hoti hi nahi.

### To "Admin Dashboard se upload" asal mein kaise banega — 2 hisse jodne padenge

```
UPLOAD hissa (Piped ka kaam NAHI)              PLAYBACK hissa (Piped ka kaam)
───────────────────────────────                ─────────────────────────────
Admin Dashboard → apna server → YouTube        App → apna server → Piped
Data API videos.insert (OAuth)                 /streams/:videoId → expo-video
→ videoId milta hai → lesson mein save         → bina logo play ✅
```

1. **Dashboard wala asli one-click upload** tabhi chalega jab Google Cloud project ka
   **audit pass** ho jaye — tab tak API se upload ki har video **private lock** rahegi,
   aur private video ko Piped bhi nahi chala payega (Section 2). Audit Google ki marzi
   aur samay par hai.
2. **Audit se pehle ka kaam-chalau flow (dashboard se hi manage hoga):**
   Admin Dashboard ke lesson mein ek button **"YouTube Studio mein upload karo"**
   (seedha Studio khulega, wahan Unlisted chuno) + uske neeche **Video ID/Link paste**
   karne ka khana. ID save hote hi video app mein Piped se bina logo chalega.
   File Studio se jayegi, par poora control dashboard se hi rahega.
3. Audit pass hote hi usi button ko asli file-upload mein badal denge — server file ko
   YouTube par daal kar videoId khud lesson mein bhar dega. Playback wala hissa
   (Piped) usi din se bilkul waisa hi rahega, kuch nahi badlega.

## 15. Upload ke liye dusra tool — fully automatic kaun kar sakta hai (15 Oct 2026 ko jaanch)

Plan: **Play = Piped, Upload = alag tool, dono judkar automatic.** Upload tools teen
kism ke hote hain — farak samajhna sabse zaroori hai, kyunki **audit wala locha sab par
alag asar karta hai:**

### Kism 1 — Official API wale repos (sabki ek hi qismat: audit)

| Repo | ★ / haal | Kaise kaam karta hai |
| --- | --- | --- |
| ⭐ `googleapis/google-api-nodejs-client` (Google official) | 12,268★, active Oct 2026, Apache-2.0 | Node library; `videos.insert` se resumable upload, `privacyStatus: "unlisted"` set hota hai. Aapke Express server mein seedha baithta hai — **kisi alag repo ki asal mein zaroorat hi nahi** |
| `porjo/youtubeuploader` | 887★, Go, Aug 2026 active | Tayyar Go binary/CLI, privacy + playlist + thumbnail. Sidecar ki tarah chalega |
| `tokland/youtube-upload` | 2,191★, Python, 2024 se sust | `--privacy (public\|unlisted\|private)` CLI. Purana hai |
| `gsanders300/Youtube-Bulk-Uploader` | 1★, naya | Khaas "hamesha unlisted" ke liye bana hai, khud bhi audit warning deta hai |

⚠️ **Sab par ek hi bandish:** ye sab aapke apne Google Cloud project ki OAuth se
chalenge. Jab tak wo project **audit pass nahi karta, `unlisted` maangne par bhi video
Private LOCK hogi** — aur Google ke official Help page ke anusaar us lock ka **appeal bhi
nahi hota**, video dobara sahi tareeke se upload karni padti hai
(support.google.com/youtube/answer/7300965). Audit pass hote hi yehi rasta **sabse
badhiya, muft aur hamesha ka** hai — 100 uploads/day tak.

### Kism 2 — Paid "audited" services (aaj hi fully automatic, paisa lagega)

| Service | Rate | Kyun kaam karega |
| --- | --- | --- |
| ⭐ **Upload-Post** | Free: 10 upload/mahina; paid $24/mahina se unlimited | Unka apna (audited) setup hai — aap bas channel connect karke ek REST call se `privacyStatus=unlisted` upload kar dete ho, apna Google Cloud project banane ki zaroorat nahi. API key server mein rakho, baat khatam |
| Postiz (cloud) | $29/mahina se; self-host `gitroomhq/postiz-app` 37,162★ | Cloud version par unke credentials, **self-host karne par aapke apne YOUTUBE_CLIENT_ID/SECRET lagenge — audit wala locha wapas** |
| Ayrshare | $149/mahina | Wahi kaam, bahut mehanga |

### Kism 3 — Browser automation bots (muft, automatic — par khatarnak, sifarish NAHI)

`fawazahmed0/youtube-uploader` (npm `youtube-videos-uploader`, 457★) Puppeteer se
**YouTube Studio ko browser mein khol kar** upload karta hai, `publishType: 'PUBLIC'`
aur update par `unlisted` dono support hai. Audit is par lagu nahi hota kyunki upload
"haath wala" dikhta hai. **Lekin:** isko aapke Google account ka **email-password**
chahiye, Google ki bot-detection login rok sakti hai/account par khatra hai, Studio ka
page badalte hi toot jaata hai, aur server par login session sambhalna padega.
Business ke asal channel par ye chalana samajhdari nahi hai.

### Fully-automatic wala final bandobast (aapke app ke liye)

```
Admin Dashboard (lesson → file chuno, title = lesson ka naam, privacy = Unlisted FIXED)
   → apna server  POST /api/admin/youtube/upload
   → Upload tool (neeche se ek)  →  videoId milta hai
   → lesson mein youtubeVideoId save
   → Student play dabaye → server Piped /streams/:videoId → expo-video (bina logo) ✅
```

**Tarteeb (kya pehle, kya baad mein):**
1. **Aaj test karne ke liye:** Upload-Post ka **free plan** (10 upload/mahina) — channel
   connect karo, ek Unlisted video dashboard se bhej kar dekho, phir wahi video Piped se
   app mein chala kar poora circle ek din mein verify ho jayega.
2. **Saath-saath:** apne Google Cloud project ka **audit form** bhar do. Pass hote hi
   upload ko Upload-Post se hata kar apne server ke `googleapis` (Kism 1) par le aana —
   phir mahine ka kharcha zero, aur koi bahari company beech mein nahi.
3. Playback (Piped + `expo-video`) dono phase mein ek jaisa rahega, kabhi nahi badlega.

## 17. Setup guide — dono cheezein install/connect kaise hongi, channel login mein kya lagega, free hai ya nahi

### A) Upload-Post (upload wala) — kuch INSTALL nahi hota, sirf account connect hota hai

1. `upload-post.com` par account banao (email/Google signup).
2. **User Management → ek profile banao** (naam kuch bhi, jaise `ydu`). API calls mein
   yehi naam `user` bankar jayega.
3. Profile mein **YouTube icon par click** → Google ka login popup khulega →
   **usi Gmail se login jo channel ki malik hai** → agar Gmail ke andar kai channel/
   Brand Account hain to **sahi channel chuno** → permission **Allow** karo.
   Yahi ekmatra "channel login" hai: ye **OAuth** hai. Password na humein milta hai,
   na app ko, na server ko. Permission kabhi bhi
   `myaccount.google.com/permissions` se wapas li ja sakti hai.
4. **API Keys → Generate New API Key** → key sirf `server/.env` mein jayegi
   (`UPLOAD_POST_API_KEY=...`), chat/GitHub mein kabhi nahi.
5. Hamare server mein ek package lagega: `npm install upload-post` (v2.15.0) —
   ya bina package ke seedha REST API. Bas.

**Upload asal mein hota kaise hai:** Dashboard se file → apna server (API key ke saath)
→ Upload-Post → (unke audited setup + aapke OAuth token se) YouTube ka `videos.insert`
→ video **aapke channel mein Unlisted** bankar aa jata hai, videoId wapas milta hai
→ server use lesson mein save kar deta hai. Channel par video bilkul aise dikhega
jaise Studio se daala ho.

### B) Piped (playback wala) — channel login ZERO

- Playback ke liye **koi login nahi chahiye**: na Google account, na password, na API key.
  Sirf videoId chahiye, stream anonymous aati hai.
- **Shuru mein install bhi ZERO:** public instances ki API use hogi (list ke saath fallback).
- **Baad mein bharosa chahiye to self-host:** ek chhota Linux VPS + 3 subdomain
  (site/api/proxy) chahiye. Steps: `git clone TeamPiped/Piped-Docker` →
  `./configure-instance.sh` (hostname bharo) → `docker compose up -d`. Software muft hai,
  paisa sirf VPS ka lagega.

### C) Is poore plan mein aapke mobile app / admin dashboard mein kya install hoga?

| Jagah | Install |
| --- | --- |
| Mobile app | **Kuch nahi** — `expo-video` pehle se hai |
| Admin dashboard | **Kuch nahi** — sirf ek naya upload button/mode judega |
| Server | Ek npm package `upload-post` + `.env` mein 2 values (API key, profile naam) |
| Piped | Shuru mein kuch nahi; self-host baad mein, chaaho to |

### D) Dono free hain kya?

| Cheez | Free? |
| --- | --- |
| Piped (software) | ✅ 100% free, open-source (AGPL). Public instance bhi free — par kabhi down ho sakta hai. Self-host par sirf VPS ka kharcha |
| Upload-Post | ⚠️ **Poora free nahi.** Free plan: **har mahina 10 upload, hamesha ke liye, bina card**. Usse zyada ho to paid **$24/mahina** (saal wala lo to ~$16/mahina) |
| Fully-free wala rasta | `googleapis` se apna upload — paisa zero, lekin pehle Google ka **audit** pass karna padega (samay/approval ki guarantee nahi). Isiliye pehle Upload-Post ke free 10 se test, phir faisla |

## 19. Implementation status (repo mein ban gaya hai)

Upar wala plan code mein utar diya gaya hai:

- **Admin Dashboard → Courses → lesson:** har lesson par **Cloud / YouTube** select hai.
  Cloud = purana B2 upload (jaisa tha). YouTube par do raaste: **unlisted link/ID paste**,
  ya **Upload to YouTube** button jo server → Upload-Post se seedha channel par
  **Unlisted** upload karta hai aur videoId khud lesson mein lag jata hai (lamba upload
  background mein ho to dashboard polling karke ID la deta hai).
- **Server:** naya `server/src/services/youtube.js` (Upload-Post upload + Piped playback),
  lesson mein `videoSource` / `youtubeVideoId` field. Playback endpoint ab source ke
  hisaab se ya to B2 signed URL deta hai ya Piped stream. **YouTube ID public catalog
  mein kabhi nahi jata** — app ko sirf `hasVideo`/`videoSource` milta hai.
- **App:** wahi maujooda `expo-video` player dono source chalata hai (YouTube wala
  Piped stream ke saath, bina YouTube logo ke). Quality list source ke hisaab se aati hai.
- Chalane ke liye sirf `server/.env` mein `UPLOAD_POST_API_KEY` + `UPLOAD_POST_PROFILE`
  chahiye (link-paste aur playback bina inke bhi chalega). Details `server/README.md` mein.

## 18. Sources

- YouTube IFrame Player Parameters (modestbranding deprecation, 15 Aug 2023):
  https://developers.google.com/youtube/player_parameters
- Required Minimum Functionality (overlay/branding rules):
  https://developers.google.com/youtube/terms/required-minimum-functionality
- YouTube API Developer Policies (attribution, download/storage prohibitions):
  https://developers.google.com/youtube/terms/developer-policies
- Data API: playlistItems.list / channels.list (uploads playlist, 1 unit):
  https://developers.google.com/youtube/v3/docs/playlistItems/list
- Piped: https://github.com/TeamPiped/Piped · API docs https://docs.piped.video/docs/api-documentation/ ·
  instances https://github.com/TeamPiped/documentation/blob/main/content/docs/public-instances/index.md ·
  self-hosting https://docs.piped.video/docs/self-hosting/
- Invidious: https://github.com/iv-org/invidious · API https://docs.invidious.io/api/ ·
  instances https://docs.invidious.io/instances/ · companion https://github.com/iv-org/invidious-companion
- react-native-youtube-iframe: https://github.com/LonelyCpp/react-native-youtube-iframe
- YouTube.js: https://github.com/LuanRT/YouTube.js · yt-dlp PO Token guide:
  https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide
