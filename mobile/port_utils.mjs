import fs from 'fs';
import path from 'path';

const srcDir = '../src/utils';
const destDir = './src/utils';

// Files to copy exactly
const exactFiles = [
  'payrollCalculator.js',
  'gratuityCalculator.js',
  'bonusCalculator.js',
  'exportUtils.js',
  'alertEngine.js'
];

for (const file of exactFiles) {
  const srcPath = path.join(srcDir, file);
  const destPath = path.join(destDir, file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${file}`);
  }
}

// Special handling for dataService.js to remove localStorage
const dsSrc = path.join(srcDir, 'dataService.js');
const dsDest = path.join(destDir, 'dataService.js');

if (fs.existsSync(dsSrc)) {
  let content = fs.readFileSync(dsSrc, 'utf8');
  // Very simplistic stripping of localStorage lines for the vault fallback
  // The easiest way is to just replace 'localStorage' with 'fakeStorage' where fakeStorage is an empty object
  const header = `
const fakeStorage = {
  getItem: () => null,
  setItem: () => {},
  length: 0,
  key: () => null
};
const localStorage = fakeStorage; // Mobile polyfill for dataService
`;
  
  // Insert polyfill after imports
  content = content.replace(/(import .*;\n)+/, match => match + header);
  
  fs.writeFileSync(dsDest, content);
  console.log('Copied and polyfilled dataService.js');
}
