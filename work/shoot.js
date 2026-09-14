// Browser regression gate and representative screenshots for the AetherLink site.
// usage: node work/shoot.js [outdir]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const out = process.argv[2] || path.join(__dirname, 'shots');
const base = process.env.SHOOT_BASE || 'http://127.0.0.1:8080/';
const desktopViewport = { width: 1440, height: 900 };
const mobileViewport = { width: 390, height: 844 };
const decks = [
  { id: 'framework', label: 'framework', query: '' },
  { id: 's1d3', label: 'squad 1/day 3', query: 'squad=1&day=3' },
  { id: 's1d4', label: 'squad 1/day 4', query: 'squad=1&day=4' },
  { id: 's1d5', label: 'squad 1/day 5', query: 'squad=1&day=5' },
  { id: 's1d1', label: 'squad 1/day 1', query: 'squad=1&day=1' },
  { id: 's1d2', label: 'squad 1/day 2', query: 'squad=1&day=2' },
  { id: 's2d1', label: 'squad 2/day 1', query: 'squad=2&day=1' },
  { id: 's2d2', label: 'squad 2/day 2', query: 'squad=2&day=2' },
  { id: 's2d3', label: 'squad 2/day 3', query: 'squad=2&day=3' },
  { id: 's2d4', label: 'squad 2/day 4', query: 'squad=2&day=4' },
  { id: 's2d5', label: 'squad 2/day 5', query: 'squad=2&day=5' }
];

fs.mkdirSync(out, { recursive: true });
const errors = [];
const report = {
  base,
  viewports: { desktop: desktopViewport, mobile: mobileViewport },
  reducedMotion: true,
  decks: [],
  uniqueSlides: 0,
  viewportRenders: { desktop: 0, mobile: 0 },
  figureKinds: {},
  representativeScreenshots: [],
  errors
};
const representativeKinds = { desktop: new Set(), mobile: new Set() };

function urlFor(deck, slide) {
  return `${base}${deck.query ? `?${deck.query}` : ''}#${slide}`;
}

function addError(message) {
  errors.push(message);
}

async function openSlide(page, deck, slide) {
  await page.goto(urlFor(deck, slide), { waitUntil: 'networkidle' });
  await page.waitForSelector('#stage h1');
  await page.waitForFunction(expected => document.querySelector('#count')?.textContent.startsWith(expected), String(slide).padStart(2, '0'));
  await page.waitForTimeout(50);
}

async function deckSize(page, deck) {
  await openSlide(page, deck, 1);
  return page.evaluate(() => document.querySelectorAll('#progress .seg').length);
}

