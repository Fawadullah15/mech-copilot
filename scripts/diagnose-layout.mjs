import { chromium } from 'playwright';

async function diagnose() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const viewports = [
    { width: 1280, height: 720, name: '1280x720' },
    { width: 1366, height: 768, name: '1366x768' },
    { width: 1440, height: 900, name: '1440x900' },
    { width: 1600, height: 900, name: '1600x900' },
    { width: 1920, height: 1080, name: '1920x1080' },
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    
    // Evaluate overflow metrics
    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const root = document.getElementById('root');
      const main = document.querySelector('main');
      const aside = document.querySelector('aside');
      const header = document.querySelector('header');
      const copilot = document.querySelector('aside ~ div > div > div:last-child'); // Copilot panel

      // Find any elements causing horizontal overflow
      const overflowingElements = [];
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if (el.scrollWidth > el.clientWidth + 1) {
          overflowingElements.push({
            tag: el.tagName,
            id: el.id,
            className: el.className ? String(el.className).slice(0, 80) : '',
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
            diff: el.scrollWidth - el.clientWidth,
          });
        }
      }

      return {
        windowInnerWidth: window.innerWidth,
        windowInnerHeight: window.innerHeight,
        docScrollWidth: doc.scrollWidth,
        docClientWidth: doc.clientWidth,
        docScrollHeight: doc.scrollHeight,
        docClientHeight: doc.clientHeight,
        bodyScrollWidth: body.scrollWidth,
        bodyClientWidth: body.clientWidth,
        bodyScrollHeight: body.scrollHeight,
        bodyClientHeight: body.clientHeight,
        rootScrollWidth: root?.scrollWidth,
        rootClientWidth: root?.clientWidth,
        rootScrollHeight: root?.scrollHeight,
        rootClientHeight: root?.clientHeight,
        mainScrollWidth: main?.scrollWidth,
        mainClientWidth: main?.clientWidth,
        mainScrollHeight: main?.scrollHeight,
        mainClientHeight: main?.clientHeight,
        asideHeight: aside?.getBoundingClientRect().height,
        headerHeight: header?.getBoundingClientRect().height,
        overflowingElementsCount: overflowingElements.length,
        topOverflowing: overflowingElements.slice(0, 10),
      };
    });

    console.log(`=== VIEWPORT ${vp.name} ===`);
    console.log(`Doc: client=${metrics.docClientWidth}x${metrics.docClientHeight}, scroll=${metrics.docScrollWidth}x${metrics.docScrollHeight}`);
    console.log(`Body: client=${metrics.bodyClientWidth}x${metrics.bodyClientHeight}, scroll=${metrics.bodyScrollWidth}x${metrics.bodyScrollHeight}`);
    console.log(`Root: client=${metrics.rootClientWidth}x${metrics.rootClientHeight}, scroll=${metrics.rootScrollWidth}x${metrics.rootScrollHeight}`);
    console.log(`Main: client=${metrics.mainClientWidth}x${metrics.mainClientHeight}, scroll=${metrics.mainScrollWidth}x${metrics.mainScrollHeight}`);
    console.log(`Aside height: ${metrics.asideHeight}, Header height: ${metrics.headerHeight}`);
    console.log(`Overflowing elements (${metrics.overflowingElementsCount}):`);
    metrics.topOverflowing.forEach(o => console.log(`  - ${o.tag} .${o.className}: scroll=${o.scrollWidth} > client=${o.clientWidth} (+${o.diff}px)`));

    await page.screenshot({ path: `diagnose-${vp.name}.png` });
    await page.close();
  }

  await browser.close();
}

diagnose().catch(console.error);
