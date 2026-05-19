const fs = require('fs');
const parser = require('@babel/parser');

function checkFile(filepath) {
  const code = fs.readFileSync(filepath, 'utf-8');
  try {
    parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx']
    });
    console.log(`Syntax of ${filepath} is OK!`);
  } catch (err) {
    console.error(`Syntax Error in ${filepath}:`);
    console.error(err.message);
    console.error("At line: ", err.loc.line, " column: ", err.loc.column);
    process.exit(1);
  }
}

checkFile('src/pages/Attendance.jsx');
checkFile('src/utils/dataService.js');
