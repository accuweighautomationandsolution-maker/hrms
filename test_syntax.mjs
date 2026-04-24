import fs from 'fs';
import parser from '@babel/parser';

const code = fs.readFileSync('src/pages/Advances.jsx', 'utf-8');
try {
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log("Syntax is OK!");
} catch (err) {
  console.error("Syntax Error:");
  console.error(err.message);
  console.error("At line: ", err.loc.line, " column: ", err.loc.column);
}
