/* One-off migration: repeat each Squad 1 day's route after lunch, the way Day 3
   and all five Squad 2 days already do. Run once with
   `node work/update-squad1-routes.js`; it rewrites dist/days.js.

   The after-lunch slide is the day's own route slide, verbatim cards — the
   schedule does not change halfway through the day, only where the room is in
   it. Only the title, kicker, subtitle and facilitator text differ. */
'use strict';
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'dist', 'days.js');
const src = fs.readFileSync(FILE, 'utf8');
const DATA = JSON.parse(src.replace(/^window\.DAYS\s*=\s*/, '').replace(/;?\s*$/, ''));

const isRoute = s => /route|rhythm|schedule/i.test(String(s.title || '')) || /^FIXED SCHEDULE|^SCHEDULE/.test(String(s.kicker || ''));
/* The earliest clock time the kicker names. A block that spans lunch
   ("11:45–12:00 + 13:00–13:20") resumes at its own 13:00, so every time in the
   kicker counts, not just the first. */
const resumesAfter = (s, cut) => {
  const times = [...String(s.kicker || '').matchAll(/(\d{1,2}):(\d{2})/g)]
    .map(m => Number(m[1]) * 60 + Number(m[2]));
  return times.some(t => t >= cut);
};

const log = [];

Object.keys(DATA).forEach(key => {
  const slides = DATA[key].slides;
  const dayNo = Number(key.replace('day', ''));

  const at = slides.findIndex(isRoute);
  if (at < 0) { log.push(key + ': no route slide, skipped'); return; }
  if (slides.some(s => /after lunch/i.test(String(s.title || '')))) { log.push(key + ': already repeats'); return; }

  const route = slides[at];
  /* The first block that starts at or after 13:00 — where the room picks the
     day back up. */
  const resume = slides.findIndex((s, i) => i > at && resumesAfter(s, 13 * 60));
  if (resume < 0) { log.push(key + ': no afternoon block, skipped'); return; }

  slides.splice(resume, 0, {
    ...route,
    cards: route.cards.map(c => ({ ...c })),
    title: (/^day \d/i.test(route.title) ? route.title : 'Day ' + dayNo + ' route') + ' · after lunch',
    kicker: 'FIXED SCHEDULE · 13:00–16:00',
    subtitle: 'The same route, halfway. Everything before lunch is behind us.',
    prompt: 'Show the same route again. Point at where the room is now, then name the artifact and the acceptance check for the afternoon blocks.',
    steps: ['Point at where we are.', 'Name the next artifact.', 'Name its acceptance check.'],
    expected: 'Everyone knows which blocks remain and what each one has to produce.',
    check: 'Everyone can name the next artifact and who accepts it.',
  });
  log.push(key + ': route at ' + (at + 1) + ' repeated at ' + (resume + 1));
});

fs.writeFileSync(FILE, 'window.DAYS = ' + JSON.stringify(DATA) + ';\n');
log.forEach(l => console.log(l));
console.log('slides per day: ' + Object.keys(DATA).map(k => k + '=' + DATA[k].slides.length).join(' '));
