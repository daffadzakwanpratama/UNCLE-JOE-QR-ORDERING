const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const mode = process.argv[2];

if (!mode || (mode !== '--frontend' && mode !== '--backend')) {
  console.error('Usage: node backend/scripts/check-syntax.js <--frontend|--backend>');
  process.exit(1);
}

// Set target directory based on the flag
const targetDir = mode === '--frontend'
  ? path.resolve(__dirname, '../../frontend')
  : path.resolve(__dirname, '..');

/**
 * Recursively scans a directory for all .js files, excluding node_modules.
 * @param {string} dir 
 * @returns {string[]} List of absolute file paths
 */
function getJsFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules') {
        results = results.concat(getJsFiles(filePath));
      }
    } else if (file.endsWith('.js')) {
      results.push(filePath);
    }
  }
  return results;
}

const files = getJsFiles(targetDir);
let hasError = false;

console.log(`Checking syntax of ${files.length} file(s) in: ${targetDir}`);

for (const file of files) {
  // Run node --check to validate syntax without running code
  const result = spawnSync('node', ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`Syntax check failed: ${path.relative(process.cwd(), file)}`);
    hasError = true;
  }
}

if (hasError) {
  console.error('\n❌ Syntax verification failed.');
  process.exit(1);
} else {
  console.log('\n✅ All files checked successfully with no syntax errors.');
}
