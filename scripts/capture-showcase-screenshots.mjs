import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const TARGET_DIRS = [
  'c:\\Users\\Pc\\.gemini\\antigravity\\scratch\\mech-copilot\\screenshorts',
  'c:\\Users\\Pc\\.gemini\\antigravity\\scratch\\mech-copilot\\screenshots',
];

TARGET_DIRS.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const showcaseItems = [
  {
    name: '01_command_center_dashboard.png',
    pageName: 'dashboard',
    action: async (page) => {
      // Ensure on dashboard
      await page.waitForTimeout(300);
    }
  },
  {
    name: '02_cad_design_workspace.png',
    pageName: 'workspace',
    action: async (page) => {
      await page.waitForTimeout(500);
    }
  },
  {
    name: '03_engineering_analysis.png',
    pageName: 'analysis',
    action: async (page) => {
      await page.waitForTimeout(500);
    }
  },
  {
    name: '04_analytical_calculations.png',
    pageName: 'calculations',
    action: async (page) => {
      await page.waitForTimeout(500);
    }
  },
  {
    name: '05_cylindrical_gears_workstation.png',
    pageName: 'gears',
    action: async (page) => {
      await page.waitForTimeout(500);
    }
  },
  {
    name: '06_vibration_critical_speeds.png',
    pageName: 'vibration',
    action: async (page) => {
      await page.waitForTimeout(500);
    }
  },
  {
    name: '07_bearings_rating_life.png',
    pageName: 'bearings',
    action: async (page) => {
      await page.waitForTimeout(500);
    }
  },
  {
    name: '08_shaft_hub_connections.png',
    pageName: 'connections',
    action: async (page) => {
      await page.waitForTimeout(500);
    }
  },
  {
    name: '09_fatigue_sn_endurance.png',
    pageName: 'fatigue',
    action: async (page) => {
      await page.waitForTimeout(500);
    }
  },
  {
    name: '10_tolerances_iso_fits.png',
    pageName: 'tolerances',
    action: async (page) => {
      await page.waitForTimeout(500);
    }
  },
  {
    name: '11_gdt_cad_verification.png',
    pageName: 'gdt',
    action: async (page) => {
      await page.waitForTimeout(500);
    }
  },
  {
    name: '12_materials_database.png',
    pageName: 'materials',
    action: async (page) => {
      await page.waitForTimeout(500);
    }
  },
  {
    name: '13_copilot_assistant_panel.png',
    pageName: 'workspace',
    action: async (page) => {
      // Prompt copilot or focus copilot
      await page.evaluate(() => {
        const copilotBtn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent?.includes('Copilot'));
        // ensure copilot is open
        const copilotEl = document.querySelector('aside ~ div > div > div:last-child');
        if (!copilotEl || copilotEl.classList.contains('hidden')) {
          if (copilotBtn) copilotBtn.click();
        }
      });
      await page.waitForTimeout(400);
    }
  },
  {
    name: '14_engineering_reports.png',
    pageName: 'reports',
    action: async (page) => {
      // Click generate report to show rich preview
      await page.evaluate(() => {
        const genBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Generate'));
        if (genBtn) genBtn.click();
      });
      await page.waitForTimeout(800);
    }
  },
];

async function capture() {
  console.log('Launching browser to capture high-definition project screenshots...');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });

  for (const item of showcaseItems) {
    console.log(`Navigating to [${item.pageName}] for ${item.name}...`);
    
    // Navigate via sidebar
    await page.evaluate((name) => {
      const navBtns = Array.from(document.querySelectorAll('aside nav button'));
      const target = navBtns.find(b => {
        const t = b.getAttribute('title')?.toLowerCase() || '';
        return t.includes(name) || (name === 'dashboard' && t.includes('command center'))
          || (name === 'workspace' && t.includes('design workspace'))
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
    }, item.pageName);

    await page.waitForTimeout(400);

    if (item.action) {
      await item.action(page);
    }

    // Save to primary directory
    const primaryPath = path.join(TARGET_DIRS[0], item.name);
    await page.screenshot({ path: primaryPath, fullPage: false });

    // Copy to secondary directory
    const secondaryPath = path.join(TARGET_DIRS[1], item.name);
    fs.copyFileSync(primaryPath, secondaryPath);

    console.log(`  ✓ Saved: ${item.name} (${fs.statSync(primaryPath).size} bytes)`);
  }

  await browser.close();
  console.log('\nAll showcase screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
