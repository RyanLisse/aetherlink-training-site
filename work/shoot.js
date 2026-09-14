// Browser regression gate and representative screenshots for the AetherLink site.
// usage: node work/shoot.js [outdir]
//
// Every slide of every deck is rendered at three sizes — 1440x900 presenter,
// 390x844 phone and 360x740 small phone — with reduced motion on, and checked
// for: page/console errors, failed images, a missing template, "Do this now"
// left on a slide, a slide past the presenter fold, horizontal overflow on a
// phone, a tap target under 40px, unreduced motion, and AetherBOT overlapping
// anything. One screenshot per template per size lands in the out directory
// next to report.json.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const out = process.argv[2] || path.join(__dirname, 'shots');
const base = process.env.SHOOT_BASE || 'http://127.0.0.1:8080/';
const desktopViewport = { width: 1440, height: 900 };
const mobileViewport = { width: 390, height: 844 };
const smallViewport = { width: 360, height: 740 };
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
  viewports: { desktop: desktopViewport, mobile: mobileViewport, small: smallViewport },
  reducedMotion: true,
  decks: [],
  uniqueSlides: 0,
  viewportRenders: { desktop: 0, mobile: 0, small: 0 },
  templates: {},
  representativeScreenshots: [],
  errors
};
const representativeKinds = { desktop: new Set(), mobile: new Set(), small: new Set() };
const widthFor = mode => (mode === 'desktop' ? desktopViewport.width : mode === 'small' ? smallViewport.width : mobileViewport.width);

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
    const motionIssues = [];
    const nonZeroDuration = value => value.split(',').some(part => Number.parseFloat(part) > 0);
    [...document.querySelectorAll('.tpl-bot, .tpl, .tpl *')].filter(visible).forEach((element, index) => {
      const style = getComputedStyle(element);
      if (style.animationName !== 'none' || nonZeroDuration(style.transitionDuration)) {
        motionIssues.push(`visible motion element ${index + 1} is not reduced`);
      }
    });
    /* AetherBOT lives in the template's own gutter. He may never touch text. */
    const botIssues = [];
    document.querySelectorAll('.tpl-bot').forEach((bot, index) => {
      const botRect = bot.getBoundingClientRect();
      if (!bot.closest('.tpl.has-bot')) { botIssues.push(`bot ${index + 1} is outside a template gutter`); return; }
      document.querySelectorAll('#stage h1, #stage h2, #stage h3, #stage h4, #stage p, #stage li, #stage span, #stage button, #stage figcaption, #stage svg text').forEach(text => {
        if (text === bot || text.closest('.tpl-bot') || !visible(text)) return;
        if (intersects(botRect, text.getBoundingClientRect())) botIssues.push(`bot ${index + 1} overlaps text: ${text.textContent.trim().slice(0, 60)}`);
      });
    });
    /* Touch targets: the day bar is a thin line by design and carries its own
       41px hit area, so it is the one exception. */
    const smallControls = [...document.querySelectorAll('button, .guide-link')]
      .filter(el => visible(el) && !el.classList.contains('seg') && el.getBoundingClientRect().height < 40)
      .map(el => (el.id || el.className || el.textContent || '').toString().trim().slice(0, 30));
    const desktopHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    const horizontalWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const controls = ['#notes', '#prompt'].map(selector => {
      const element = document.querySelector(selector);
      return { selector, present: !!element, visible: !!element && visible(element) };
    });
    return {
      kind: document.querySelector('.slide-body .tpl')?.dataset.template
        || (document.querySelector('.widget') ? 'widget'
          : document.querySelector('.phase-row') ? 'phases'
          : document.querySelector('.diagram-layout') ? 'adoption' : 'none'),
      smallControls,
      images,
      svgIssues,
      motionIssues,
      botIssues,
      desktopHeight,
      horizontalWidth,
      viewportWidth,
      controls,
      doOnSlide: !!document.querySelector('#stage .exercise-instructions'),
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    };
  }, { mode, viewportWidth: widthFor(mode) });

  const prefix = `${deck.id}#${slide}`;
  if (!info.reducedMotion) addError(`${prefix}: reduced-motion media query is not active`);
  if (info.doOnSlide) addError(`${prefix}: Do-this-now instructions leaked onto the slide`);
  if (info.kind === 'none') addError(`${prefix}: slide resolved to no template`);
  if (mode !== 'desktop') info.smallControls.forEach(c => addError(`${prefix}: control under 40px: ${c}`));
  info.images.filter(image => !image.loaded).forEach(image => addError(`${prefix}: image failed to load: ${image.src}`));
  info.svgIssues.forEach(issue => addError(`${prefix}: ${issue}`));
  info.motionIssues.forEach(issue => addError(`${prefix}: ${issue}`));
  info.botIssues.forEach(issue => addError(`${prefix}: ${issue}`));
  info.controls.filter(control => !control.present || !control.visible).forEach(control => addError(`${prefix}: ${control.selector} control is missing or hidden`));
  if (mode === 'desktop' && info.desktopHeight > desktopViewport.height + 4) {
    addError(`${prefix}: desktop document is ${info.desktopHeight}px tall (viewport ${desktopViewport.height}px)`);
  }
  if (mode !== 'desktop' && info.horizontalWidth > widthFor(mode) + 1) {
    addError(`${prefix}: ${mode} document is ${info.horizontalWidth}px wide (viewport ${widthFor(mode)}px)`);
  }
  report.viewportRenders[mode] += 1;
  report.templates[info.kind] = (report.templates[info.kind] || 0) + 1;
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
        await page.screenshot({ path: screenshotPath, fullPage: mode !== 'desktop' });
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

    for (const [mode, viewport] of [['mobile', mobileViewport], ['small', smallViewport]]) {
      const phoneContext = await browser.newContext({ reducedMotion: 'reduce', viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      const phone = await phoneContext.newPage();
      phone.on('pageerror', error => addError(`${mode} pageerror: ${error.message}`));
      phone.on('console', message => { if (message.type() === 'error') addError(`${mode} console: ${message.text()}`); });
      phone.on('requestfailed', request => addError(`${mode} request failed: ${request.url()} (${request.failure()?.errorText || 'unknown'})`));
      for (const deck of decks) await scanDeck(phone, deck, mode);
      if (mode === 'mobile') mobile = phone; else await phone.close().catch(() => {});
    }

    const screenshots = [
      ['framework-01', decks[0], 1],
      ['s1d3-cover', decks[1], 1],
      ['s1d3-columns', decks[1], 2],
      ['s1d3-figure', decks[1], 3],
      ['s1d3-stack', decks[1], 4],
      ['s1d3-chain', decks[1], 11],
      ['s1d3-list', decks[1], 12],
      ['s1d3-gate', decks[1], 15],
      ['s1d3-grid', decks[1], 19],
      ['s1d5-arc', decks[3], 2],
      ['s2d2-pause', decks[7], 9]
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
  const totalRenders = report.viewportRenders.desktop + report.viewportRenders.mobile + report.viewportRenders.small;
  console.log(`rendered ${report.uniqueSlides} unique slides in ${totalRenders} viewport renders · templates ${JSON.stringify(report.templates)}`);
  console.log(`errors: ${errors.length}`);
  errors.forEach(error => console.log(` - ${error}`));
  process.exitCode = errors.length ? 1 : 0;
}

main();
