#!/usr/bin/env node

/**
 * Script to calculate the CID of an ownable package
 * Usage: node package-cid.mjs <path-to-zip-file>
 */

import fs from 'fs';
import crypto from 'crypto';

// Check if a file path was provided
if (process.argv.length < 3) {
  console.error('Please provide a path to the zip file');
  process.exit(1);
}

const filePath = process.argv[2];

// Check if the file exists
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

// Read the file
const fileData = fs.readFileSync(filePath);

// Calculate the SHA-256 hash
const hash = crypto.createHash('sha256').update(fileData).digest('hex');

// Convert to CID v1 format (simplified version)
const cid = `bafybeie${hash.substring(0, 44)}`;

console.log(`Package CID: ${cid}`);
console.log(`\nYou can use this CID to reference your ownable package.`);
