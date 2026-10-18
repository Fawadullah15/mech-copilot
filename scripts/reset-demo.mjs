import fs from 'node:fs';

const backupPath = 'data/mech-copilot.backup-stage3-init.db';
const targetPath = 'data/mech-copilot.db';

if (fs.existsSync(backupPath)) {
  fs.copyFileSync(backupPath, targetPath);
  console.log('✓ Demo state reset to pristine 45mm gearbox baseline.');
} else {
  console.error(`Backup not found at ${backupPath}`);
  process.exit(1);
}
