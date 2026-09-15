/* One-off migration: bring the Squad 2 decks up to the same structure the
   Squad 1 decks got — a route slide at the start of the day and the same route
   again after lunch, and the bottleneck as live bar charts instead of one flat
   SVG. Run once with `node work/update-squad2.js`; it rewrites dist/squad2.js.

   Every route line is derived from the deck's own kickers, so the schedule on
   the slide is the schedule the slides already claim. Two lines are not in a
   kicker and are marked as such below. */
'use strict';
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'dist', 'squad2.js');
const src = fs.readFileSync(FILE, 'utf8');
const DATA = JSON.parse(src.replace(/^window\.SQUAD2\s*=\s*/, '').replace(/;?\s*$/, ''));

/* ---- route ----------------------------------------------------------- */

const RANGE = /(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/;
const mins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

/* The kicker's head word, turned into the word the route prints. */
const LABEL = {
  'theory + demo': 'theory and demo',
  individual: 'individual',
  review: 'review',
  practice: 'practice',
  break: 'break',
  'human gate': 'human gate',
  transfer: 'transfer',
  close: 'close',
};

/* Blocks a day's own slides declare, in clock order. A slide with a time range
   places itself; a timed-but-undated slide (BREAK · 15 MIN) is dropped into the
   gap that fits it. */
function blocksOf(slides) {
  const timed = [];
  const floating = [];
  slides.forEach(s => {
    const kicker = String(s.kicker || '');
    const head = kicker.split('·')[0].trim().toLowerCase();
    const label = LABEL[head];
    if (!label) return;
    const r = kicker.match(RANGE);
    if (r) {
      /* The full-day range on the opener frames the day, it is not a block. */
      if (mins(r[2]) - mins(r[1]) > 240) return;
      timed.push({ from: r[1], to: r[2], label });
      return;
    }
    const dur = Number(kicker.match(/(\d+)\s*MIN/i)?.[1]);
    if (dur) floating.push({ dur, label });
  });
  timed.sort((a, b) => mins(a.from) - mins(b.from));

  /* Place each floating block in the first gap of exactly its length. */
  floating.forEach(f => {
    for (let i = 0; i < timed.length - 1; i++) {
      if (mins(timed[i + 1].from) - mins(timed[i].to) === f.dur) {
        timed.splice(i + 1, 0, { from: timed[i].to, to: timed[i + 1].from, label: f.label });
        return;
      }
    }
  });

  /* The one gap no slide covers: the hour before the human gate is lunch on
     every day of both squads. Named here, not derived. */
  for (let i = 0; i < timed.length - 1; i++) {
    if (timed[i].to === '12:00' && timed[i + 1].from === '13:00') {
      timed.splice(i + 1, 0, { from: '12:00', to: '13:00', label: 'lunch' });
      break;
    }
  }

  /* The opener runs from the start of the day to the first timed block. */
  const day = slides.map(s => String(s.kicker || '').match(/^DAY \d.*?(\d{1,2}:\d{2})/)?.[1]).find(Boolean);
  if (day && timed.length && mins(timed[0].from) > mins(day)) {
    timed.unshift({ from: day, to: timed[0].from, label: 'theory and demo' });
  }
  return timed;
}

const printBlock = b => b.from + '–' + b.to + ' ' + b.label;

function routeCards(blocks) {
  const at = t => mins(t);
  const part = (from, to) => blocks.filter(b => at(b.from) >= at(from) && at(b.from) < at(to)).map(printBlock).join(' · ');
  return [
    { title: 'Morning', body: part('00:00', '11:35') },
    { title: 'Midday', body: part('11:35', '14:00') },
    { title: 'Afternoon', body: part('14:00', '23:59') },
  ].filter(c => c.body);
}

function routeSlide(dayNo, blocks, afterLunch) {
  const cards = routeCards(blocks);
  const last = blocks[blocks.length - 1];
  return {
    title: 'Day ' + dayNo + ' route' + (afterLunch ? ' · after lunch' : ''),
    kicker: 'FIXED SCHEDULE · ' + (afterLunch ? '13:00' : blocks[0].from) + '–' + (last ? last.to : '16:00'),
    subtitle: afterLunch
      ? 'The same route, halfway. Everything before lunch is behind us.'
      : 'The same rhythm every day: the timeboxes are shared, the exercise changes.',
    cards,
    prompt: afterLunch
      ? 'Show the same route again. Point at where the room is now, then name the artifact and the acceptance check for the afternoon blocks.'
      : 'Read the route aloud before anything else. Name the artifact and the human acceptance check for the first block. Keep the lunch and the breaks fixed.',
    notes: 'Houd dit schema identiek op alle vijf dagen; verplaats geen pauzes.',
    dark: false,
    steps: afterLunch
      ? ['Point at where we are.', 'Name the next artifact.', 'Name its acceptance check.']
      : ['Read the timebox.', 'Name its artifact.', 'Name its acceptance check.'],
    expected: afterLunch
      ? 'Everyone knows which blocks remain and what each one has to produce.'
      : 'Participants can navigate the whole day before it starts.',
    check: afterLunch
      ? 'Everyone can name the next artifact and who accepts it.'
      : 'The opening, lunch, the breaks and the close match the day guide.',
  };
}

/* ---- the bottleneck as bars ------------------------------------------ */

const barNotes = 'Vaste cadans: definitie → beeld → hoe wij ermee werken. Lees de definitie letterlijk voor, wijs het beeld aan, laat de groep de gebruiksstap zelf zeggen.';

const beforeBars = {
  title: 'Before agents · build is the widest block',
  kicker: 'VISUAL · THE BOTTLENECK MOVED',
  subtitle: 'Every stage runs at human speed, and build takes the most of it.',
  cards: [],
  prompt: 'Point at the Build block. Ask: how long does a change wait here today?',
  notes: barNotes,
  dark: false,
  steps: ['Point at the widest block.'],
  expected: 'The room agrees build was the long pole.',
  check: 'Everyone can say which stage took the most calendar time before agents.',
  bars: {
    stages: [
      { name: 'Plan', w: 10 }, { name: 'Design', w: 10 }, { name: 'Build', w: 44, accent: true },
      { name: 'Test', w: 12 }, { name: 'Deploy', w: 12 }, { name: 'Maintain', w: 12 },
    ],
    scale: 'Before agents · every stage at human speed',
    caption: 'Build is the long pole. The controls around it were designed for exactly that.',
  },
};

const afterBars = {
  title: 'After agents · build is a sliver',
  kicker: 'VISUAL · THE BOTTLENECK MOVED',
  subtitle: 'Build collapses. Plan, test and deploy keep the length they always had.',
  cards: [],
  prompt: 'Point at the sliver, then at the reclaimed block. Ask: where does the queue build up now?',
  notes: barNotes,
  dark: false,
  steps: ["Point at the stage where your team's queue builds up now."],
  expected: 'Everyone can point at their own bottleneck after build.',
  check: "Everyone can name the stage where their team's queue builds when build gets ten times faster.",
  bars: {
    stages: [
      { name: 'Plan', w: 10 }, { name: 'Design', w: 10 }, { name: 'Build', w: 4, accent: true },
      { name: 'Test', w: 12 }, { name: 'Deploy', w: 12 }, { name: 'Maintain', w: 12 },
      { name: 'cycle time reclaimed', w: 40, ghost: true },
    ],
    scale: 'After agents · build runs at agent speed',
    caption: 'The constraint moved to the human-speed steps around build.',
  },
};

const threeThings = {
  title: 'Three things become true',
  kicker: 'CONCEPT · THE BOTTLENECK MOVED',
  subtitle: 'Once build stops being the constraint, three things follow.',
  cards: [
    { title: 'THE BOTTLENECK MOVES', body: 'To plan, review and test, and to deploy, which still run at human speed.' },
    { title: 'CONTROLS STOP MATCHING REALITY', body: 'Line-by-line review made sense when a person wrote the line; it cannot keep up when agents write most of the diff.' },
    { title: 'GOVERNANCE GETS MORE EXPENSIVE', body: 'Exceptions still route through committees that meet weekly or monthly, so the queue grows where the people are.' },
  ],
  prompt: 'Read the three consequences and let the room pick the one they recognise in their own team.',
  notes: barNotes,
  dark: false,
  steps: ['Pick the consequence you recognise.'],
  expected: 'Each participant names the consequence they see in their own team.',
  check: 'Everyone can name one control in their own team that no longer matches how the work is done.',
  tagline: 'SAME CONTROL OBJECTIVES · THE CONTROLS AROUND BUILD MUST CHANGE AS MUCH AS BUILD DID',
};

/* ---- apply ------------------------------------------------------------ */

const log = [];

Object.keys(DATA).forEach(key => {
  const dayNo = Number(key.replace('day', ''));
  const slides = DATA[key].slides;

  /* Day 3's opener was the only one without the day's own kicker. */
  if (!slides.some(s => /^DAY \d/.test(String(s.kicker || '')))) {
    slides[0].kicker = 'DAY ' + dayNo + ' · 10:00–16:00';
    log.push(key + ': opener kicker set to DAY ' + dayNo);
  }

  const blocks = blocksOf(slides);
  if (!blocks.length) return;

  /* The route opens the day, right after the cover. */
  slides.splice(1, 0, routeSlide(dayNo, blocks, false));

  /* And again in front of the human gate, the first block after lunch. */
  const gate = slides.findIndex(s => /^HUMAN GATE/.test(String(s.kicker || '')));
  if (gate > 0) slides.splice(gate, 0, routeSlide(dayNo, blocks, true));
  log.push(key + ': route at 2 and ' + (gate + 1) + ' · ' + blocks.length + ' blocks');
});

/* Day 1 carries the bottleneck. One flat SVG becomes two bar charts plus the
   consequences slide, the same three the Squad 1 deck uses. */
const d1 = DATA.day1.slides;
const svg = d1.findIndex(s => /see the bars/.test(s.title));
if (svg >= 0) {
  d1.splice(svg, 1, beforeBars, afterBars, threeThings);
  log.push('day1: bottleneck SVG at ' + (svg + 1) + ' replaced by bars, bars, consequences');
}

fs.writeFileSync(FILE, 'window.SQUAD2 = ' + JSON.stringify(DATA) + ';\n');
log.forEach(l => console.log(l));
console.log('slides per day: ' + Object.keys(DATA).map(k => k + '=' + DATA[k].slides.length).join(' '));
