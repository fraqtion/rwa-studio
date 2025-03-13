#!/usr/bin/env node

/**
 * Cleanup script to remove temporary folders
 *
 * Usage:
 *   node bin/cleanup.js [--check-only]
 *
 * Options:
 *   --check-only  Only check if folders exist, don't delete them
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Folders to clean up
const FOLDERS_TO_CLEAN = ['pkg', 'schema', 'target'];

// Parse command line arguments
const args = process.argv.slice(2);
const checkOnly = args.includes('--check-only');

// Get the workspace root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');

// Check if folders exist and delete them if needed
let foldersFound = false;

FOLDERS_TO_CLEAN.forEach((folder) => {
  const folderPath = path.join(workspaceRoot, folder);

  if (fs.existsSync(folderPath)) {
    console.log(`Found folder: ${folder}`);
    foldersFound = true;

    if (!checkOnly) {
      try {
        // Use rimraf or fs-extra for better cross-platform compatibility
        // But for simplicity, we'll use rm -rf here
        console.log(`Deleting folder: ${folder}`);
        execSync(`rm -rf "${folderPath}"`);
        console.log(`Successfully deleted folder: ${folder}`);
      } catch (error) {
        console.error(`Error deleting folder ${folder}:`, error.message);
      }
    }
  } else {
    console.log(`Folder not found: ${folder}`);
  }
});

if (checkOnly) {
  if (foldersFound) {
    console.log(
      'Unwanted folders found. Run without --check-only to delete them.',
    );
    process.exit(1);
  } else {
    console.log('No unwanted folders found.');
    process.exit(0);
  }
} else {
  if (foldersFound) {
    console.log('Cleanup completed successfully.');
  } else {
    console.log('No folders needed cleanup.');
  }
  process.exit(0);
}