async function inspectSlide(page, deck, slide, mode) {
  const info = await page.evaluate(({ mode, viewportWidth }) => {
    const finite = value => Number.isFinite(value);
    const visible = element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const intersects = (a, b) => a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
    const images = [...document.images].map(image => ({
      src: image.currentSrc || image.src,
      loaded: image.complete && image.naturalWidth > 0
    }));
    const svgIssues = [];
    [...document.querySelectorAll('svg')].filter(visible).forEach((svg, index) => {
      const rect = svg.getBoundingClientRect();
      const values = [rect.left, rect.top, rect.right, rect.bottom, rect.width, rect.height];
      if (!values.every(finite) || rect.width <= 0 || rect.height <= 0) svgIssues.push(`svg ${index + 1} has non-finite or empty bounds`);
      try {
        const box = svg.getBBox();
        if (![box.x, box.y, box.width, box.height].every(finite)) svgIssues.push(`svg ${index + 1} has a non-finite drawing box`);
      } catch (error) {
        svgIssues.push(`svg ${index + 1} getBBox failed: ${error.message}`);
      }
    });
    const textBoundsIssues = [];
    const boundedTextKinds = new Set(['comparison', 'layers', 'handoff']);
    const kind = document.querySelector('.slide-figure')?.dataset.kind || '';
    if (boundedTextKinds.has(kind)) {
      [...document.querySelectorAll('svg')].filter(visible).forEach((svg, svgIndex) => {
        const viewBox = svg.viewBox?.baseVal;
        if (!viewBox || ![viewBox.x, viewBox.y, viewBox.width, viewBox.height].every(finite)) {
          textBoundsIssues.push(`${kind} svg ${svgIndex + 1} has no finite viewBox`);
          return;
        }
        const tolerance = 2;
        [...svg.querySelectorAll('text')].filter(visible).forEach((text, textIndex) => {
          try {
            const box = text.getBBox();
            const within = box.x >= viewBox.x - tolerance && box.y >= viewBox.y - tolerance &&
              box.x + box.width <= viewBox.x + viewBox.width + tolerance &&
              box.y + box.height <= viewBox.y + viewBox.height + tolerance;
            if (!within) textBoundsIssues.push(`${kind} svg ${svgIndex + 1} text ${textIndex + 1} exceeds viewBox: ${text.textContent.trim().slice(0, 60)}`);
          } catch (error) {
            textBoundsIssues.push(`${kind} svg ${svgIndex + 1} text ${textIndex + 1} getBBox failed: ${error.message}`);
          }
        });
      });
    }
    const motionIssues = [];
    const nonZeroDuration = value => value.split(',').some(part => Number.parseFloat(part) > 0);
    [...document.querySelectorAll('.bot, .fig, .fig *')].filter(visible).forEach((element, index) => {
      const style = getComputedStyle(element);
      if (style.animationName !== 'none' || nonZeroDuration(style.transitionDuration)) {
        motionIssues.push(`visible motion element ${index + 1} is not reduced`);
      }
    });
    const botIssues = [];
    document.querySelectorAll('.bot').forEach((bot, index) => {
      const botRect = bot.getBoundingClientRect();
      const figure = bot.closest('.slide-figure.with-bot');
      const canvas = figure?.querySelector('.figure-canvas');
      if (!figure || !canvas) {
        botIssues.push(`bot ${index + 1} is missing its figure column`);
        return;
      }
      if (intersects(botRect, canvas.getBoundingClientRect())) botIssues.push(`bot ${index + 1} overlaps the figure canvas`);
      const textElements = document.querySelectorAll('#stage h1, #stage h2, #stage h3, #stage p, #stage li, #stage button, #stage figcaption, #stage .card, #stage .step-label, #stage .pillar-label, #stage .compare-col, #stage .recap-item, #stage .timer, #stage svg text');
      textElements.forEach(text => {
        if (text === bot || text.closest('.bot')) return;
        if (intersects(botRect, text.getBoundingClientRect())) botIssues.push(`bot ${index + 1} overlaps text: ${text.textContent.trim().slice(0, 60)}`);
      });
    });
    const desktopHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    const horizontalWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const controls = ['#notes', '#prompt'].map(selector => {
      const element = document.querySelector(selector);
      return { selector, present: !!element, visible: !!element && visible(element) };
    });
    return {
      kind: document.querySelector('.slide-figure')?.dataset.kind || (document.querySelector('.widget') ? 'widget' : document.querySelector('.compare,.steps-wrap,.pillars,.recap-list') ? 'layout' : 'none'),
      duplicateGeneratedCards: !!document.querySelector('#stage .slide-figure.generated') && !!document.querySelector('#stage .slide-main .card, #stage .slide-main .cards'),
      images,
      svgIssues,
      textBoundsIssues,
      motionIssues,
      botIssues,
      desktopHeight,
      horizontalWidth,
      viewportWidth,
      controls,
      doOnSlide: !!document.querySelector('#stage .exercise-instructions'),
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    };
  }, { mode, viewportWidth: mode === 'mobile' ? mobileViewport.width : desktopViewport.width });

  const prefix = `${deck.id}#${slide}`;
  if (!info.reducedMotion) addError(`${prefix}: reduced-motion media query is not active`);
  if (info.doOnSlide) addError(`${prefix}: Do-this-now instructions leaked onto the slide`);
  if (info.duplicateGeneratedCards) addError(`${prefix}: generated visual still has a duplicate slide-main card strip`);
  info.images.filter(image => !image.loaded).forEach(image => addError(`${prefix}: image failed to load: ${image.src}`));
  info.svgIssues.forEach(issue => addError(`${prefix}: ${issue}`));
  info.textBoundsIssues.forEach(issue => addError(`${prefix}: ${issue}`));
  info.motionIssues.forEach(issue => addError(`${prefix}: ${issue}`));
  info.botIssues.forEach(issue => addError(`${prefix}: ${issue}`));
  info.controls.filter(control => !control.present || !control.visible).forEach(control => addError(`${prefix}: ${control.selector} control is missing or hidden`));
  if (mode === 'desktop' && info.desktopHeight > desktopViewport.height + 4) {
    addError(`${prefix}: desktop document is ${info.desktopHeight}px tall (viewport ${desktopViewport.height}px)`);
  }
  if (mode === 'mobile' && info.horizontalWidth > mobileViewport.width + 1) {
    addError(`${prefix}: mobile document is ${info.horizontalWidth}px wide (viewport ${mobileViewport.width}px)`);
  }
  report.viewportRenders[mode] += 1;
  report.figureKinds[info.kind] = (report.figureKinds[info.kind] || 0) + 1;
  return info;
}

