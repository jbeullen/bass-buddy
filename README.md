# bass-buddy

Learn bass on the go — a mobile-first web app for learning the bass guitar fretboard.

No build step, no dependencies, no framework. Three static files plus an icon.

## Modes

Switch modes with the tabs at the top.

| Mode | What it does |
| --- | --- |
| **Name Note** | A red dot appears somewhere on the neck — open string or fretted. Tap the matching note on the pad. |
| **Find Note** | A note name is shown. Tap any position on the neck that plays it. |
| **Explore** | Free practice — tap any position to reveal its note, or show the whole neck at once. |

### Sessions

Press **Start** to begin a session. It runs for 10 notes and the counter tracks
your score (`3/10`). A correct answer turns green and moves on; a wrong one shows
the right answer before continuing. After 10 notes the session ends and **Start**
begins a new one. Your best result per mode is kept in `localStorage`.

## The fretboard

- Standard 4-string tuning, low to high: **E A D G** (left to right).
- Open strings through the **12th fret**, with the usual inlay markers at 3, 5, 7,
  9 and 12. Open strings are fret `0`: their dot sits above the nut, so the neck
  reads the same way as a chord chart.
- The neck runs top-to-bottom so it fits a phone in portrait. On short screens it
  scrolls, and the current question is always scrolled into view.

## Publishing to GitHub Pages

The app is entirely static — no backend, no build step — so Pages can serve the
repository as-is.

1. Merge this branch into `main`.
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*.
4. Pick branch `main` and folder `/ (root)`, then **Save**.
5. Wait for the *pages build and deployment* run to finish under the **Actions**
   tab (about a minute the first time).

The site then lives at `https://<user>.github.io/bass-buddy/`. Every later push to
`main` redeploys it automatically.

Every asset path is relative, so the app works from that project subpath as well
as from a custom domain or the repository root. `.nojekyll` tells Pages to serve
the files verbatim instead of running them through Jekyll.

### Custom domain (optional)

Add the domain under **Settings → Pages → Custom domain**, point a `CNAME` DNS
record at `<user>.github.io`, and enable **Enforce HTTPS** once the certificate
is issued.

## Running it

Any static file server works:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly from disk works too, though `manifest.json` is only
picked up over HTTP. Deploying is a matter of serving the directory — GitHub Pages,
Netlify, or anything else that hosts static files.

On iOS/Android you can add it to the home screen and it runs full screen.

## Files

```
index.html     markup and layout
styles.css     all styling; dark, mobile-first, safe-area aware
app.js         fretboard rendering and game logic
manifest.json  web app manifest
icon.svg       app icon
icon-180.png   home-screen icon for iOS (which ignores SVG icons)
icon-512.png   install icon for Android / desktop
.nojekyll      serve the files as-is on GitHub Pages
```
