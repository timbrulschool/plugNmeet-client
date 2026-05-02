#!/usr/bin/env node
/**
 * Script to remove irregular whitespace from source files
 * Handles: non-breaking spaces, zero-width spaces, and other Unicode whitespace
 */

import fs from 'fs';
import path from 'path';

// Pattern to match irregular whitespace characters
const irregularWhitespacePattern =
  /[\u00A0\u1680\u2000-\u200B\u202F\u205F\uFEFF]/g;

function stripIrregularWhitespace(content) {
  return content.replace(irregularWhitespacePattern, ' ');
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip ignored directories
      if (!['node_modules', 'dist', '.git', '.vscode'].includes(file)) {
        walkDir(filePath, callback);
      }
    } else if (
      /\.(ts|tsx|jsx|js)$/.test(file) &&
      !filePath.includes('assets')
    ) {
      callback(filePath);
    }
  });
}

let fixedCount = 0;

walkDir('src', (file) => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const fixed = stripIrregularWhitespace(content);

    if (content !== fixed) {
      fs.writeFileSync(file, fixed, 'utf8');
      console.log(`✓ Fixed: ${file}`);
      fixedCount++;
    }
  } catch (error) {
    console.error(`✗ Error processing ${file}:`, error.message);
  }
});

console.log(`\nTotal files fixed: ${fixedCount}`);
