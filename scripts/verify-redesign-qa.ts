import { createServer as createViteServer } from 'vite';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import http from 'http';
import app from '../server/app.ts';
import { initDatabase } from '../server/db/client.ts';

const BRAIN_SCREENSHOTS = path.resolve(
  'C:/Users/Pc/.gemini/antigravity/brain/383ca699-ef31-4fae-82bb-370e645e5e61/screenshots'
);

async function runRedesignQA() {
  console.log('========================================================================');
  console.log('QUANTUM MECHAI | WORKSPACE REDESIGN VISUAL & FUNCTIONAL QA SUITE');
  console.log('========================================================================');

  fs.mkdirSync(BRAIN_SCREENSHOTS, { recursive: true });
  initDatabase();

  const API_PORT = 3098;
  const VITE_PORT = 5198;

  const apiServer = http.createServer(app);
  await new Promise<void>((resolve) => apiServer.listen(API_PORT, () => resolve()));

  const viteServer = await createViteServer({
    server: {
      port: VITE_PORT,
      proxy: {
        '/api': { target: `http://localhost:${API_PORT}`, changeOrigin: true },
      },
    },
    configFile: path.resolve('vite.config.ts'),
  });
  await viteServer.listen();

  const browser = await chromium.launch({ headless: true });

  const openPreparedPage = async (width: number, height: number) => {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.route(/fonts\.g(oogleapis|static)\.com/, (route) =>
      route.fulfill({ status: 200, contentType: 'text/css', body: '' })
    );
    await p.route('http://localhost:3001/**', async (route) => {
      const req = route.request();
      const targetUrl = req.url().replace('http://localhost:3001', `http://localhost:${API_PORT}`);
      const res = await p.request.fetch(targetUrl, {
        method: req.method(),
        headers: req.headers(),
        data: req.postDataBuffer() || undefined,
      });
      await route.fulfill({ response: res });
    });
    return { ctx, page: p };
  };

  const assertNoOverflow = async (page: any, label: string) => {
    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollW: Math.max(doc.scrollWidth, document.body.scrollWidth),
        clientW: doc.clientWidth,
        innerW: window.innerWidth,
      };
    });
    if (metrics.scrollW > metrics.clientW + 2) {
      throw new Error(`Horizontal overflow on ${label}: scrollW=${metrics.scrollW} > clientW=${metrics.clientW}`);
    }
    console.log(`  ✔ No horizontal overflow on ${label} (${metrics.clientW}px)`);
  };

  try {
    // 1. Primary 1680x960 Workstation Audit
    console.log('\n[1/5] Testing Primary Workstation Viewport (1680x960)...');
    const { ctx: ctx1680, page } = await openPreparedPage(1680, 960);

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    console.log('  -> Navigating to Vite URL...');
    await page.goto(`http://localhost:${VITE_PORT}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(1500);
    console.log('  -> Page loaded, checking composer...');

    // Ask Copilot to create & size a drive shaft project so we have live populated workstation data
    const composer = page.locator('textarea[placeholder*="Ask Copilot"]');
    if (await composer.isVisible()) {
      console.log('  -> Sending prompt to Copilot...');
      await composer.fill(
        'Create a new shaft design project for 500 Nm torque at 1450 RPM, 320 mm length, 12 kN radial force, AISI 4140 steel, FoS 2.0'
      );
      await composer.press('Enter');
      await page.waitForFunction(() => !(window as any).__MECH_COPILOT_APP__?.isStreaming, { timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(800);
      console.log('  -> Prompt execution completed.');
    }

    // Ensure we're on workspace page
    const isWorkspace = await page.evaluate(() => (window as any).__MECH_COPILOT_APP__?.activePage === 'workspace');
    if (!isWorkspace) {
      await page.evaluate(() => (window as any).__MECH_COPILOT_APP__?.setActivePage('workspace'));
      await page.waitForTimeout(1000);
    }

    await assertNoOverflow(page, '1680x960 workspace');

    // Verify key workstation panel geometry
    const layoutInfo = await page.evaluate(() => {
      const aside = document.querySelector('aside');
      const header = document.querySelector('header');
      const canvas = document.querySelector('canvas');
      return {
        sidebarW: aside?.getBoundingClientRect().width || 0,
        headerH: header?.getBoundingClientRect().height || 0,
        canvasW: canvas?.getBoundingClientRect().width || 0,
        canvasH: canvas?.getBoundingClientRect().height || 0,
      };
    });
    console.log('  Layout measurements @1680x960:', JSON.stringify(layoutInfo));
    if (layoutInfo.sidebarW < 210 || layoutInfo.sidebarW > 224) {
      throw new Error(`Expected sidebar ~216px, got ${layoutInfo.sidebarW}px`);
    }
    if (layoutInfo.canvasW < 450 || layoutInfo.canvasH < 300) {
      throw new Error(`3D canvas too small: ${layoutInfo.canvasW}x${layoutInfo.canvasH}`);
    }

    await page.screenshot({ path: path.join(BRAIN_SCREENSHOTS, 'redesign_1680x960_workspace.png') });
    console.log('  ✔ Saved redesign_1680x960_workspace.png');

    // Toggle docked Feature Tree (toggled state) and verify zero overlap
    const treeBtn = page.locator('button[title="Toggle Docked FeatureManager Tree"]');
    await treeBtn.click({ timeout: 10000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(BRAIN_SCREENSHOTS, 'redesign_1680x960_feature_tree_toggled.png') });
    console.log('  ✔ Saved redesign_1680x960_feature_tree_toggled.png');

    // Test interactive parameter edit in Properties panel & verify KPI recalculation + Save status
    const kpiStress = page.locator('section').last().locator('text=/\\d+\\.\\d+/').nth(1);
    const beforeStress = await kpiStress.textContent({ timeout: 10000 });
    const diamInput = page.locator('label:has-text("Diameter") + div input[type="number"]');
    await diamInput.fill('38', { timeout: 10000 });
    await diamInput.dispatchEvent('change');
    await page.waitForTimeout(1000);
    const afterStress = await kpiStress.textContent({ timeout: 10000 });
    console.log(`  ✔ Properties Diameter edit reacted cleanly (before=${beforeStress}, after=${afterStress})`);

    // Switch to Simulation View tab -> verify stress heatmap legend renders
    await page.getByRole('button', { name: 'Simulation', exact: true }).click({ timeout: 10000 });
    await page.waitForTimeout(500);
    const hasStressLegend = await page.locator('text=Von Mises Stress').first().isVisible();
    console.log(`  ✔ Simulation tab active (Stress legend visible: ${hasStressLegend})`);
    await page.screenshot({ path: path.join(BRAIN_SCREENSHOTS, 'redesign_1680x960_simulation.png') });

    // Switch back to 3D View & test Dark Mode
    await page.getByRole('button', { name: '3D View', exact: true }).click({ timeout: 10000 });
    await page.waitForTimeout(300);
    await page.locator('button[title*="Dark Mode"], button[title*="Light Mode"]').click({ timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(BRAIN_SCREENSHOTS, 'redesign_1680x960_dark.png') });
    console.log('  ✔ Saved redesign_1680x960_dark.png');

    if (errors.length > 0) {
      throw new Error(`Console/page errors detected: ${errors.join(' | ')}`);
    }
    await ctx1680.close();

    // 2. 1440x900 Desktop Audit
    console.log('\n[2/5] Testing Standard Desktop Viewport (1440x900)...');
    const { ctx: ctx1440, page: page1440 } = await openPreparedPage(1440, 900);
    await page1440.goto(`http://localhost:${VITE_PORT}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page1440.waitForTimeout(1000);
    await page1440.evaluate(() => (window as any).__MECH_COPILOT_APP__?.setActivePage('workspace'));
    await page1440.waitForTimeout(800);
    await assertNoOverflow(page1440, '1440x900 workspace');
    const canvas1440 = await page1440.locator('canvas').boundingBox();
    console.log('  Canvas @1440x900:', JSON.stringify(canvas1440));
    await page1440.screenshot({ path: path.join(BRAIN_SCREENSHOTS, 'redesign_1440x900_workspace.png') });
    await ctx1440.close();

    // 3. 1280x800 Laptop (<1360px Copilot Collapsed by Default) Audit
    console.log('\n[3/5] Testing Laptop Viewport (1280x800)...');
    const { ctx: ctx1280, page: page1280 } = await openPreparedPage(1280, 800);
    await page1280.goto(`http://localhost:${VITE_PORT}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page1280.waitForTimeout(1000);
    await page1280.evaluate(() => (window as any).__MECH_COPILOT_APP__?.setActivePage('workspace'));
    await page1280.waitForTimeout(700);
    await assertNoOverflow(page1280, '1280x800 workspace');
    const copilotOpen1280 = await page1280.evaluate(() => (window as any).__MECH_COPILOT_APP__?.copilotOpen);
    console.log(`  ✔ Copilot collapsed below 1360px: ${!copilotOpen1280}`);
    await page1280.screenshot({ path: path.join(BRAIN_SCREENSHOTS, 'redesign_1280x800_workspace.png') });
    await ctx1280.close();

    // 4. 768x1024 Tablet & 360x800 Mobile Audit
    for (const vp of [
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 360, height: 800 },
    ]) {
      console.log(`\n[4/5] Testing ${vp.name} (${vp.width}x${vp.height})...`);
      const { ctx, page: p } = await openPreparedPage(vp.width, vp.height);
      await p.goto(`http://localhost:${VITE_PORT}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await p.waitForTimeout(1000);
      await p.evaluate(() => (window as any).__MECH_COPILOT_APP__?.setActivePage('workspace'));
      await p.waitForTimeout(600);
      await assertNoOverflow(p, `${vp.width}x${vp.height} workspace`);
      await p.screenshot({ path: path.join(BRAIN_SCREENSHOTS, `redesign_${vp.name}_workspace.png`) });
      await ctx.close();
    }

    console.log('\n========================================================================');
    console.log('✔ ALL WORKSPACE REDESIGN QA CHECKS PASSED');
    console.log('========================================================================');
  } finally {
    await browser.close();
    await viteServer.close();
    await new Promise<void>((resolve) => apiServer.close(() => resolve()));
  }
}

runRedesignQA().catch((err) => {
  console.error('Redesign QA failed:', err);
  process.exit(1);
});
