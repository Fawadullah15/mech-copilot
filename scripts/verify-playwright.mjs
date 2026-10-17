import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Pc/.gemini/antigravity/brain/2623d3b0-8ed7-4099-913d-9274364403ee';

async function runVerification() {
  console.log('Launching browser...');
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    console.log('Launched system Microsoft Edge.');
  } catch (e1) {
    try {
      browser = await chromium.launch({ channel: 'chrome', headless: true });
      console.log('Launched system Google Chrome.');
    } catch (e2) {
      console.log('Attempting default chromium launch...');
      browser = await chromium.launch({ headless: true });
    }
  }
  
  const viewports = [
    { name: 'desktop_1920x1080', width: 1920, height: 1080 },
    { name: 'laptop_1366x768', width: 1366, height: 768 },
    { name: 'tablet_1024x768', width: 1024, height: 768 },
    { name: 'mobile_390x844', width: 390, height: 844 },
  ];

  const consoleErrors = [];

  for (const vp of viewports) {
    console.log(`Testing viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height }
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`[Browser Error][${vp.name}]:`, msg.text());
        consoleErrors.push({ viewport: vp.name, error: msg.text() });
      }
    });

    page.on('pageerror', err => {
      console.error(`[Page Uncaught Error][${vp.name}]:`, err.message);
      consoleErrors.push({ viewport: vp.name, error: err.message });
    });

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Save screenshot of workspace/dashboard
    const screenshotPath = path.join(ARTIFACT_DIR, `responsive_${vp.name}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot: ${screenshotPath}`);

    // If mobile, test toggles
    if (vp.name.includes('mobile')) {
      // Click Parameters tab
      const paramsTab = page.locator('button:has-text("Parameters")');
      if (await paramsTab.isVisible()) {
        await paramsTab.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, `responsive_${vp.name}_params.png`) });
      }
    }

    await page.close();
  }

  // Workflow Test on 1366x768
  console.log('Running main shaft workflow test on 1366x768...');
  const workflowPage = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await workflowPage.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await workflowPage.waitForTimeout(1000);

  // Navigate to workspace if not on workspace
  const workspaceNav = workflowPage.locator('button:has-text("Design Workspace")').first();
  if (await workspaceNav.isVisible()) {
    await workspaceNav.click();
    await workflowPage.waitForTimeout(800);
  }

  // Capture workspace initial state
  await workflowPage.screenshot({ path: path.join(ARTIFACT_DIR, 'workflow_01_workspace.png') });

  // Send Copilot prompt
  console.log('Testing Copilot offline prompt...');
  const copilotInput = workflowPage.locator('input[placeholder*="Ask Copilot"]');
  if (await copilotInput.isVisible()) {
    await copilotInput.fill('Check this shaft design');
    await workflowPage.locator('form button[type="submit"]').click();
    console.log('Submitted Copilot message...');
    await workflowPage.waitForTimeout(2500);
    await workflowPage.screenshot({ path: path.join(ARTIFACT_DIR, 'workflow_02_copilot.png') });
  }

  // Run analysis button
  const runSimBtn = workflowPage.locator('button:has-text("Run Full Simulation")');
  if (await runSimBtn.isVisible()) {
    await runSimBtn.click();
    console.log('Clicked Run Full Simulation...');
    await workflowPage.waitForTimeout(1500);
    await workflowPage.screenshot({ path: path.join(ARTIFACT_DIR, 'workflow_03_analysis.png') });
  }

  // Navigate to Reports
  const reportsNav = workflowPage.locator('button:has-text("Reports")').first();
  if (await reportsNav.isVisible()) {
    await reportsNav.click();
    await workflowPage.waitForTimeout(800);
    const generateBtn = workflowPage.locator('button:has-text("Generate Engineering Report")');
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
      console.log('Clicked Generate Engineering Report...');
      await workflowPage.waitForTimeout(1800);
    }
    await workflowPage.screenshot({ path: path.join(ARTIFACT_DIR, 'workflow_04_report.png') });
  }

  await workflowPage.close();
  await browser.close();

  console.log('\n=== VERIFICATION SUMMARY ===');
  console.log(`Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  } else {
    console.log('Zero console errors detected!');
  }
}

runVerification().catch(err => {
  console.error('Test script failed:', err);
  process.exit(1);
});
