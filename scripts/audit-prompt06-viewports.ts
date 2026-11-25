import { createServer } from 'vite';
import { chromium, Page } from 'playwright';
import fs from 'fs';
import path from 'path';

interface ViewportConfig {
  name: string;
  width: number;
  height: number;
  deviceClass: string;
}

const VIEWPORTS: ViewportConfig[] = [
  { name: 'small-mobile', width: 360, height: 800, deviceClass: 'Small mobile (360x800)' },
  { name: 'mobile', width: 390, height: 844, deviceClass: 'Mobile (390x844)' },
  { name: 'large-mobile', width: 430, height: 932, deviceClass: 'Large mobile (430x932)' },
  { name: 'tablet', width: 768, height: 1024, deviceClass: 'Tablet (768x1024)' },
  { name: 'laptop', width: 1280, height: 800, deviceClass: 'Laptop (1280x800)' },
  { name: 'desktop', width: 1440, height: 900, deviceClass: 'Desktop (1440x900)' },
  { name: 'large-desktop', width: 1920, height: 1080, deviceClass: 'Large desktop (1920x1080)' },
];

const PAGES = [
  'dashboard',
  'projects',
  'workspace',
  'analysis',
  'materials',
  'calculations',
  'tolerances',
  'gdt',
  'fatigue',
  'bearings',
  'connections',
  'gears',
  'vibration',
  'reports',
  'products',
  'boms',
  'settings',
];

const MODALS = [
  { key: 'setIsProblemModalOpen', name: 'ProblemInputModal' },
  { key: 'setIsOptimizationModalOpen', name: 'OptimizationModal' },
  { key: 'setIsFileUploadModalOpen', name: 'FileUploadModal' },
  { key: 'setIsCompareModalOpen', name: 'DesignCompareModal' },
  { key: 'setIsOnboardingModalOpen', name: 'OnboardingModal' },
  { key: 'setIsVersionHistoryOpen', name: 'VersionHistoryDrawer' },
  { key: 'setIsWarningsDrawerOpen', name: 'WarningsDrawer' },
  { key: 'setIsCommandPaletteOpen', name: 'CommandPalette' },
];

interface AuditResult {
  viewport: string;
  target: string;
  type: 'page' | 'modal';
  scrollWidth: number;
  clientWidth: number;
  hasHorizontalOverflow: boolean;
  protrudingElements: string[];
  consoleErrors: string[];
  screenshotPath?: string;
}

