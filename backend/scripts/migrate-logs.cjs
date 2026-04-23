/**
 * Script to migrate console.log statements to logger module in backend source files.
 * Run: node backend/scripts/migrate-logs.js
 */

const fs = require('fs');
const path = require('path');

const TARGET_DIRS = [
  'src/mining',
  'src/blockchain',
  'src/database',
  'src/services',
  'src/api',
  'src/config',
  'src/cache',
  'src/wallet',
  'src/storage'
];

const BASE = path.join(__dirname, '..');

function getLoggerImport(filePath) {
  const rel = path.relative(path.dirname(filePath), path.join(BASE, 'src', 'utils', 'logger.js'));
  const normalized = rel.replace(/\\/g, '/').replace(/\.js$/, '.js');
  return `import logger from '${normalized}';`;
}

function hasLoggerImport(content) {
  return content.includes("import logger from") || content.includes("from './utils/logger'") || content.includes("from '../utils/logger'") || content.includes("from '../../utils/logger'");
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (hasLoggerImport(content)) return false;
  if (!content.match(/console\.(log|error|warn|debug)/)) return false;

  // Determine import path
  const importLine = getLoggerImport(filePath);

  // Replace console statements
  content = content.replace(/console\.log\(/g, 'logger.info(');
  content = content.replace(/console\.error\(/g, 'logger.error(');
  content = content.replace(/console\.warn\(/g, 'logger.warn(');
  content = content.replace(/console\.debug\(/g, 'logger.debug(');

  // Add import after the last import statement
  const lines = content.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) lastImportIdx = i;
  }
  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, importLine);
  } else {
    lines.unshift(importLine);
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  return true;
}

function walkDir(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, cb);
    } else if (entry.name.endsWith('.ts')) {
      cb(fullPath);
    }
  }
}

let migrated = 0;
for (const dir of TARGET_DIRS) {
  const fullDir = path.join(BASE, dir);
  if (!fs.existsSync(fullDir)) continue;
  walkDir(fullDir, (filePath) => {
    if (migrateFile(filePath)) {
      console.log(`Migrated: ${path.relative(BASE, filePath)}`);
      migrated++;
    }
  });
}

console.log(`\nMigrated ${migrated} files.`);
