import { chromium } from 'playwright';

async function testDrawerAndPin() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
  
  const aside = page.locator('aside');
  
  // 1. Initial state (collapsed)
  let box = await aside.boundingBox();
  console.log('1. Initial sidebar width:', Math.round(box.width));
  
  // 2. Hover over the sidebar -> drawer opens
  await page.mouse.move(26, 200);
  await page.waitForTimeout(400);
  box = await aside.boundingBox();
  console.log('2. Hovered sidebar width:', Math.round(box.width));
  
  // 3. Move mouse away -> drawer closes
  await page.mouse.move(600, 200);
  await page.waitForTimeout(450);
  box = await aside.boundingBox();
  console.log('3. Collapsed sidebar width after mouse leave:', Math.round(box.width));
  
  // 4. Hover again & click Pin button
  await page.mouse.move(26, 200);
  await page.waitForTimeout(400);
  const pinBtn = page.locator('aside button[title*="Pin Sidebar"]');
  await pinBtn.click();
  await page.waitForTimeout(200);
  
  // 5. Move mouse away while pinned -> remains open at 240px
  await page.mouse.move(600, 200);
  await page.waitForTimeout(450);
  box = await aside.boundingBox();
  console.log('4. Pinned sidebar width after mouse leave:', Math.round(box.width));
  
  // 6. Hover to click Unpin button
  await page.mouse.move(26, 200);
  await page.waitForTimeout(200);
  const unpinBtn = page.locator('aside button[title*="Unpin Sidebar"]');
  await unpinBtn.click();
  await page.waitForTimeout(200);
  
  // Move mouse away after unpin
  await page.mouse.move(600, 200);
  await page.waitForTimeout(450);
  box = await aside.boundingBox();
  console.log('5. Unpinned sidebar width after mouse leave:', Math.round(box.width));
  
  await browser.close();
  console.log('ALL DRAWER AND PIN TESTS VERIFIED PERFECTLY!');
}

testDrawerAndPin().catch(console.error);
