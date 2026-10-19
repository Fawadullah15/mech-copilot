import { chromium } from 'playwright';

const pages = [
  'dashboard',
  'workspace',
  'analysis',
  'calculations',
  'materials',
  'tolerances',
  'gdt',
  'fatigue',
  'bearings',
  'connections',
  'gears',
  'vibration',
  'reports',
  'projects',
  'settings',
];

async function run() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  for (const pageName of pages) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });

    // Click navigation button for this page if not dashboard
    if (pageName !== 'dashboard') {
      const btn = await page.$(`button[title*="${pageName}" i], button[title*="${pageName.slice(0, 4)}" i]`);
      // or click sidebar item by navigating context or clicking button with title
      await page.evaluate((name) => {
        // AppContext exposes setActivePage or click sidebar
        const navBtns = Array.from(document.querySelectorAll('aside nav button'));
        const target = navBtns.find(b => {
          const t = b.getAttribute('title')?.toLowerCase() || '';
          return t.includes(name) || (name === 'workspace' && t.includes('design workspace'))
            || (name === 'analysis' && t.includes('engineering analysis'))
            || (name === 'calculations' && t.includes('calculation'))
            || (name === 'materials' && t.includes('materials'))
            || (name === 'tolerances' && t.includes('tolerances'))
            || (name === 'gdt' && t.includes('gd&t'))
            || (name === 'fatigue' && t.includes('fatigue'))
            || (name === 'bearings' && t.includes('bearings'))
            || (name === 'connections' && t.includes('connections'))
            || (name === 'gears' && t.includes('gears'))
            || (name === 'vibration' && t.includes('vibration'))
            || (name === 'reports' && t.includes('reports'))
            || (name === 'projects' && t.includes('projects'))
            || (name === 'settings' && t.includes('settings'));
        });
        if (target) target.click();
      }, pageName);
      await page.waitForTimeout(300);
    }

    const info = await page.evaluate(() => {
      const doc = document.documentElement;
      const main = document.querySelector('main');
      const overflowing = [];
      document.querySelectorAll('*').forEach(el => {
        // Ignore deliberate horizontally scrollable elements (like SUGGESTED_PROMPTS strip or tables with overflow-x-auto)
        const style = window.getComputedStyle(el);
        const isScrollable = style.overflowX === 'auto' || style.overflowX === 'scroll';
        if (!isScrollable && el.scrollWidth > el.clientWidth + 1) {
          overflowing.push({
            tag: el.tagName,
            cls: el.className ? String(el.className).slice(0, 60) : '',
            scrollW: el.scrollWidth,
            clientW: el.clientWidth,
            diff: el.scrollWidth - el.clientWidth,
          });
        }
      });
      return {
        docScroll: doc.scrollWidth > doc.clientWidth,
        mainScroll: main ? main.scrollWidth > main.clientWidth : false,
        mainScrollW: main?.scrollWidth,
        mainClientW: main?.clientWidth,
        overflowing: overflowing.slice(0, 5),
      };
    });

    console.log(`Page [${pageName}] 1280x720: docHScroll=${info.docScroll}, mainHScroll=${info.mainScroll} (client=${info.mainClientW}, scroll=${info.mainScrollW}), nonScrollableOverflows=${info.overflowing.length}`);
    if (info.overflowing.length > 0) {
      info.overflowing.forEach(o => console.log(`   - ${o.tag}.${o.cls} (+${o.diff}px)`));
    }

    await page.screenshot({ path: `page-${pageName}-1280x720.png` });
    await page.close();
  }

  await browser.close();
}

run().catch(console.error);
