/**
 * Code Analyzer for detecting problems in code files
 * Provides basic linting for JavaScript, TypeScript, Python, JSON
 */

const fs = require('fs');
const path = require('path');

// JavaScript/TypeScript patterns
const jsPatterns = [
  { regex: /console\.log\s*\(/g, severity: 'warning', message: 'Unexpected console statement' },
  { regex: /debugger\s*;?/g, severity: 'warning', message: 'Unexpected debugger statement' },
  { regex: /\bvar\s+/g, severity: 'warning', message: 'Unexpected var, use let or const instead' },
  { regex: /==(?!=)/g, severity: 'warning', message: 'Expected === instead of ==' },
  { regex: /!=(?!=)/g, severity: 'warning', message: 'Expected !== instead of !=' },
  { regex: /;\s*;/g, severity: 'error', message: 'Unnecessary semicolon' },
];

// Python patterns
const pyPatterns = [
  { regex: /print\s*\(/g, severity: 'info', message: 'Print statement found' },
  { regex: /\t/g, severity: 'warning', message: 'Tab character found, use spaces' },
  { regex: /import \*/g, severity: 'warning', message: 'Wildcard import' },
];

// Check bracket matching
function checkBrackets(code, filename) {
  const problems = [];
  const stack = [];
  const pairs = { '(': ')', '[': ']', '{': '}' };
  const lines = code.split('\n');
  
  let inString = false;
  let stringChar = '';
  let inMultilineComment = false;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    
    for (let col = 0; col < line.length; col++) {
      const char = line[col];
      const prevChar = col > 0 ? line[col - 1] : '';
      
      // Handle multiline comments
      if (!inString && char === '/' && line[col + 1] === '*') {
        inMultilineComment = true;
        col++;
        continue;
      }
      if (inMultilineComment && char === '*' && line[col + 1] === '/') {
        inMultilineComment = false;
        col++;
        continue;
      }
      if (inMultilineComment) continue;
      
      // Handle single line comments
      if (!inString && char === '/' && line[col + 1] === '/') break;
      if (!inString && char === '#' && !filename?.endsWith('.py')) continue;
      if (!inString && char === '#' && filename?.endsWith('.py')) break;
      
      // Handle strings
      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
        continue;
      }
      if (inString) continue;
      
      // Check brackets
      if (pairs[char]) {
        stack.push({ char, line: lineNum + 1, col: col + 1 });
      } else if (Object.values(pairs).includes(char)) {
        const expected = Object.entries(pairs).find(([, v]) => v === char)?.[0];
        if (stack.length === 0) {
          problems.push({
            line: lineNum + 1,
            column: col + 1,
            severity: 'error',
            message: `Unexpected '${char}'`
          });
        } else {
          const last = stack.pop();
          if (pairs[last.char] !== char) {
            problems.push({
              line: lineNum + 1,
              column: col + 1,
              severity: 'error',
              message: `Expected '${pairs[last.char]}' but found '${char}'`
            });
          }
        }
      }
    }
  }
  
  // Report unclosed brackets
  for (const item of stack) {
    problems.push({
      line: item.line,
      column: item.col,
      severity: 'error',
      message: `Unclosed '${item.char}'`
    });
  }
  
  return problems;
}

// Check JSON syntax
function checkJSON(code) {
  const problems = [];
  try {
    JSON.parse(code);
  } catch (e) {
    const match = e.message.match(/position (\d+)/);
    let line = 1, column = 1;
    if (match) {
      const pos = parseInt(match[1]);
      const lines = code.substring(0, pos).split('\n');
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    }
    problems.push({
      line,
      column,
      severity: 'error',
      message: e.message.replace(/^JSON\.parse: /, '')
    });
  }
  return problems;
}

// Apply pattern-based checks
function checkPatterns(code, patterns) {
  const problems = [];
  const lines = code.split('\n');
  
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(line)) !== null) {
        problems.push({
          line: lineNum + 1,
          column: match.index + 1,
          endColumn: match.index + match[0].length + 1,
          severity: pattern.severity,
          message: pattern.message
        });
      }
    }
  }
  
  return problems;
}

// Main analysis function
function analyzeFile(filePath, content) {
  const problems = [];
  const ext = path.extname(filePath).toLowerCase();
  
  // JSON files
  if (ext === '.json') {
    problems.push(...checkJSON(content));
    return problems;
  }
  
  // JavaScript/TypeScript
  if (['.js', '.jsx', '.ts', '.tsx', '.mjs'].includes(ext)) {
    problems.push(...checkBrackets(content, filePath));
    problems.push(...checkPatterns(content, jsPatterns));
    return problems;
  }
  
  // Python
  if (ext === '.py') {
    problems.push(...checkBrackets(content, filePath));
    problems.push(...checkPatterns(content, pyPatterns));
    return problems;
  }
  
  // Other files - just check brackets
  problems.push(...checkBrackets(content, filePath));
  
  return problems;
}

// Analyze entire workspace
async function analyzeWorkspace(rootPath) {
  const allProblems = [];
  const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.py'];
  
  async function scanDir(dir) {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Skip node_modules, .git, etc.
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'dist', 'build', '.venv', '__pycache__'].includes(entry.name)) {
            await scanDir(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            try {
              const content = await fs.promises.readFile(fullPath, 'utf-8');
              const fileProblems = analyzeFile(fullPath, content);
              for (const p of fileProblems) {
                allProblems.push({
                  ...p,
                  file: fullPath,
                  fileName: entry.name
                });
              }
            } catch (e) {
              // Skip unreadable files
            }
          }
        }
      }
    } catch (e) {
      // Skip unreadable directories
    }
  }
  
  await scanDir(rootPath);
  return allProblems;
}

module.exports = {
  analyzeFile,
  analyzeWorkspace
};