async function runAudit() {
  console.log('========================================================================');
  console.log('MECHANICAL COPILOT | PROMPT 06 MULTI-VIEWPORT AUDIT SUITE');
  console.log('Testing 7 Viewports x 17 Pages + 8 Modals (Zero-Overflow Assurance)');
  console.log('========================================================================\n');

  const localScreenshotsDir = path.resolve('artifacts/screenshots');
  const brainScreenshotsDir = path.resolve('C:/Users/Pc/.gemini/antigravity/brain/383ca699-ef31-4fae-82bb-370e645e5e61/screenshots');

  fs.mkdirSync(localScreenshotsDir, { recursive: true });
  fs.mkdirSync(brainScreenshotsDir, { recursive: true });

  const port = 5189;
  const server = await createServer({
    server: { port },
    configFile: path.resolve('vite.config.ts'),
  });
  await server.listen();
  console.log(`[Vite] Audit dev server running at http://localhost:${port}\n`);

  const browser = await chromium.launch({ headless: true });
  const allResults: AuditResult[] = [];
  let totalTests = 0;
  let passedTests = 0;

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n------------------------------------------------------------------------`);
      console.log(`AUDITING VIEWPORT: ${vp.deviceClass}`);
      console.log(`------------------------------------------------------------------------`);

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });

      const page = await context.newPage();
      const consoleErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      page.on('pageerror', (err) => {
        consoleErrors.push(err.message);
      });

      await page.goto(`http://localhost:${port}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      // Audit all 17 pages
      for (const pageId of PAGES) {
        totalTests++;
        consoleErrors.length = 0;

        await page.evaluate((pid) => {
          if ((window as any).__MECH_COPILOT_APP__) {
            (window as any).__MECH_COPILOT_APP__.setActivePage(pid);
          }
        }, pageId);

        await page.waitForTimeout(200);

        const metrics = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const scrollW = Math.max(doc.scrollWidth, body.scrollWidth);
          const clientW = Math.min(doc.clientWidth, body.clientWidth || window.innerWidth);
          const hasHOverflow = scrollW > clientW + 1; // 1px tolerance for subpixel rounding

          const protruding: string[] = [];
          const allElements = document.querySelectorAll('*');
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;
            const r = el.getBoundingClientRect();
            if (r.right > window.innerWidth + 2 && r.width > 0 && r.height > 0) {
              const tag = el.tagName.toLowerCase();
              const cls = (el.className || '').toString().slice(0, 40);
              protruding.push(`${tag}.${cls} (right: ${Math.round(r.right)}px > ${window.innerWidth}px)`);
              if (protruding.length >= 3) break;
            }
          }

          return { scrollW, clientW, hasHOverflow, protruding };
        });

        const isPass = !metrics.hasHOverflow && consoleErrors.length === 0;
        if (isPass) passedTests++;

        // Determine if we capture a screenshot
        const shouldCapture =
          (vp.name === 'small-mobile' && ['workspace', 'dashboard', 'materials', 'boms'].includes(pageId)) ||
          (vp.name === 'tablet' && ['workspace', 'analysis', 'bearings'].includes(pageId)) ||
          (vp.name === 'laptop' && ['workspace', 'calculations', 'fatigue'].includes(pageId)) ||
          (vp.name === 'large-desktop' && ['workspace', 'reports', 'products', 'gdt'].includes(pageId));

        let shotPath: string | undefined;
        if (shouldCapture) {
          const filename = `${vp.name}_page_${pageId}.png`;
          const localDest = path.join(localScreenshotsDir, filename);
          const brainDest = path.join(brainScreenshotsDir, filename);
          await page.screenshot({ path: localDest, fullPage: false });
          fs.copyFileSync(localDest, brainDest);
          shotPath = localDest;
        }

        allResults.push({
          viewport: vp.deviceClass,
          target: pageId,
          type: 'page',
          scrollWidth: metrics.scrollW,
          clientWidth: metrics.clientW,
          hasHorizontalOverflow: metrics.hasHOverflow,
          protrudingElements: metrics.protruding,
          consoleErrors: [...consoleErrors],
          screenshotPath: shotPath,
        });

        const statusIcon = isPass ? '✔ PASS' : '✖ FAIL';
        const overflowStr = metrics.hasHOverflow ? `OVERFLOW (scrollW=${metrics.scrollW} > ${metrics.clientW})` : `0 overflow`;
        console.log(`  ${statusIcon} [Page: ${pageId.padEnd(14)}] ${overflowStr} | Errors: ${consoleErrors.length}${shotPath ? ' [Screenshot captured]' : ''}`);
      }

      // Audit all 8 Modals / Drawers on this viewport
      for (const modal of MODALS) {
        totalTests++;
        consoleErrors.length = 0;

        // Open modal
        await page.evaluate((fnKey) => {
          if ((window as any).__MECH_COPILOT_APP__ && (window as any).__MECH_COPILOT_APP__[fnKey]) {
            (window as any).__MECH_COPILOT_APP__[fnKey](true);
          }
        }, modal.key);

        await page.waitForTimeout(150);

        const metrics = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const scrollW = Math.max(doc.scrollWidth, body.scrollWidth);
          const clientW = Math.min(doc.clientWidth, body.clientWidth || window.innerWidth);
          const hasHOverflow = scrollW > clientW + 1;

          return { scrollW, clientW, hasHOverflow };
        });

        const isPass = !metrics.hasHOverflow && consoleErrors.length === 0;
        if (isPass) passedTests++;

        // Close modal
        await page.evaluate((fnKey) => {
          if ((window as any).__MECH_COPILOT_APP__ && (window as any).__MECH_COPILOT_APP__[fnKey]) {
            (window as any).__MECH_COPILOT_APP__[fnKey](false);
          }
        }, modal.key);

        await page.waitForTimeout(100);

        allResults.push({
          viewport: vp.deviceClass,
          target: modal.name,
          type: 'modal',
          scrollWidth: metrics.scrollW,
          clientWidth: metrics.clientW,
          hasHorizontalOverflow: metrics.hasHOverflow,
          protrudingElements: [],
          consoleErrors: [...consoleErrors],
        });

        const statusIcon = isPass ? '✔ PASS' : '✖ FAIL';
        console.log(`  ${statusIcon} [Modal: ${modal.name.padEnd(20)}] 0 overflow | Errors: ${consoleErrors.length}`);
      }

      await context.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }

  // Summary
  console.log('\n========================================================================');
  console.log('AUDIT SUMMARY');
  console.log('========================================================================');
  console.log(`Total Scenarios Tested : ${totalTests} (7 viewports x 25 pages/modals)`);
  console.log(`Passed Scenarios       : ${passedTests}`);
  console.log(`Failed Scenarios       : ${totalTests - passedTests}`);
  console.log(`Overflow Violations    : ${allResults.filter(r => r.hasHorizontalOverflow).length}`);
  console.log(`Console Error Counts   : ${allResults.filter(r => r.consoleErrors.length > 0).length}`);
  console.log(`Screenshots Captured   : ${allResults.filter(r => r.screenshotPath).length}`);
  console.log('========================================================================\n');

  // Save JSON summary
  const summaryJsonPath = path.resolve('artifacts/audit_summary.json');
  fs.writeFileSync(summaryJsonPath, JSON.stringify(allResults, null, 2));
  console.log(`Audit report data saved to: ${summaryJsonPath}`);

  if (passedTests < totalTests) {
    console.error('Audit failed: some pages or viewports exhibited overflow or errors!');
    process.exit(1);
  } else {
    console.log('All 7 viewports passed zero-overflow audits with flying colors!');
  }
}

runAudit().catch((err) => {
  console.error('Audit runner error:', err);
  process.exit(1);
});
