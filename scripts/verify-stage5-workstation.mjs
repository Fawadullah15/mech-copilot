import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Pc/.gemini/antigravity/brain/2623d3b0-8ed7-4099-913d-9274364403ee';

async function runStage5Verification() {
  console.log('=== Stage 5: Live CAD Workstation Playwright Capture ===');
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

  const context = await browser.newContext();
  await context.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());

  // 1. Desktop 1920x1080 - Design Workspace
  console.log('Capturing Desktop 1920x1080 CAD Workspace...');
  const desktopPage = await context.newPage();
  await desktopPage.setViewportSize({ width: 1920, height: 1080 });
  await desktopPage.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await desktopPage.waitForTimeout(1000);

  // Navigate to workspace
  const navWorkspace = desktopPage.locator('button[title*="Workspace"]').first();
  if (await navWorkspace.isVisible()) {
    await navWorkspace.click();
    await desktopPage.waitForTimeout(800);
  }
  await desktopPage.screenshot({ path: path.join(ARTIFACT_DIR, 'stage5_01_workspace_desktop.png') });
  console.log('Saved stage5_01_workspace_desktop.png');

  // 2. Laptop 1366x768 - Design Workspace
  console.log('Capturing Laptop 1366x768 CAD Workspace...');
  const laptopPage = await context.newPage();
  await laptopPage.setViewportSize({ width: 1366, height: 768 });
  await laptopPage.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await laptopPage.waitForTimeout(800);
  const laptopWorkspace = laptopPage.locator('button[title*="Workspace"]').first();
  if (await laptopWorkspace.isVisible()) {
    await laptopWorkspace.click();
    await laptopPage.waitForTimeout(600);
  }
  await laptopPage.screenshot({ path: path.join(ARTIFACT_DIR, 'stage5_02_workspace_laptop.png') });
  console.log('Saved stage5_02_workspace_laptop.png');
  await laptopPage.close();

  // 3. Mobile 390x844 - Mobile CAD View
  console.log('Capturing Mobile 390x844 View...');
  const mobilePage = await context.newPage();
  await mobilePage.setViewportSize({ width: 390, height: 844 });
  await mobilePage.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(800);
  await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'stage5_03_workspace_mobile.png') });
  console.log('Saved stage5_03_workspace_mobile.png');
  await mobilePage.close();

  // 4. Analysis Page (Charts & Telemetry)
  console.log('Capturing Engineering Analysis Page...');
  const analysisBtn = desktopPage.locator('button[title*="Analysis"]').first();
  if (await analysisBtn.isVisible()) {
    await analysisBtn.click();
    await desktopPage.waitForTimeout(800);
  }
  await desktopPage.screenshot({ path: path.join(ARTIFACT_DIR, 'stage5_04_analysis_charts.png') });
  console.log('Saved stage5_04_analysis_charts.png');

  // 5. Calculations Page (Formulas & Derivations)
  console.log('Capturing Engineering Calculations Page...');
  const calcBtn = desktopPage.locator('button[title*="Calculations"]').first();
  if (await calcBtn.isVisible()) {
    await calcBtn.click();
    await desktopPage.waitForTimeout(800);
  }
  await desktopPage.screenshot({ path: path.join(ARTIFACT_DIR, 'stage5_05_calculations.png') });
  console.log('Saved stage5_05_calculations.png');

  // 6. Reports Page (Print / PDF Preview)
  console.log('Capturing Engineering Reports Page...');
  const reportsBtn = desktopPage.locator('button[title*="Reports"]').first();
  if (await reportsBtn.isVisible()) {
    await reportsBtn.click();
    await desktopPage.waitForTimeout(600);
    const generateBtn = desktopPage.locator('button:has-text("Generate Report")').first();
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
      await desktopPage.waitForTimeout(1200);
    }
  }
  await desktopPage.screenshot({ path: path.join(ARTIFACT_DIR, 'stage5_06_reports.png') });
  console.log('Saved stage5_06_reports.png');

  // 7. Dashboard Page (Command Center)
  console.log('Capturing Command Center Dashboard...');
  const dashBtn = desktopPage.locator('button[title*="Command Center"]').first();
  if (await dashBtn.isVisible()) {
    await dashBtn.click();
    await desktopPage.waitForTimeout(800);
  }
  await desktopPage.screenshot({ path: path.join(ARTIFACT_DIR, 'stage5_07_dashboard.png') });
  console.log('Saved stage5_07_dashboard.png');

  // 8. Materials Page (Database & Matrix)
  console.log('Capturing Materials Database Page...');
  const matBtn = desktopPage.locator('button[title*="Materials"]').first();
  if (await matBtn.isVisible()) {
    await matBtn.click();
    await desktopPage.waitForTimeout(800);
  }
  await desktopPage.screenshot({ path: path.join(ARTIFACT_DIR, 'stage5_08_materials.png') });
  console.log('Saved stage5_08_materials.png');

  // 9. Copilot Interaction in Workspace
  console.log('Testing Copilot Offline Calculation & Capturing...');
  if (await navWorkspace.isVisible()) {
    await navWorkspace.click();
    await desktopPage.waitForTimeout(600);
  }
  // Click prompt chip "Check this shaft design"
  const promptChip = desktopPage.locator('button:has-text("Check this shaft design")').first();
  if (await promptChip.isVisible()) {
    await promptChip.click();
    await desktopPage.waitForTimeout(1500);
  }
  await desktopPage.screenshot({ path: path.join(ARTIFACT_DIR, 'stage5_09_copilot_result.png') });
  console.log('Saved stage5_09_copilot_result.png');

  await browser.close();
  console.log('=== Stage 5 Playwright Verification Completed Successfully ===');
}

runStage5Verification().catch(err => {
  console.error('Playwright verification error:', err);
  process.exit(1);
});
