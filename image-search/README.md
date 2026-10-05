# UI reference board

115 screenshots of course-selling, video-learning, cooking-course, checkout, paywall, header, tab-bar and
search UI, collected while redesigning YDU Academy. They are reference only — no asset here ships in the app.

What the board settled, and what the implementation does:

- premium learning apps separate surfaces with **white on cream plus 1px hairlines**, not shadows;
- artwork stays **flush inside the card's corners**, so the corner radius clips the image;
- the rhythm is **dense** — 8px between cards, 16px inside them;
- one sans family with **tightened large headings** and small, quiet metadata;
- curriculum rows are numbered, chips and filters stay on a single scrolling row, and the price/CTA pair
  lives in a sticky footer that is flush to the screen edges.

Second pass (headers, tab bar, search):

- tab bars animate an **indicator that slides** behind the active item — a pill or underline, with the
  icon switching from outline to filled — instead of recolouring in place;
- tab headers carry **identity or progress** (avatar, wordmark, streak, count), never a repeat of the
  label already printed in the tab bar;
- search fields are **pills on a tinted surface**, and focusing one reveals **recent searches plus
  popularity-ranked suggestions with category badges**; zero results still offer recovery chips.
