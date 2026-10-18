import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Pc/.gemini/antigravity/brain/2623d3b0-8ed7-4099-913d-9274364403ee';

async function runStage4Demo() {
  console.log('--- Launching Browser for Stage 4 Live Demonstration Verification ---');
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    console.log('Using Microsoft Edge');
  } catch (e1) {
    try {
      browser = await chromium.launch({ channel: 'chrome', headless: true });
      console.log('Using Google Chrome');
    } catch (e2) {
      browser = await chromium.launch({ headless: true });
      console.log('Using Chromium');
    }
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('[Browser Console Error]:', msg.text());
      errors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    console.error('[Browser Page Error]:', err.message);
    errors.push(err.message);
  });

  // Step 1: Open app
  console.log('Step 1: Loading application...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Step 2: Navigate to Design Workspace
  console.log('Step 2: Opening Design Workspace...');
  const workspaceBtn = page.locator('button:has-text("Design Workspace")').first();
  if (await workspaceBtn.isVisible()) {
    await workspaceBtn.click();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'demo_01_workspace_45mm.png') });
  console.log('Saved demo_01_workspace_45mm.png');

  // Step 3: Verify initial parameters (d = 45 mm)
  console.log('Step 3: Checking initial telemetry at d=45mm...');
  const diameterInput = page.locator('input[type="number"]').first();
  const initialDia = await diameterInput.inputValue();
  console.log(`Initial diameter input value: ${initialDia} mm`);

  // Step 4: Change diameter to 50 mm
  console.log('Step 4: Changing diameter to 50 mm...');
  await diameterInput.fill('50');
  await diameterInput.press('Tab');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'demo_02_workspace_50mm.png') });
  console.log('Saved demo_02_workspace_50mm.png');

  // Step 5: Check Calculations Page (Mathematical Derivations)
  console.log('Step 5: Inspecting Mathematical Calculations page...');
  const calcNav = page.locator('button:has-text("Calculations")').first();
  if (await calcNav.isVisible()) {
    await calcNav.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'demo_03_calculations_derivations.png') });
    console.log('Saved demo_03_calculations_derivations.png');
  }

  // Step 6: Ask offline Copilot to check shaft design
  console.log('Step 6: Querying Copilot "Check this shaft design."...');
  // Navigate back to workspace
  await workspaceBtn.click();
  await page.waitForTimeout(600);

  const copilotInput = page.locator('input[placeholder*="Ask Copilot"]');
  if (await copilotInput.isVisible()) {
    await copilotInput.fill('Check this shaft design.');
    await page.locator('form button[type="submit"]').click();
    console.log('Waiting for Copilot response...');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'demo_04_copilot_result.png') });
    console.log('Saved demo_04_copilot_result.png');
  }

  // Step 7: Open Engineering Analysis Charts
  console.log('Step 7: Opening Engineering Analysis charts...');
  const analysisNav = page.locator('button:has-text("Engineering Analysis")').first();
  if (await analysisNav.isVisible()) {
    await analysisNav.click();
    await page.waitForTimeout(1000);
    const runSimBtn = page.locator('button:has-text("Run New Analysis"), button:has-text("Run Full Simulation")').first();
    if (await runSimBtn.isVisible()) {
      await runSimBtn.click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'demo_05_analysis_charts.png') });
    console.log('Saved demo_05_analysis_charts.png');
  }

  // Step 8: Open Reports Page and Generate Report
  console.log('Step 8: Opening Reports page and generating report...');
  const reportsNav = page.locator('button:has-text("Reports")').first();
  if (await reportsNav.isVisible()) {
    await reportsNav.click();
    await page.waitForTimeout(800);
    const genReportBtn = page.locator('button:has-text("Generate Engineering Report")');
    if (await genReportBtn.isVisible()) {
      await genReportBtn.click();
      await page.waitForTimeout(2200);
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'demo_06_generated_report.png') });
    console.log('Saved demo_06_generated_report.png');
  }

  // Step 9: Test Mobile Viewport (390x844)
  console.log('Step 9: Testing Mobile Viewport (390x844)...');
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobilePage.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);

  // If Copilot is open on mobile, minimize it
  const minimizeCopilot = mobilePage.locator('button[title="Minimize"]');
  if (await minimizeCopilot.isVisible()) {
    console.log('Minimizing mobile Copilot overlay...');
    await minimizeCopilot.click();
    await mobilePage.waitForTimeout(500);
  }

  // Navigate using mobile navigation menu
  const menuBtn = mobilePage.locator('button[title="Toggle Navigation Menu"]');
  if (await menuBtn.isVisible()) {
    console.log('Opening mobile navigation menu...');
    await menuBtn.click();
    await mobilePage.waitForTimeout(500);
    const mobileWorkspace = mobilePage.locator('button:has-text("Design Workspace")').first();
    if (await mobileWorkspace.isVisible()) {
      await mobileWorkspace.click();
      await mobilePage.waitForTimeout(500);
    }
  }

  await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'demo_07_mobile_workspace.png') });
  console.log('Saved demo_07_mobile_workspace.png');
  await mobilePage.close();

  await page.close();
  await browser.close();

  console.log('\n=== LIVE DEMO EXECUTION COMPLETE ===');
  console.log(`Errors encountered: ${errors.length}`);
}

runStage4Demo().catch(err => {
  console.error('Demo execution error:', err);
  process.exit(1);
});
