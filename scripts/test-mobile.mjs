import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Pc/.gemini/antigravity/brain/2623d3b0-8ed7-4099-913d-9274364403ee';

async function testMobile() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Close the Copilot overlay drawer if open
  const minimizeBtn = page.locator('button[title="Minimize Copilot"], button[title*="Collapse"], button:has-text("Ask Copilot")').first();
  // In CopilotPanel, button with Minimize2 icon or onClick={() => setCopilotOpen(false)}
  // Let's find the collapse button in Copilot header
  const closeCopilotBtn = page.locator('.h-14 button:last-child').last();
  if (await closeCopilotBtn.isVisible()) {
    await closeCopilotBtn.click();
    await page.waitForTimeout(500);
  }

  // Navigate to Design Workspace if needed
  const workspaceBtn = page.locator('button:has-text("Design Workspace")').first();
  if (await workspaceBtn.isVisible()) {
    await workspaceBtn.click();
    await page.waitForTimeout(500);
  }

  // Take screenshot of Mobile CAD View
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_cad_view.png') });

  // Click Parameters tab
  const paramsTab = page.locator('button:has-text("Parameters")');
  if (await paramsTab.isVisible()) {
    await paramsTab.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_params_view.png') });
  }

  // Test mobile menu open
  const menuBtn = page.locator('button[title="Toggle Navigation Menu"]');
  if (await menuBtn.isVisible()) {
    await menuBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_drawer_open.png') });
  }

  await browser.close();
  console.log('Mobile verification screenshots captured!');
}

testMobile().catch(console.error);
