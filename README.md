# bass-buddy

Learn bass on the go — a mobile-first web app for learning the bass guitar fretboard.

No build step, no dependencies, no framework. Three static files plus an icon.

## Modes

Switch modes with the tabs at the top.

| Mode | What it does |
| --- | --- |
| **Name Note** | A red dot appears somewhere on the neck — open string or fretted. Tap the matching note on the pad. |
| **Find Note** | A note name is shown. Tap any position on the neck that plays it. |
| **Explore** | Free practice — tap any position to hear it and reveal its note, or show the whole neck at once. With a scale selected it draws the scale, roots in red. |

### Sessions

Press **Start** to begin a session. It runs for 10 notes and the counter tracks
your score (`3/10`). A correct answer turns green and moves on; a wrong one shows
the right answer before continuing. After 10 notes the session ends and **Start**
begins a new one. Your best result per mode is kept in `localStorage`.

## Sound

Notes are synthesised in the browser with the Web Audio API — no audio files, so
there is nothing extra to download.

- **Name Note** and **Find Note** play the note as the question appears. In Find
  Note, where the question is a pitch rather than a position, it sounds at the
  lowest position still in play. Tap the prompt to hear it again.
- **Explore** plays whatever position you touch, and Find Note plays the position
  you tap as well, so a wrong guess is audible as well as visible.
- The speaker button in the top bar mutes and unmutes; the choice is remembered.

Pitches are the real thing: standard tuning, open E at 41.2 Hz. A phone speaker
cannot reproduce a fundamental that low, so the synth models a plucked string's
full harmonic series — the upper partials are what carry the note through a small
speaker, exactly as a real bass does.

Mobile browsers only allow audio to start from a user gesture, which is why the
first note you hear follows a tap on **Start** or on the neck.

## Practice settings

The sliders button in the top right opens the settings sheet. Everything there
filters the pool of positions the app draws from, so the three modes all follow
it. Positions the filters exclude are greyed out on the neck and cannot be
tapped. Settings are remembered in `localStorage`.

| Setting | What it does |
| --- | --- |
| **Zone** | Three toggles — `Open–4`, `5–9`, `9–12`. The active frets are the union of whatever is switched on, so they combine freely. |
| **Only on the dots** | Restricts practice to the inlay frets: 3, 5, 7, 9 and 12. |
| **Scale** | Restricts practice to the notes of a scale. Pick the scale and its root; `All notes` turns the filter off. |
| **Drone** | Rings the root continuously in Explore mode, to improvise or run the scale against. |

Scales available: major, natural minor, major and minor pentatonic, blues,
dorian and mixolydian.

In **Explore** mode, choosing a scale lays it out on the neck and marks every
**root in red**. The rest of the scale comes up on tap, or all at once with
*Show all notes*.

Changing a filter ends any session in progress, since it changes what can be
asked. The drone is not a filter, so toggling it leaves a session alone. If a
combination leaves nothing in play, **Start** is disabled and the sheet says so.

### The drone

The drone only sounds in **Explore** with a scale selected — it is a practice
backing, not a game sound. It rings the root an octave or two above the bass
roots (C3–B3), well below the level of the notes you play, so the neck stays
audible over it. It follows the root you pick, stops when you leave Explore,
clear the scale, or mute, and never keeps ringing while the page is in the
background.

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
