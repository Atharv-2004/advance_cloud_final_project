#!/usr/bin/env node
/**
 * Minimal lint script – checks for common issues without external tools.
 * This runs as part of CI. For a real project you would use eslint.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const RULES = [
  { pattern: /console\.log\s*\(.*password/i,   message: 'Possible credential leak via console.log' },
  { pattern: /process\.env\.SECRET\b/,          message: 'Direct SECRET env read – use safe wrapper' },
  { pattern: /eval\s*\(/,                        message: 'eval() is dangerous and forbidden' },
];

const DIRS = ['src', 'test'];
let errors = 0;

function lintFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  src.split('\n').forEach((line, i) => {
    RULES.forEach((rule) => {
      if (rule.pattern.test(line)) {
        console.error(`  LINT ERROR ${filePath}:${i + 1} – ${rule.message}`);
        errors++;
      }
    });
  });
}

DIRS.forEach((dir) => {
  const abs = path.join(__dirname, '..', dir);
  if (!fs.existsSync(abs)) return;
  fs.readdirSync(abs)
    .filter((f) => f.endsWith('.js'))
    .forEach((f) => lintFile(path.join(abs, f)));
});

if (errors === 0) {
  console.log('✅ Lint passed – no issues found.');
  process.exit(0);
} else {
  console.error(`\n❌ Lint failed with ${errors} error(s).`);
  process.exit(1);
}
