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
  var DOT_FRETS = [3, 5, 7, 9, 12];
  var DELAY_GOOD = 550;
  var DELAY_BAD = 1300;

  // Practice zones. They are toggles, so the active frets are the union of
  // whatever is switched on — 5–9 and 9–12 overlapping at the 9th is harmless.
  var ZONES = [
    { id: 'low',  label: 'Open–4', from: 0, to: 4 },
    { id: 'mid',  label: '5–9',    from: 5, to: 9 },
    { id: 'high', label: '9–12',   from: 9, to: 12 }
  ];

  // Semitone steps from the root. `steps: null` means no scale filter.
  var SCALES = [
    { id: 'none',       name: 'All notes',        steps: null },
    { id: 'major',      name: 'Major',            steps: [0, 2, 4, 5, 7, 9, 11] },
    { id: 'minor',      name: 'Natural minor',    steps: [0, 2, 3, 5, 7, 8, 10] },
    { id: 'majorpent',  name: 'Major pentatonic', steps: [0, 2, 4, 7, 9] },
    { id: 'minorpent',  name: 'Minor pentatonic', steps: [0, 3, 5, 7, 10] },
    { id: 'blues',      name: 'Blues',            steps: [0, 3, 5, 6, 7, 10] },
    { id: 'dorian',     name: 'Dorian',           steps: [0, 2, 3, 5, 7, 9, 10] },
    { id: 'mixolydian', name: 'Mixolydian',       steps: [0, 2, 4, 5, 7, 9, 10] }
  ];

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
    locked: false,      // 'good' | 'bad' while feedback is showing
    asked: 0,
    score: 0,
    target: null,       // { string, fret, pitch }
    showAll: false,
    timer: null
  };

  // Practice filters. Every mode draws from the positions these leave active.
  var settings = {
    zones: ['low', 'mid', 'high'],
    dotsOnly: false,
    scale: 'none',
    root: 0
  };

  var el = {
    modes: document.getElementById('modes'),
    filters: document.getElementById('filters'),
    prompt: document.getElementById('prompt'),
    progressFill: document.getElementById('progressFill'),
    neck: document.getElementById('neck'),
    board: document.getElementById('board'),
    stringHeads: document.getElementById('stringHeads'),
    pad: document.getElementById('notePad'),
    exploreTools: document.getElementById('exploreTools'),
    exploreHint: document.getElementById('exploreHint'),
    toggleAll: document.getElementById('toggleAll'),
    score: document.getElementById('score'),
    best: document.getElementById('best'),
    startBtn: document.getElementById('startBtn'),
    gearBtn: document.getElementById('gearBtn'),
    sheet: document.getElementById('sheet'),
    zoneChips: document.getElementById('zoneChips'),
    dotsOnly: document.getElementById('dotsOnly'),
    scaleSel: document.getElementById('scaleSel'),
    rootSel: document.getElementById('rootSel'),
    sheetSummary: document.getElementById('sheetSummary')
  };

  var cells = [];   // cells[string][fret] -> element
  var rows = [];    // rows[fret] -> element

  // ---------------------------------------------------------------- render

  function buildBoard() {
    STRINGS.forEach(function (s, i) {
      if (i === 0) el.stringHeads.appendChild(document.createElement('div'));
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

    rows[fret] = row;
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

  // ---------------------------------------------------------------- filters

  function scaleDef() {
    for (var i = 0; i < SCALES.length; i++) {
      if (SCALES[i].id === settings.scale) return SCALES[i];
    }
    return SCALES[0];
  }

  // Pitch classes the current scale allows, or null when no scale is selected.
  function scalePitches() {
    var steps = scaleDef().steps;
    if (!steps) return null;
    return steps.map(function (step) { return (settings.root + step) % 12; });
  }

  function hasScale() { return scaleDef().steps !== null; }

  // A fret is in play when a switched-on zone covers it and, if "only on the
  // dots" is set, an inlay marks it. This part does not depend on the string.
  function fretAllowed(fret) {
    var inZone = settings.zones.some(function (id) {
      for (var i = 0; i < ZONES.length; i++) {
        if (ZONES[i].id === id) return fret >= ZONES[i].from && fret <= ZONES[i].to;
      }
      return false;
    });
    if (!inZone) return false;
    return !settings.dotsOnly || DOT_FRETS.indexOf(fret) !== -1;
  }

  function isActive(stringIndex, fret) {
    if (!fretAllowed(fret)) return false;
    var allowed = scalePitches();
    return !allowed || allowed.indexOf(noteAt(stringIndex, fret)) !== -1;
  }

  function activePositions() {
    var list = [];
    eachCell(function (cell, s, f) {
      if (isActive(s, f)) list.push({ string: s, fret: f, pitch: noteAt(s, f) });
    });
    return list;
  }

  function activePitches() {
    var seen = {}, list = [];
    activePositions().forEach(function (pos) {
      if (!seen[pos.pitch]) { seen[pos.pitch] = true; list.push(pos.pitch); }
    });
    return list;
  }

  function isRoot(pitch) { return hasScale() && pitch === settings.root; }

  // Grey out everything the filters exclude, so the neck shows the practice set.
  function applyFilter() {
    eachCell(function (cell, s, f) {
      cell.classList.toggle('is-off', !isActive(s, f));
    });
    for (var f = 0; f <= FRETS; f++) {
      rows[f].classList.toggle('row-off', !fretAllowed(f));
    }
    updateFilterSummary();
    updateStartState();
  }

  function scaleName() {
    return NOTES[settings.root].name + ' ' + scaleDef().name.toLowerCase();
  }

  function isDefaultSettings() {
    return settings.zones.length === ZONES.length && !settings.dotsOnly && !hasScale();
  }

  function summaryParts() {
    var parts = [];
    if (settings.zones.length !== ZONES.length) {
      parts.push(settings.zones.length
        ? ZONES.filter(function (z) { return settings.zones.indexOf(z.id) !== -1; })
               .map(function (z) { return z.label; }).join(' + ')
        : 'no zone');
    }
    if (settings.dotsOnly) parts.push('dots only');
    if (hasScale()) parts.push(scaleName());
    return parts;
  }

  function updateFilterSummary() {
    var parts = summaryParts();
    el.filters.hidden = parts.length === 0;
    el.filters.textContent = parts.join(' · ');

    var count = activePositions().length;
    el.sheetSummary.textContent = count
      ? count + ' of ' + (STRINGS.length * (FRETS + 1)) + ' positions in play' +
        (isDefaultSettings() ? ' — the whole neck' : '')
      : 'Nothing is in play. Switch a zone back on, or pick a wider scale.';
    el.sheetSummary.classList.toggle('is-empty', count === 0);
  }

  function canPlay() { return activePositions().length > 0; }

  function updateStartState() {
    el.startBtn.disabled = !canPlay();
  }

  // ---------------------------------------------------------------- helpers

  function eachCell(fn) {
    for (var s = 0; s < STRINGS.length; s++) {
      for (var f = 0; f <= FRETS; f++) fn(cells[s][f], s, f);
    }
  }

  function clearBoard() {
    eachCell(function (cell) {
      cell.classList.remove('is-target', 'is-good', 'is-bad', 'is-reveal',
                            'is-root', 'is-pulse');
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

  function loadSettings() {
    var raw;
    try { raw = localStorage.getItem('bassbuddy.settings'); } catch (e) { return; }
    if (!raw) return;
    var saved;
    try { saved = JSON.parse(raw); } catch (e) { return; }
    if (!saved || typeof saved !== 'object') return;

    if (Array.isArray(saved.zones)) {
      settings.zones = saved.zones.filter(function (id) {
        return ZONES.some(function (z) { return z.id === id; });
      });
    }
    settings.dotsOnly = !!saved.dotsOnly;
    if (SCALES.some(function (sc) { return sc.id === saved.scale; })) {
      settings.scale = saved.scale;
    }
    if (typeof saved.root === 'number' && saved.root >= 0 && saved.root < 12) {
      settings.root = saved.root;
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem('bassbuddy.settings', JSON.stringify(settings));
    } catch (e) { /* private mode */ }
  }

  // Show a fade at the bottom edge while more frets sit below the fold.
  function updateScrollHint() {
    var b = el.board;
    el.neck.classList.toggle('has-more', b.scrollHeight - b.clientHeight - b.scrollTop > 2);
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

  // After a filter change, bring the first fret that is still in play into view.
  function scrollToFirstActive() {
    for (var f = 0; f <= FRETS; f++) {
      if (!fretAllowed(f)) continue;
      var top = rows[f].getBoundingClientRect().top -
                el.board.getBoundingClientRect().top + el.board.scrollTop;
      el.board.scrollTop = Math.max(0, top - 4);
      break;
    }
    updateScrollHint();
  }

  function buzz(ms) {
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } }
  }

  function pickRandom(list, isSameAsLast) {
    if (!list.length) return null;
    var pick, guard = 0;
    do {
      pick = list[Math.floor(Math.random() * list.length)];
      guard++;
    } while (list.length > 1 && guard < 25 && isSameAsLast && isSameAsLast(pick));
    return pick;
  }

  // ---------------------------------------------------------------- session

  function pickPosition() {
    var last = state.target;
    return pickRandom(activePositions(), function (pos) {
      return last && pos.string === last.string && pos.fret === last.fret;
    });
  }

  function pickPitch() {
    var last = state.target;
    return pickRandom(activePitches(), function (pitch) {
      return last && pitch === last.pitch;
    });
  }

  function startSession() {
    if (!canPlay()) return;
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
      var perfect = state.score === QUESTIONS;
      setPrompt((perfect ? 'Perfect run! ' : 'Session over: ') +
                state.score + '/' + QUESTIONS + ' — start again?', perfect ? 'good' : null);
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
      if (!state.target) return endSession(false);
      var cell = cells[state.target.string][state.target.fret];
      setMarker(cell, 'is-target');
      cell.classList.add('is-pulse');
      scrollIntoView(cell);
      setPrompt('Which note is this?');
      el.pad.classList.remove('is-idle');
    } else if (state.mode === 'find') {
      var pitch = pickPitch();
      if (pitch === null) return endSession(false);
      state.target = { pitch: pitch };
      setPrompt('Tap any', null, noteLabel(pitch));
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
    cell.classList.remove('is-pulse', 'is-target');

    if (pitch === state.target.pitch) {
      state.locked = 'good';
      state.score++;
      button.classList.add('is-good');
      setMarker(cell, 'is-good', NOTES[state.target.pitch].name);
      setPrompt('Correct — ' + noteLabel(state.target.pitch), 'good');
      buzz(20);
    } else {
      state.locked = 'bad';
      button.classList.add('is-bad');
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

    if (pitch === state.target.pitch) {
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
      if (isActive(s, f) && noteAt(s, f) === pitch) {
        setMarker(cell, 'is-good', NOTES[pitch].name);
      }
    });
  }

  // ---------------------------------------------------------------- explore

  function renderExplore() {
    clearBoard();
    eachCell(function (cell, s, f) {
      if (!isActive(s, f)) return;
      var pitch = noteAt(s, f);
      // With a scale selected the roots stay lit in red; the rest of the scale
      // comes up on tap, or all at once via the toggle.
      if (isRoot(pitch)) setMarker(cell, 'is-root', NOTES[pitch].name);
      else if (state.showAll) setMarker(cell, 'is-reveal', NOTES[pitch].name);
    });
    updateExploreHint();
  }

  function updateExploreHint() {
    el.exploreHint.textContent = hasScale()
      ? 'Red marks the root of ' + scaleName() + '.'
      : 'Tap any position on the neck to reveal its note.';
  }

  function exploreTap(stringIndex, fret) {
    var cell = cells[stringIndex][fret];
    var pitch = noteAt(stringIndex, fret);

    if (!cell.classList.contains('is-root')) {
      if (cell.classList.contains('is-target')) {
        cell.classList.remove('is-target');
        if (state.showAll) setMarker(cell, 'is-reveal', NOTES[pitch].name);
        else cell.firstChild.textContent = '';
        return;
      }
      cell.classList.remove('is-reveal');
      setMarker(cell, 'is-target', NOTES[pitch].name);
    }

    setPrompt(noteLabel(pitch) + (isRoot(pitch) ? ' (root)' : '') + ' — ' +
              STRINGS[stringIndex].name +
              (fret === 0 ? ' string, open' : ' string, fret ' + fret));
  }

  // ---------------------------------------------------------------- modes

  function idleText() {
    if (!canPlay()) return 'No positions match your settings.';
    if (state.mode === 'name') return 'Press start — name the red dot.';
    if (state.mode === 'find') return 'Press start — find the note on the neck.';
    return 'Tap the neck to explore the notes.';
  }

  function refreshMode() {
    stopTimer();
    state.running = false;
    state.locked = false;
    state.asked = 0;
    state.score = 0;
    state.target = null;

    el.startBtn.textContent = 'Start';
    el.startBtn.classList.remove('is-running');
    el.progressFill.style.width = '0%';
    el.pad.classList.add('is-idle');

    clearBoard();
    clearPad();
    updateScore();
    updateBest();

    if (state.mode === 'explore') renderExplore();
    setPrompt(idleText());
    updateScrollHint();
  }

  function setMode(mode) {
    if (mode === state.mode) return;

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

    refreshMode();
  }

  // ---------------------------------------------------------------- settings UI

  function buildSettings() {
    ZONES.forEach(function (zone) {
      var chip = document.createElement('button');
      chip.className = 'chip';
      chip.dataset.zone = zone.id;
      chip.textContent = zone.label;
      chip.setAttribute('aria-pressed', 'false');
      el.zoneChips.appendChild(chip);
    });

    SCALES.forEach(function (scale) {
      var opt = document.createElement('option');
      opt.value = scale.id;
      opt.textContent = scale.name;
      el.scaleSel.appendChild(opt);
    });

    NOTES.forEach(function (note, pitch) {
      var opt = document.createElement('option');
      opt.value = pitch;
      opt.textContent = noteLabel(pitch);
      el.rootSel.appendChild(opt);
    });
  }

  function syncSettingsUI() {
    Array.prototype.forEach.call(el.zoneChips.children, function (chip) {
      var on = settings.zones.indexOf(chip.dataset.zone) !== -1;
      chip.classList.toggle('is-on', on);
      chip.setAttribute('aria-pressed', String(on));
    });
    el.dotsOnly.checked = settings.dotsOnly;
    el.scaleSel.value = settings.scale;
    el.rootSel.value = String(settings.root);
    el.rootSel.disabled = !hasScale();
    el.rootSel.parentNode.classList.toggle('is-disabled', !hasScale());
  }

  // Any filter change invalidates the question pool, so the session restarts.
  function settingsChanged() {
    saveSettings();
    syncSettingsUI();
    applyFilter();
    refreshMode();
    scrollToFirstActive();
  }

  function openSheet() {
    syncSettingsUI();
    updateFilterSummary();
    el.sheet.hidden = false;
    document.body.classList.add('sheet-open');
    el.gearBtn.setAttribute('aria-expanded', 'true');
  }

  function closeSheet() {
    el.sheet.hidden = true;
    document.body.classList.remove('sheet-open');
    el.gearBtn.setAttribute('aria-expanded', 'false');
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
    if (!isActive(s, f)) return;          // filtered-out positions are inert
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

  el.gearBtn.addEventListener('click', openSheet);
  el.filters.addEventListener('click', openSheet);

  el.sheet.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) closeSheet();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !el.sheet.hidden) closeSheet();
  });

  el.zoneChips.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    var id = chip.dataset.zone;
    var at = settings.zones.indexOf(id);
    if (at === -1) settings.zones.push(id);
    else settings.zones.splice(at, 1);
    settingsChanged();
  });

  el.dotsOnly.addEventListener('change', function () {
    settings.dotsOnly = el.dotsOnly.checked;
    settingsChanged();
  });

  el.scaleSel.addEventListener('change', function () {
    settings.scale = el.scaleSel.value;
    settingsChanged();
  });

  el.rootSel.addEventListener('change', function () {
    settings.root = parseInt(el.rootSel.value, 10);
    settingsChanged();
  });

  // ---------------------------------------------------------------- boot

  buildBoard();
  buildPad();
  buildSettings();
  loadSettings();
  syncSettingsUI();
  applyFilter();
  updateScore();
  updateBest();
  el.pad.classList.add('is-idle');
  setPrompt(idleText());
  updateScrollHint();
})();
