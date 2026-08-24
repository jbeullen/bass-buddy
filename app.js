/* Bass Buddy — fretboard trainer
   No dependencies. Everything is rendered from the data below. */

(function () {
  'use strict';

  // ---------------------------------------------------------------- data

  // Chromatic scale starting at C. `alt` is the enharmonic flat spelling.
  var NOTES = [
    { name: 'C',  alt: null },
    { name: 'C♯', alt: 'D♭' },
    { name: 'D',  alt: null },
    { name: 'D♯', alt: 'E♭' },
    { name: 'E',  alt: null },
    { name: 'F',  alt: null },
    { name: 'F♯', alt: 'G♭' },
    { name: 'G',  alt: null },
    { name: 'G♯', alt: 'A♭' },
    { name: 'A',  alt: null },
    { name: 'A♯', alt: 'B♭' },
    { name: 'B',  alt: null }
  ];

  // Standard 4-string tuning, low to high. `open` is the pitch class at fret 0.
  var STRINGS = [
    { name: 'E', open: 4 },
    { name: 'A', open: 9 },
    { name: 'D', open: 2 },
    { name: 'G', open: 7 }
  ];

  var FRETS = 12;                 // fret 0 (open string) through the 12th fret
  var QUESTIONS = 10;             // notes per session
  var SINGLE_INLAYS = [3, 5, 7, 9];
  var DOUBLE_INLAYS = [12];
  var DELAY_GOOD = 550;
  var DELAY_BAD = 1300;

  function noteAt(stringIndex, fret) {
    return (STRINGS[stringIndex].open + fret) % 12;
  }

  function noteLabel(pitchClass) {
    var n = NOTES[pitchClass];
    return n.alt ? n.name + '/' + n.alt : n.name;
  }

  // ---------------------------------------------------------------- state

  var state = {
    mode: 'name',       // 'name' | 'find' | 'explore'
    running: false,
    locked: false,      // true while feedback for an answer is showing
    asked: 0,
    score: 0,
    target: null,       // { string, fret, pitch }
    showAll: false,
    timer: null
  };

  var el = {
    modes: document.getElementById('modes'),
    prompt: document.getElementById('prompt'),
    progressFill: document.getElementById('progressFill'),
    neck: document.getElementById('neck'),
    board: document.getElementById('board'),
    stringHeads: document.getElementById('stringHeads'),
    pad: document.getElementById('notePad'),
    exploreTools: document.getElementById('exploreTools'),
    toggleAll: document.getElementById('toggleAll'),
    score: document.getElementById('score'),
    best: document.getElementById('best'),
    startBtn: document.getElementById('startBtn')
  };

  var cells = [];   // cells[string][fret] -> element (fret 1..12; index 0 unused)

  // ---------------------------------------------------------------- render

  function buildBoard() {
    STRINGS.forEach(function (s, i) {
      var spacer;
      if (i === 0) {
        spacer = document.createElement('div');
        el.stringHeads.appendChild(spacer);
      }
      var head = document.createElement('div');
      head.className = 'head';
      head.textContent = s.name;
      el.stringHeads.appendChild(head);
    });

    for (var i = 0; i < STRINGS.length; i++) cells[i] = [];

    // Fret 0 is the open-string row; it sits above the nut, which is already
    // in the markup as the board's first child.
    el.board.insertBefore(makeRow(0), el.board.firstElementChild);

    for (var fret = 1; fret <= FRETS; fret++) {
      el.board.appendChild(makeRow(fret));
    }
  }

  function makeRow(fret) {
    var row = document.createElement('div');
    row.className = 'board-row' + (fret === 0 ? ' open-row' : '');

    var num = document.createElement('div');
    num.className = 'fret-no';
    num.textContent = fret;
    row.appendChild(num);

    for (var s = 0; s < STRINGS.length; s++) {
      var cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.string = s;
      cell.dataset.fret = fret;

      if (SINGLE_INLAYS.indexOf(fret) !== -1 && s === 1) {
        cell.classList.add('inlay-r');
      }
      if (DOUBLE_INLAYS.indexOf(fret) !== -1 && (s === 0 || s === 2)) {
        cell.classList.add('inlay-r');
      }

      var marker = document.createElement('span');
      marker.className = 'marker';
      cell.appendChild(marker);

      row.appendChild(cell);
      cells[s][fret] = cell;
    }

    return row;
  }

  function buildPad() {
    NOTES.forEach(function (note, pitch) {
      var btn = document.createElement('button');
      btn.className = 'note-btn';
      btn.dataset.pitch = pitch;
      btn.setAttribute('aria-label', noteLabel(pitch));

      var main = document.createElement('span');
      main.textContent = note.name;
      btn.appendChild(main);

      if (note.alt) {
        var alt = document.createElement('span');
        alt.className = 'alt';
        alt.textContent = note.alt;
        btn.appendChild(alt);
      }

      el.pad.appendChild(btn);
    });
  }

  // ---------------------------------------------------------------- helpers

  function eachCell(fn) {
    for (var s = 0; s < STRINGS.length; s++) {
      for (var f = 0; f <= FRETS; f++) fn(cells[s][f], s, f);
    }
  }

  function clearBoard() {
    eachCell(function (cell) {
      cell.classList.remove('is-target', 'is-good', 'is-bad', 'is-reveal', 'is-pulse');
      cell.firstChild.textContent = '';
    });
  }

  function clearPad() {
    Array.prototype.forEach.call(el.pad.children, function (btn) {
      btn.classList.remove('is-good', 'is-bad');
    });
  }

  function setMarker(cell, cls, text) {
    cell.classList.add(cls);
    cell.firstChild.textContent = text || '';
  }

  function setPrompt(text, tone, big) {
    el.prompt.className = 'prompt' + (tone ? ' is-' + tone : '');
    el.prompt.textContent = text;
    if (big) {
      var span = document.createElement('span');
      span.className = 'big';
      span.textContent = big;
      el.prompt.appendChild(span);
    }
  }

  function updateScore() {
    el.score.innerHTML = state.score +
      '<span class="score-sep">/</span><span class="score-total">' + QUESTIONS + '</span>';
    el.progressFill.style.width = (state.asked / QUESTIONS * 100) + '%';
  }

  function bestKey() { return 'bassbuddy.best.' + state.mode; }

  function readBest() {
    try { return parseInt(localStorage.getItem(bestKey()), 10) || 0; }
    catch (e) { return 0; }
  }

  function writeBest(value) {
    try { localStorage.setItem(bestKey(), String(value)); } catch (e) { /* private mode */ }
  }

  function updateBest() {
    var b = readBest();
    el.best.textContent = b ? 'Best ' + b + '/' + QUESTIONS : 'Best —';
  }

  // Show a fade at the bottom edge while more frets sit below the fold.
  function updateScrollHint() {
    var b = el.board;
    var more = b.scrollHeight - b.clientHeight - b.scrollTop > 2;
    el.neck.classList.toggle('has-more', more);
  }

  // On short screens the neck scrolls; keep the active position in view.
  function scrollIntoView(cell) {
    if (!cell.scrollIntoView) return;
    var reduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      cell.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    } catch (e) {
      cell.scrollIntoView(false);
    }
    setTimeout(updateScrollHint, 400);
  }

  function buzz(ms) {
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } }
  }

  // ---------------------------------------------------------------- session

  function pickPosition() {
    var pos, guard = 0;
    do {
      pos = {
        string: Math.floor(Math.random() * STRINGS.length),
        fret: Math.floor(Math.random() * (FRETS + 1))
      };
      guard++;
    } while (state.target && guard < 20 &&
             pos.string === state.target.string && pos.fret === state.target.fret);

    pos.pitch = noteAt(pos.string, pos.fret);
    return pos;
  }

  function pickPitch() {
    var pitch, guard = 0;
    do {
      pitch = Math.floor(Math.random() * 12);
      guard++;
    } while (state.target && guard < 20 && pitch === state.target.pitch);
    return pitch;
  }

  function startSession() {
    stopTimer();
    state.running = true;
    state.locked = false;
    state.asked = 0;
    state.score = 0;
    state.target = null;
    clearBoard();
    clearPad();
    updateScore();
    el.startBtn.textContent = 'Stop';
    el.startBtn.classList.add('is-running');
    nextQuestion();
  }

  function endSession(finished) {
    stopTimer();
    state.running = false;
    state.locked = false;
    state.target = null;
    clearBoard();
    clearPad();
    el.startBtn.textContent = 'Start';
    el.startBtn.classList.remove('is-running');
    el.pad.classList.add('is-idle');

    if (finished) {
      if (state.score > readBest()) writeBest(state.score);
      updateBest();
      var tone = state.score === QUESTIONS ? 'good' : null;
      var msg = state.score === QUESTIONS
        ? 'Perfect run! ' + state.score + '/' + QUESTIONS + ' — start again?'
        : 'Session over: ' + state.score + '/' + QUESTIONS + ' — start again?';
      setPrompt(msg, tone);
    } else {
      el.progressFill.style.width = '0%';
      setPrompt(idleText());
    }
  }

  function nextQuestion() {
    clearBoard();
    clearPad();
    state.locked = false;

    if (state.mode === 'name') {
      state.target = pickPosition();
      var cell = cells[state.target.string][state.target.fret];
      setMarker(cell, 'is-target');
      cell.classList.add('is-pulse');
      scrollIntoView(cell);
      setPrompt('Which note is this?');
      el.pad.classList.remove('is-idle');
    } else if (state.mode === 'find') {
      state.target = { pitch: pickPitch() };
      setPrompt('Tap any', null, noteLabel(state.target.pitch));
    }
  }

  function afterAnswer() {
    state.asked++;
    updateScore();

    state.timer = setTimeout(function () {
      state.timer = null;
      if (!state.running) return;
      if (state.asked >= QUESTIONS) endSession(true);
      else nextQuestion();
    }, state.locked === 'bad' ? DELAY_BAD : DELAY_GOOD);
  }

  function stopTimer() {
    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
  }

  // Answer in "Name Note" mode: the player tapped a note button.
  function answerWithNote(pitch, button) {
    if (!state.running || state.locked || state.mode !== 'name' || !state.target) return;

    var cell = cells[state.target.string][state.target.fret];
    cell.classList.remove('is-pulse');
    var correct = pitch === state.target.pitch;

    if (correct) {
      state.locked = 'good';
      state.score++;
      button.classList.add('is-good');
      cell.classList.remove('is-target');
      setMarker(cell, 'is-good', NOTES[state.target.pitch].name);
      setPrompt('Correct — ' + noteLabel(state.target.pitch), 'good');
      buzz(20);
    } else {
      state.locked = 'bad';
      button.classList.add('is-bad');
      cell.classList.remove('is-target');
      setMarker(cell, 'is-bad', NOTES[state.target.pitch].name);
      highlightPad(state.target.pitch);
      setPrompt('That was ' + noteLabel(state.target.pitch), 'bad');
      buzz([25, 60, 25]);
    }

    afterAnswer();
  }

  function highlightPad(pitch) {
    var btn = el.pad.querySelector('.note-btn[data-pitch="' + pitch + '"]');
    if (btn) btn.classList.add('is-good');
  }

  // Answer in "Find Note" mode: the player tapped a fretboard position.
  function answerWithPosition(stringIndex, fret) {
    if (!state.running || state.locked || state.mode !== 'find' || !state.target) return;

    var cell = cells[stringIndex][fret];
    var pitch = noteAt(stringIndex, fret);
    var correct = pitch === state.target.pitch;

    if (correct) {
      state.locked = 'good';
      state.score++;
      setMarker(cell, 'is-good', NOTES[pitch].name);
      setPrompt('Correct — ' + noteLabel(pitch), 'good');
      buzz(20);
    } else {
      state.locked = 'bad';
      setMarker(cell, 'is-bad', NOTES[pitch].name);
      revealAll(state.target.pitch, stringIndex, fret);
      setPrompt('That is ' + noteLabel(pitch) + ' — green shows ' +
                noteLabel(state.target.pitch), 'bad');
      buzz([25, 60, 25]);
    }

    afterAnswer();
  }

  function revealAll(pitch, skipString, skipFret) {
    eachCell(function (cell, s, f) {
      if (s === skipString && f === skipFret) return;
      if (noteAt(s, f) === pitch) setMarker(cell, 'is-good', NOTES[pitch].name);
    });
  }

  // ---------------------------------------------------------------- explore

  function renderExplore() {
    clearBoard();
    if (state.showAll) {
      eachCell(function (cell, s, f) {
        setMarker(cell, 'is-reveal', NOTES[noteAt(s, f)].name);
      });
    }
  }

  function exploreTap(stringIndex, fret) {
    var cell = cells[stringIndex][fret];
    var pitch = noteAt(stringIndex, fret);
    if (cell.classList.contains('is-target')) {
      cell.classList.remove('is-target');
      if (state.showAll) setMarker(cell, 'is-reveal', NOTES[pitch].name);
      else cell.firstChild.textContent = '';
      return;
    }
    cell.classList.remove('is-reveal');
    setMarker(cell, 'is-target', NOTES[pitch].name);
    setPrompt(noteLabel(pitch) + ' — ' + STRINGS[stringIndex].name +
              (fret === 0 ? ' string, open' : ' string, fret ' + fret));
  }

  // ---------------------------------------------------------------- modes

  function idleText() {
    if (state.mode === 'name') return 'Press start — name the red dot.';
    if (state.mode === 'find') return 'Press start — find the note on the neck.';
    return 'Tap the neck to explore the notes.';
  }

  function setMode(mode) {
    if (mode === state.mode) return;
    if (state.running) endSession(false);

    state.mode = mode;
    state.showAll = false;
    el.toggleAll.setAttribute('aria-pressed', 'false');
    el.toggleAll.textContent = 'Show all notes';

    Array.prototype.forEach.call(el.modes.children, function (btn) {
      var active = btn.dataset.mode === mode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    var explore = mode === 'explore';
    el.pad.hidden = explore || mode === 'find';
    el.exploreTools.hidden = !explore;
    el.startBtn.parentNode.hidden = explore;
    document.getElementById('scoreboard').hidden = explore;
    document.getElementById('progress').hidden = explore;

    state.asked = 0;
    state.score = 0;
    state.target = null;
    clearBoard();
    clearPad();
    updateScore();
    updateBest();
    el.progressFill.style.width = '0%';
    el.pad.classList.add('is-idle');
    setPrompt(idleText());
    updateScrollHint();
  }

  // ---------------------------------------------------------------- events

  el.modes.addEventListener('click', function (e) {
    var btn = e.target.closest('.mode-btn');
    if (btn) setMode(btn.dataset.mode);
  });

  el.pad.addEventListener('click', function (e) {
    var btn = e.target.closest('.note-btn');
    if (btn) answerWithNote(parseInt(btn.dataset.pitch, 10), btn);
  });

  el.board.addEventListener('click', function (e) {
    var cell = e.target.closest('.cell');
    if (!cell) return;
    var s = parseInt(cell.dataset.string, 10);
    var f = parseInt(cell.dataset.fret, 10);
    if (state.mode === 'explore') exploreTap(s, f);
    else if (state.mode === 'find') answerWithPosition(s, f);
  });

  el.startBtn.addEventListener('click', function () {
    if (state.running) endSession(false);
    else startSession();
  });

  el.board.addEventListener('scroll', updateScrollHint, { passive: true });
  window.addEventListener('resize', updateScrollHint);

  el.toggleAll.addEventListener('click', function () {
    state.showAll = !state.showAll;
    el.toggleAll.setAttribute('aria-pressed', String(state.showAll));
    el.toggleAll.textContent = state.showAll ? 'Hide all notes' : 'Show all notes';
    renderExplore();
    setPrompt(idleText());
  });

  // ---------------------------------------------------------------- boot

  buildBoard();
  buildPad();
  updateScore();
  updateBest();
  el.pad.classList.add('is-idle');
  setPrompt(idleText());
  updateScrollHint();
})();
