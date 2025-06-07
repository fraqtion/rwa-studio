import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createDirectoryJson(dirPath) {
  const files = {};
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isFile()) {
      files[entry.name] = fs.readFileSync(fullPath, 'utf8');
    } else if (entry.isDirectory()) {
      // Recursively create JSON for subdirectories
      createDirectoryJson(fullPath);
    }
  }

  // Write the JSON file
  const jsonPath = `${dirPath}.json`;
  fs.writeFileSync(jsonPath, JSON.stringify(files, null, 2));
}

// Create JSON files for each template
const templatesDir = path.join(__dirname, '../public/templates');
const templates = fs
  .readdirSync(templatesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const template of templates) {
  const templatePath = path.join(templatesDir, template);
  createDirectoryJson(templatePath);
}