async function exerciseControls(page, deck, slide) {
  const prefix = `${deck.id}#${slide}`;
  for (const selector of ['#notes', '#prompt']) {
    try {
      await page.click(selector);
      await page.waitForSelector('#panel[open]');
      const panel = await page.evaluate(() => ({
        title: document.querySelector('#panel-title')?.textContent.trim(),
        body: document.querySelector('#panel-body')?.textContent.trim(),
        notes: document.querySelector('.notes-text')?.textContent.trim() || '',
        prompt: document.querySelector('.prompt-text')?.value || ''
      }));
      if (!panel.title || !panel.body) addError(`${prefix}: ${selector} opened an empty panel`);
      if (selector === '#notes' && !panel.notes) addError(`${prefix}: notes panel has no facilitator notes content`);
      // A slide may intentionally omit a prompt. The control and panel remain
      // covered by this interaction check; prompt content is not asserted here.
      await page.click('#close-panel');
      await page.waitForFunction(() => !document.querySelector('#panel')?.open);
    } catch (error) {
      addError(`${prefix}: ${selector} interaction failed: ${error.message}`);
      if (await page.locator('#panel[open]').count()) await page.keyboard.press('Escape').catch(() => {});
    }
  }
}

async function scanDeck(page, deck, mode) {
  let count;
  try {
    count = await deckSize(page, deck);
  } catch (error) {
    addError(`${deck.id}: could not open deck: ${error.message}`);
    return;
  }
  report.decks.push({ id: deck.id, label: deck.label, slides: count, mode });
  if (mode === 'desktop') report.uniqueSlides += count;
  for (let slide = 1; slide <= count; slide += 1) {
    try {
      await openSlide(page, deck, slide);
      const info = await inspectSlide(page, deck, slide, mode);
      if (!representativeKinds[mode].has(info.kind)) {
        representativeKinds[mode].add(info.kind);
        const screenshotPath = path.join(out, `${mode}-${info.kind}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: mode === 'mobile' });
        report.representativeScreenshots.push({ mode, kind: info.kind, deck: deck.id, slide, path: screenshotPath });
      }
      if (mode === 'desktop') await exerciseControls(page, deck, slide);
    } catch (error) {
      addError(`${deck.id}#${slide}: render failed: ${error.message}`);
    }
  }
}

async function capture(page, name, deck, slide) {
  try {
    await openSlide(page, deck, slide);
    await page.screenshot({ path: path.join(out, `${name}-1440.png`) });
  } catch (error) {
    addError(`screenshot ${name} failed: ${error.message}`);
  }
}

async function main() {
  let browser;
  let desktop;
  let mobile;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ reducedMotion: 'reduce', viewport: desktopViewport });
    desktop = await context.newPage();
    desktop.on('pageerror', error => addError(`pageerror: ${error.message}`));
    desktop.on('console', message => { if (message.type() === 'error') addError(`console: ${message.text()}`); });
    desktop.on('requestfailed', request => addError(`request failed: ${request.url()} (${request.failure()?.errorText || 'unknown'})`));
    for (const deck of decks) await scanDeck(desktop, deck, 'desktop');

    const mobileContext = await browser.newContext({ reducedMotion: 'reduce', viewport: mobileViewport, deviceScaleFactor: 2 });
    mobile = await mobileContext.newPage();
    mobile.on('pageerror', error => addError(`mobile pageerror: ${error.message}`));
    mobile.on('console', message => { if (message.type() === 'error') addError(`mobile console: ${message.text()}`); });
    mobile.on('requestfailed', request => addError(`mobile request failed: ${request.url()} (${request.failure()?.errorText || 'unknown'})`));
    for (const deck of decks) await scanDeck(mobile, deck, 'mobile');

    const screenshots = [
      ['framework-01', decks[0], 1],
      ['framework-hub', decks[0], 1],
      ['s1d3-hero', decks[1], 1],
      ['s1d3-layers', decks[1], 5],
      ['s1d3-handoff-timer', decks[1], 13],
      ['s1d3-02', decks[1], 2],
      ['s1d3-12', decks[1], 12],
      ['s2d2-09', decks[7], 9],
      ['s1d1-proof-handoff', decks[4], 4]
    ];
    for (const [name, deck, slide] of screenshots) await capture(desktop, name, deck, slide);
    await openSlide(desktop, decks[1], 12);
    await desktop.click('#notes');
    await desktop.waitForSelector('#panel[open]');
    await desktop.screenshot({ path: path.join(out, 'notes-dialog-1440.png') });
    await desktop.click('#close-panel');
    await openSlide(desktop, decks[1], 12);
    await desktop.click('#prompt');
    await desktop.waitForSelector('#panel[open]');
    await desktop.screenshot({ path: path.join(out, 'prompt-dialog-1440.png') });
  } catch (error) {
    addError(`fatal visual gate error: ${error.stack || error.message}`);
  } finally {
    if (desktop) await desktop.close().catch(() => {});
    if (mobile) await mobile.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  }
  const totalRenders = report.viewportRenders.desktop + report.viewportRenders.mobile;
  console.log(`rendered ${report.uniqueSlides} unique slides in ${totalRenders} viewport renders · figure kinds ${JSON.stringify(report.figureKinds)}`);
  console.log(`errors: ${errors.length}`);
  errors.forEach(error => console.log(` - ${error}`));
  process.exitCode = errors.length ? 1 : 0;
}

main();
