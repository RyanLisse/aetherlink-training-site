// Screenshot + render-all check for the AetherLink site.
// usage: node shoot.js [outdir]
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(__dirname, 'shots');
require('fs').mkdirSync(out, { recursive: true });
const base = 'http://127.0.0.1:8080/';
const decks = [['1','3'],['1','4'],['1','5'],['1','1'],['1','2'],['2','1'],['2','2'],['2','3'],['2','4'],['2','5']];
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  // 1 · render every slide of every deck at 1440x900, collect console errors + figure kinds
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const kinds = {}; let total = 0; let overflow = [];
  for (const [squad, dayKey] of decks) {
    await page.goto(`${base}?squad=${squad}&day=${dayKey}#1`);
    await page.waitForSelector('#stage h1');
    const n = await page.evaluate(() => document.querySelectorAll('#progress .seg').length);
    for (let i = 1; i <= n; i++) {
      await page.evaluate(h => { location.hash = h; }, String(i));
      await page.waitForFunction(i => document.querySelector('#count')?.textContent.startsWith(String(i).padStart(2, '0')), i);
      const info = await page.evaluate(() => ({
        kind: document.querySelector('.slide-figure')?.dataset.kind || (document.querySelector('.widget') ? 'widget' : document.querySelector('.compare,.steps-wrap,.pillars,.recap-list') ? 'layout' : 'none'),
        doOnSlide: !!document.querySelector('#stage .exercise-instructions'),
        tall: document.documentElement.scrollHeight > 900 + 4,
        bot: document.querySelector('.bot')?.className || ''
      }));
      total++; kinds[info.kind] = (kinds[info.kind] || 0) + 1;
      if (info.doOnSlide) errors.push(`Do-this-now still on slide ${squad}/${dayKey}#${i}`);
      if (info.tall) overflow.push(`${squad}/${dayKey}#${i} (${info.kind})`);
    }
  }
  // framework deck
  await page.goto(base + '#1'); await page.waitForSelector('#stage h1');
  const fn = await page.evaluate(() => document.querySelectorAll('#progress .seg').length);
  for (let i = 1; i <= fn; i++) { await page.evaluate(h => { location.hash = h; }, String(i)); await page.waitForFunction(i => document.querySelector('#count')?.textContent.startsWith(String(i).padStart(2, '0')), i); total++; }
  console.log('rendered', total, 'slides · figure kinds', JSON.stringify(kinds));
  console.log('slides taller than 900px:', overflow.length, overflow.slice(0, 40).join(', '));
  // 2 · screenshots
  const shots = [['s1d3-01', '?squad=1&day=3#1'], ['s1d3-02', '?squad=1&day=3#2'], ['s1d3-03', '?squad=1&day=3#3'], ['s1d3-12', '?squad=1&day=3#12'], ['s1d3-15', '?squad=1&day=3#15'], ['s1d3-19', '?squad=1&day=3#19'], ['s1d5-02', '?squad=1&day=5#2'], ['s2d2-09', '?squad=2&day=2#9'], ['s1d4-04', '?squad=1&day=4#4'], ['s1d5-11', '?squad=1&day=5#11'], ['fw-07', '#7']];
  for (const [name, hash] of shots) {
    await page.goto(base + hash); await page.waitForSelector('#stage h1'); await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(out, name + '-1440.png') });
  }
  // notes dialog
  await page.goto(base + '?squad=1&day=3#12'); await page.waitForSelector('#stage h1'); await page.click('#notes'); await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, 'notes-dialog-1440.png') });
  await page.close();
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  for (const [name, hash] of [['s1d3-02', '?squad=1&day=3#2'], ['s1d3-12', '?squad=1&day=3#12']]) {
    await mobile.goto(base + hash); await mobile.waitForSelector('#stage h1'); await mobile.waitForTimeout(1200);
    await mobile.screenshot({ path: path.join(out, name + '-390.png'), fullPage: true });
    const wide = await mobile.evaluate(() => document.documentElement.scrollWidth > 390);
    if (wide) errors.push('horizontal overflow on mobile ' + hash);
  }
  await browser.close();
  console.log('errors:', errors.length); errors.forEach(e => console.log(' -', e));
  process.exit(errors.length ? 1 : 0);
})();
