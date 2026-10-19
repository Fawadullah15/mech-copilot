import { chromium } from 'playwright';

const viewports = [
  { width: 1280, height: 720, name: '1280x720' },
  { width: 1366, height: 768, name: '1366x768' },
  { width: 1440, height: 900, name: '1440x900' },
  { width: 1600, height: 900, name: '1600x900' },
  { width: 1920, height: 1080, name: '1920x1080' },
];

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

async function runComprehensiveVerification() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  let totalChecks = 0;
  let passedChecks = 0;
  let failures = [];

  for (const vp of viewports) {
    console.log(`\n========================================`);
    console.log(`VERIFYING VIEWPORT: ${vp.name} (${vp.width}x${vp.height})`);
    console.log(`========================================`);

    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });

    for (const pageName of pages) {
      if (pageName !== 'dashboard') {
        await page.evaluate((name) => {
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
        await page.waitForTimeout(150);
      }

      const res = await page.evaluate((vpHeight) => {
        const doc = document.documentElement;
        const body = document.body;
        const main = document.querySelector('main');
        const header = document.querySelector('header');
        const aside = document.querySelector('aside');
        const rootDiv = document.querySelector('#root > div');

        const docHOverflow = doc.scrollWidth > doc.clientWidth;
        const bodyHOverflow = body.scrollWidth > body.clientWidth;
        const mainHOverflow = main ? main.scrollWidth > main.clientWidth : false;
        const headerTop = header ? header.getBoundingClientRect().top : -999;
        const asideTop = aside ? aside.getBoundingClientRect().top : -999;
        const asideHeight = aside ? aside.getBoundingClientRect().height : -999;
        const appContainerScrollTop = rootDiv ? rootDiv.scrollTop : -999;

        return {
          docHOverflow,
          bodyHOverflow,
          mainHOverflow,
          headerTop,
          asideTop,
          asideHeight,
          appContainerScrollTop,
          docScrollW: doc.scrollWidth,
          docClientW: doc.clientWidth,
          mainScrollW: main?.scrollWidth,
          mainClientW: main?.clientWidth,
        };
      }, vp.height);

      totalChecks += 5;

      const check1 = !res.docHOverflow;
      const check2 = !res.bodyHOverflow;
      const check3 = !res.mainHOverflow;
      const check4 = res.headerTop === 0 && res.asideTop === 0;
      const check5 = res.appContainerScrollTop === 0;

      if (check1 && check2 && check3 && check4 && check5) {
        passedChecks += 5;
        // Passed
      } else {
        const failureDetails = {
          viewport: vp.name,
          page: pageName,
          check1,
          check2,
          check3,
          check4,
          check5,
          res,
        };
        failures.push(failureDetails);
        console.error(`  FAIL [${pageName}]:`, failureDetails);
      }
    }

    console.log(`  All 15 pages passed at ${vp.name}!`);
    await page.close();
  }

  await browser.close();

  console.log(`\n========================================`);
  console.log(`FINAL RESULT: ${passedChecks} / ${totalChecks} checks passed`);
  console.log(`Failures: ${failures.length}`);
  console.log(`========================================\n`);

  if (failures.length > 0) {
    process.exit(1);
  }
}

runComprehensiveVerification().catch((e) => {
  console.error(e);
  process.exit(1);
});
