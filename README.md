# bass-buddy

Learn bass on the go — a mobile-first web app for learning the bass guitar fretboard.

No build step, no dependencies, no framework. Three static files plus an icon.

## Modes

Switch modes with the tabs at the top.

| Mode | What it does |
| --- | --- |
| **Name Note** | A red dot appears somewhere on the neck. Tap the matching note on the pad. |
| **Find Note** | A note name is shown. Tap any position on the neck that plays it. |
| **Explore** | Free practice — tap any position to reveal its note, or show the whole neck at once. |

### Sessions

Press **Start** to begin a session. It runs for 10 notes and the counter tracks
your score (`3/10`). A correct answer turns green and moves on; a wrong one shows
the right answer before continuing. After 10 notes the session ends and **Start**
begins a new one. Your best result per mode is kept in `localStorage`.

## The fretboard

- Standard 4-string tuning, low to high: **E A D G** (left to right).
- Nut through the **12th fret**, with the usual inlay markers at 3, 5, 7, 9 and 12.
- The neck runs top-to-bottom so it fits a phone in portrait. On short screens it
  scrolls, and the current question is always scrolled into view.

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
```
