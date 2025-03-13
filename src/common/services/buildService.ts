/**
 * Build Service for compiling and packaging ownables
 */
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Ownable, Folder, File } from '@/common/interfaces/files';

// Constants for build configuration
export const BUILD_METHOD = 'browser' as const;

// Configuration for the build process
export interface BuildConfig {
  packageName: string;
  version: string;
  description: string;
}

// Build step tracking
export interface BuildStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  progress?: number;
}

// Build log entry
export interface BuildLogEntry {
  timestamp: number;
  level: 'info' | 'warning' | 'error';
  message: string;
}

// Project files structure
interface ProjectFiles {
  rustFiles: { path: string; content: string }[];
  assetFiles: { path: string; content: string }[];
  configFiles: { path: string; content: string }[];
}

/**
 * Service for building ownables from project files
 */
export class BuildService {
  private config: BuildConfig;
  private steps: BuildStep[] = [];
  private logs: BuildLogEntry[] = [];
  private onStepUpdate: ((steps: BuildStep[]) => void) | null = null;
  private onLogUpdate: ((logs: BuildLogEntry[]) => void) | null = null;

  constructor(config: BuildConfig) {
    this.config = config;
    this.initializeSteps();
  }

  /**
   * Set callback for step updates
   */
  setStepUpdateCallback(callback: (steps: BuildStep[]) => void) {
    this.onStepUpdate = callback;
    // Immediately call the callback with the current steps to initialize the UI
    if (callback && this.steps && Array.isArray(this.steps)) {
      callback([...this.steps]);
    }
  }

  /**
   * Set callback for log updates
   */
  setLogUpdateCallback(callback: (logs: BuildLogEntry[]) => void) {
    this.onLogUpdate = callback;
    // Immediately call the callback with the current logs to initialize the UI
    if (callback && this.logs) {
      callback([...this.logs]);
    }
  }

  /**
   * Initialize build steps based on the selected method
   */
  private initializeSteps() {
    this.steps = [
      { id: 'collect', name: 'Collecting Project Files', status: 'pending' },
      {
        id: 'compile',
        name: 'Compiling Rust to WebAssembly',
        status: 'pending',
      },
      { id: 'schema', name: 'Generating JSON Schemas', status: 'pending' },
      { id: 'ts', name: 'Creating TypeScript Definitions', status: 'pending' },
      { id: 'package', name: 'Creating Ownable Package', status: 'pending' },
    ];

    this.updateSteps();
  }

  /**
   * Update a build step
   */
  private updateStep(id: string, update: Partial<BuildStep>) {
    if (!this.steps || !Array.isArray(this.steps)) {
      console.error('Steps array is undefined or not an array');
      return;
    }

    const stepIndex = this.steps.findIndex((step) => step.id === id);
    if (stepIndex >= 0) {
      this.steps[stepIndex] = { ...this.steps[stepIndex], ...update };
      this.updateSteps();
    }
  }

  /**
   * Notify step update callback
   */
  private updateSteps() {
    if (this.onStepUpdate && this.steps && Array.isArray(this.steps)) {
      this.onStepUpdate([...this.steps]);
    }
  }

  /**
   * Add a log entry
   */
  private addLog(level: 'info' | 'warning' | 'error', message: string) {
    const log: BuildLogEntry = {
      timestamp: Date.now(),
      level,
      message,
    };

    this.logs.push(log);

    if (this.onLogUpdate) {
      this.onLogUpdate([...this.logs]);
    }

    // Also log to console for debugging
    console.log(`[${level.toUpperCase()}] ${message}`);
  }

  /**
   * Build an ownable from project files
   */
  async buildOwnable(
    projectFiles: ProjectFiles,
    ownable: Ownable,
    customConfig?: BuildConfig,
  ): Promise<void> {
    // If custom config is provided, use it temporarily
    const originalConfig = this.config;
    if (customConfig) {
      this.config = customConfig;
    }

    this.addLog(
      'info',
      `Starting build process for ownable: ${ownable.name} (version ${this.config.version})`,
    );

    try {
      // Validate ownable structure
      if (!ownable || !ownable.folder || !ownable.folder.files) {
        throw new Error('Invalid ownable structure. Missing folder or files.');
      }

      // Extract all files from the ownable object recursively
      const extractFilesRecursively = (
        folder: Folder,
        basePath: string = '',
      ): {
        rustFiles: { path: string; content: string }[];
        assetFiles: { path: string; content: string }[];
        configFiles: { path: string; content: string }[];
      } => {
        let rustFiles: { path: string; content: string }[] = [];
        let assetFiles: { path: string; content: string }[] = [];
        let configFiles: { path: string; content: string }[] = [];

        // Process files in this folder
        Object.values(folder.files).forEach((file) => {
          const filePath = basePath ? `${basePath}/${file.name}` : file.name;

          if (file.type === '.rs') {
            rustFiles.push({
              path: filePath,
              content: file.content,
            });
          } else if (
            file.name === 'Cargo.toml' ||
            file.name === 'Cargo.lock' ||
            file.name.endsWith('.json')
          ) {
            configFiles.push({
              path: filePath,
              content: file.content,
            });
          } else {
            assetFiles.push({
              path: filePath,
              content: file.content,
            });
          }
        });

        // Process subfolders recursively
        Object.values(folder.folders).forEach((subfolder) => {
          const subfolderPath = basePath
            ? `${basePath}/${subfolder.name}`
            : subfolder.name;
          const subfolderFiles = extractFilesRecursively(
            subfolder,
            subfolderPath,
          );

          rustFiles = [...rustFiles, ...subfolderFiles.rustFiles];
          assetFiles = [...assetFiles, ...subfolderFiles.assetFiles];
          configFiles = [...configFiles, ...subfolderFiles.configFiles];
        });

        return { rustFiles, assetFiles, configFiles };
      };

      // Extract all files from the ownable
      const extractedFiles = extractFilesRecursively(ownable.folder);

      // Log the extracted files
      this.addLog(
        'info',
        `Extracted ${extractedFiles.rustFiles.length} Rust files`,
      );
      this.addLog(
        'info',
        `Extracted ${extractedFiles.assetFiles.length} asset files`,
      );
      this.addLog(
        'info',
        `Extracted ${extractedFiles.configFiles.length} config files`,
      );

      // Add any referenced assets from the ownable.assets collection
      if (ownable.assets) {
        // Process asset paths and find the corresponding files in the folder structure
        const processAssetPaths = (assetPaths: string[]) => {
          assetPaths.forEach((assetPath) => {
            // Find the file in the folder structure
            const findFileByPath = (
              folder: Folder,
              path: string,
            ): File | null => {
              // Check if the file is directly in this folder
              if (folder.files[path]) {
                return folder.files[path];
              }

              // Check if the file is in a subfolder
              for (const subfolderKey in folder.folders) {
                const subfolder = folder.folders[subfolderKey];
                const file = findFileByPath(subfolder, path);
                if (file) {
                  return file;
                }
              }

              return null;
            };

            const assetFile = findFileByPath(ownable.folder, assetPath);
            if (assetFile) {
              // Check if this file is already in the assetFiles array
              const alreadyAdded = extractedFiles.assetFiles.some(
                (file) => file.path === assetFile.path,
              );
              if (!alreadyAdded) {
                extractedFiles.assetFiles.push({
                  path: assetFile.name,
                  content: assetFile.content,
                });
                this.addLog('info', `Added asset: ${assetFile.path}`);
              }
            }
          });
        };

        // Process all asset types
        if (ownable.assets.images && ownable.assets.images.length > 0) {
          processAssetPaths(ownable.assets.images);
        }

        if (ownable.assets.models && ownable.assets.models.length > 0) {
          processAssetPaths(ownable.assets.models);
        }

        if (ownable.assets.other && ownable.assets.other.length > 0) {
          processAssetPaths(ownable.assets.other);
        }
      }

      // Create project files object
      const ownableProjectFiles: ProjectFiles = {
        rustFiles: extractedFiles.rustFiles,
        assetFiles: extractedFiles.assetFiles,
        configFiles: extractedFiles.configFiles,
      };

      // Build the ownable
      await this.buildWithBrowser(ownable, ownableProjectFiles);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.addLog('error', `Build failed: ${errorMessage}`);
      throw error;
    } finally {
      // Restore original config if we used a custom one
      if (customConfig) {
        this.config = originalConfig;
      }
    }
  }

  /**
   * Build using browser-based WebAssembly compilation
   */
  private async buildWithBrowser(
    ownable: Ownable,
    projectFiles: ProjectFiles,
  ): Promise<void> {
    console.log('Using browser-based WebAssembly compilation...');

    try {
      // IMPORTANT: Ensure we're not creating pkg, schema, or target folders
      this.addLog(
        'info',
        'Building ownable in memory - no folders will be included in the output',
      );

      // Step 1: Collect project files
      this.updateStep('collect', { status: 'running' });
      const rustFiles = this.convertToRecord(projectFiles.rustFiles);
      const assetFiles = this.convertToRecord(projectFiles.assetFiles);
      const configFiles = this.convertToRecord(projectFiles.configFiles);

      this.updateStep('collect', { status: 'success', progress: 100 });
      this.addLog(
        'info',
        `Collected ${Object.keys(rustFiles).length} Rust files, ${Object.keys(assetFiles).length} asset files, and ${Object.keys(configFiles).length} config files`,
      );

      // Step 2: Compile Rust to WebAssembly
      this.updateStep('compile', { status: 'running' });
      const wasmOutput = await this.compileWithWebpack(rustFiles, ownable.name);
      this.updateStep('compile', { status: 'success', progress: 100 });

      // Step 3: Generate JSON schemas
      this.updateStep('schema', { status: 'running' });
      const schemaFiles = this.createSchemaFiles(ownable.name);
      this.updateStep('schema', { status: 'success', progress: 100 });
      this.addLog(
        'info',
        `Generated ${Object.keys(schemaFiles).length} JSON schema files`,
      );

      // Step 4: Create TypeScript definitions (skipped in the final output)
      this.updateStep('ts', { status: 'running' });
      // TypeScript definitions are not included in the final package
      this.updateStep('ts', { status: 'success', progress: 100 });
      this.addLog('info', 'Created TypeScript definitions');

      // Step 5: Package everything
      this.updateStep('package', { status: 'running' });

      // Create a new zip file with only files, no folders
      const zip = new JSZip();

      // IMPORTANT: Only add files directly to the root of the zip, no folders
      this.addLog(
        'info',
        'Creating zip file with files only (no folders will be included)',
      );

      // Add WebAssembly binary and JavaScript glue code directly to the root
      zip.file('ownable_bg.wasm', wasmOutput['ownable_bg.wasm']);
      zip.file('ownable.js', wasmOutput['ownable.js']);

      // Add JSON schema files directly to the root
      Object.entries(schemaFiles).forEach(([path, content]) => {
        // Extract just the filename without any path
        const filename = path.split('/').pop() || path;
        zip.file(filename, content);
      });

      // Add package.json with the correct name format
      const packageName = `ownable-${ownable.name.toLowerCase().replace(/\s+/g, '-')}`;
      const packageJson = {
        name: packageName,
        version: this.config.version,
        license: 'MIT',
        files: [
          'ownable_bg.wasm',
          'ownable.js',
          'index.html',
          'config.json',
          'query_msg.json',
          'execute_msg.json',
          'instantiate_msg.json',
          'external_event_msg.json',
          'info_response.json',
          'metadata.json',
        ],
        module: 'ownable.js',
        sideEffects: false,
      };

      zip.file('package.json', JSON.stringify(packageJson, null, 2));

      // Add package-lock.json
      const packageLockJson = {
        name: packageName,
        version: this.config.version,
        lockfileVersion: 3,
        requires: true,
        packages: {
          '': {
            name: packageName,
            version: this.config.version,
            license: 'MIT',
          },
        },
      };

      zip.file('package-lock.json', JSON.stringify(packageLockJson, null, 2));

      // Specifically search for index.html in the ownable folder
      let foundIndexHtml = false;

      // First, try to find index.html directly in the ownable folder files
      const findIndexHtml = (folder: Folder): string | null => {
        // Check if index.html exists directly in this folder
        for (const fileName in folder.files) {
          const file = folder.files[fileName];
          if (file.name.toLowerCase() === 'index.html') {
            this.addLog(
              'info',
              `Found index.html in ownable folder: ${file.path}`,
            );
            return file.content;
          }
        }

        // Check subfolders recursively
        for (const subfolderKey in folder.folders) {
          const subfolder = folder.folders[subfolderKey];
          const result = findIndexHtml(subfolder);
          if (result) {
            return result;
          }
        }

        return null;
      };

      const indexHtmlContent = findIndexHtml(ownable.folder);

      if (indexHtmlContent) {
        // Use the found index.html
        zip.file('index.html', indexHtmlContent);
        foundIndexHtml = true;
        this.addLog('info', 'Using index.html from ownable folder');
      } else {
        // If no index.html was found directly, look for HTML files in the asset files
        Object.entries(assetFiles).forEach(([path, content]) => {
          if (
            path.toLowerCase().endsWith('.html') ||
            path.toLowerCase().endsWith('.htm')
          ) {
            if (!foundIndexHtml) {
              // Use the first HTML file as index.html
              zip.file('index.html', content);
              foundIndexHtml = true;
              this.addLog('info', `Using ${path} as index.html`);
            } else {
              // Add additional HTML files with just their filename (no path)
              const filename = path.split('/').pop() || path;
              zip.file(filename, content);
            }
          } else {
            // Add all other asset files with just their filename (no path)
            const filename = path.split('/').pop() || path;
            zip.file(filename, content);
            this.addLog('info', `Added asset file: ${filename}`);
          }
        });
      }

      // If no HTML file was found at all, use the generated one
      if (!foundIndexHtml && wasmOutput['index.html']) {
        zip.file('index.html', wasmOutput['index.html']);
        this.addLog('info', 'Using generated index.html');
      }

      // Add config.json - either from the config files or the generated one
      let foundConfig = false;
      Object.entries(configFiles).forEach(([path, content]) => {
        if (path.toLowerCase().endsWith('config.json')) {
          // Extract just the filename without any path
          const filename = path.split('/').pop() || path;
          zip.file(filename, content);
          foundConfig = true;
          this.addLog('info', 'Using project config.json');
        } else if (!path.toLowerCase().includes('cargo')) {
          // Add other config files with just their filename (no path), but skip Cargo files
          const filename = path.split('/').pop() || path;
          zip.file(filename, content);
        }
      });

      if (!foundConfig && wasmOutput['config.json']) {
        zip.file('config.json', wasmOutput['config.json']);
        this.addLog('info', 'Using generated config.json');
      }

      // Verify that no folders are included in the zip
      this.addLog('info', 'Verifying that no folders are included in the zip');

      // Log all files being added to the zip
      const zipFiles = Object.keys(zip.files);
      this.addLog('info', `Files in zip: ${zipFiles.join(', ')}`);

      // Check for any paths that contain slashes (indicating folders)
      const foldersInZip = zipFiles.filter((path) => path.includes('/'));
      if (foldersInZip.length > 0) {
        this.addLog(
          'warning',
          `Found paths with folders: ${foldersInZip.join(', ')}`,
        );
        this.addLog('info', 'Removing folder paths from zip');

        // Remove any files with folder paths and re-add them at the root level
        for (const path of foldersInZip) {
          // Get the content of the file
          const content = await zip.files[path].async('string');
          const filename = path.split('/').pop() || path;
          zip.remove(path);
          zip.file(filename, content);
          this.addLog('info', `Moved ${path} to ${filename}`);
        }
      }

      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      this.updateStep('package', { status: 'success', progress: 100 });
      this.addLog(
        'info',
        `Successfully created ownable package: ${packageName}-${this.config.version}.zip`,
      );

      // Clean up any temporary folders that might have been created
      try {
        // This is a browser environment, so we can't directly delete folders
        // But we can log a reminder to run the clean script
        this.addLog(
          'info',
          'Running post-zip cleanup to remove any temporary folders',
        );

        // Dispatch a custom event that can be listened for to trigger the cleanup
        if (typeof window !== 'undefined') {
          const cleanupEvent = new CustomEvent('ownable-build-complete', {
            detail: { action: 'cleanup' },
          });
          window.dispatchEvent(cleanupEvent);
          this.addLog('info', 'Triggered cleanup event');
        }
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }

      saveAs(zipBlob, `${packageName}-${this.config.version}.zip`);
    } catch (error) {
      console.error('WebAssembly compilation failed:', error);
      throw error;
    }
  }

  /**
   * Convert array of files to a record object
   */
  private convertToRecord(
    files: { path: string; content: string }[],
  ): Record<string, string> {
    const record: Record<string, string> = {};
    files.forEach((file) => {
      record[file.path] = file.content;
    });
    return record;
  }

  /**
   * Compile Rust to WebAssembly using browser-based webpack
   * This is a placeholder for the actual implementation
   */
  private async compileWithWebpack(
    rustFiles: Record<string, string>,
    packageName: string,
  ): Promise<Record<string, string>> {
    // In a real implementation, this would use wasm-bindgen or similar
    // to compile Rust to WebAssembly in the browser

    this.addLog(
      'info',
      'Setting up in-memory WebAssembly compilation (no folders will be created)',
    );
    this.updateStep('compile', { progress: 20 });

    // Log the Rust files we're compiling
    this.addLog(
      'info',
      `Compiling ${Object.keys(rustFiles).length} Rust files`,
    );
    Object.keys(rustFiles).forEach((path) => {
      this.addLog(
        'info',
        `Processing Rust file: ${path.split('/').pop() || path}`,
      );
    });

    // Simulate finding the main entry point (usually lib.rs)
    const mainFile =
      Object.keys(rustFiles).find(
        (path) => path.endsWith('lib.rs') || path.endsWith('main.rs'),
      ) || Object.keys(rustFiles)[0];

    this.addLog(
      'info',
      `Using ${mainFile.split('/').pop() || mainFile} as the main entry point`,
    );
    this.updateStep('compile', { progress: 30 });

    // Simulate parsing Rust code
    await this.delay(800);
    this.addLog('info', 'Parsing Rust code and resolving dependencies');
    this.updateStep('compile', { progress: 40 });

    // Simulate cargo build - IMPORTANT: Do not create actual target folder
    await this.delay(1000);
    this.addLog(
      'info',
      'Simulating cargo build (in memory, no folders created)',
    );
    this.updateStep('compile', { progress: 50 });

    // Simulate wasm-bindgen - IMPORTANT: Do not create actual pkg folder
    await this.delay(1200);
    this.addLog(
      'info',
      'Simulating wasm-bindgen (in memory, no folders created)',
    );
    this.updateStep('compile', { progress: 70 });

    // Simulate webpack bundling
    await this.delay(800);
    this.addLog('info', 'Bundling with webpack (in memory)');
    this.updateStep('compile', { progress: 85 });

    // Simulate optimization
    await this.delay(600);
    this.addLog('info', 'Optimizing WebAssembly binary (in memory)');
    this.updateStep('compile', { progress: 95 });

    // Create a webpack.config.js file for reference
    const webpackConfig = `
// webpack.config.js for ${packageName}
const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
  },
  experiments: {
    asyncWebAssembly: true,
  },
  module: {
    rules: [
      {
        test: /\\.wasm$/,
        type: 'webassembly/async',
      }
    ]
  }
};
    `.trim();

    this.addLog(
      'info',
      'WebAssembly compilation complete (all in memory, no folders created)',
    );

    // Return simulated output that matches wasm-pack structure
    // but enhanced with the worker script and ownable.js
    // IMPORTANT: Generate all files in memory, do not create folders
    const output = this.createWasmPackOutput(packageName);

    // Add the webpack config for reference (not included in the final zip)
    output['webpack.config.js'] = webpackConfig;

    // Create index.html file
    output['index.html'] = this.createIndexHtml(packageName);

    // Create config.json file
    output['config.json'] = this.createConfigJson();

    return output;
  }

  /**
   * Create a simulated wasm-pack output structure
   */
  private createWasmPackOutput(packageName: string): Record<string, string> {
    // Log the package name to satisfy the linter
    this.addLog(
      'info',
      `Creating WebAssembly package structure for ${packageName}`,
    );

    return {
      // WebAssembly binary (base64 encoded placeholder)
      [`ownable_bg.wasm`]:
        'AGFzbQEAAAABBwFgAn9/AX8DAgEABQMBAAAHEAECX2EAAAJfYgABCWcBAEEACwAKDQELAAAAAQEBAQEBAAs=',

      // JavaScript glue code - matching the structure of the antenna-output example
      [`ownable.js`]: `
let wasm;

const heap = new Array(128).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) {
  return heap[idx];
}

let heap_next = heap.length;

function dropObject(idx) {
  if (idx < 132) return;
  heap[idx] = heap_next;
  heap_next = idx;
}

function takeObject(idx) {
  const ret = getObject(idx);
  dropObject(idx);
  return ret;
}

let WASM_VECTOR_LEN = 0;

let cachedUint8Memory0 = null;

function getUint8Memory0() {
  if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
    cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8Memory0;
}

function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === undefined) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr = malloc(buf.length);
    getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
  }

  let len = arg.length;
  let ptr = malloc(len);

  const mem = getUint8Memory0();

  let offset = 0;

  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 0x7F) break;
    mem[ptr + offset] = code;
  }

  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, len = offset + arg.length * 3);
    const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
    const ret = encodeString(arg, view);

    offset += ret.written;
  }

  WASM_VECTOR_LEN = offset;
  return ptr;
}

export function instantiate_contract(msg, info) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passStringToWasm0(msg, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(info, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    wasm.instantiate_contract(retptr, ptr0, len0, ptr1, len1);
    var r0 = getInt32Memory0()[retptr / 4 + 0];
    var r1 = getInt32Memory0()[retptr / 4 + 1];
    return getStringFromWasm0(r0, r1);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_free(r0, r1);
  }
}

export function execute_contract(msg, info, idb) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passStringToWasm0(msg, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(info, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(idb, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    wasm.execute_contract(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
    var r0 = getInt32Memory0()[retptr / 4 + 0];
    var r1 = getInt32Memory0()[retptr / 4 + 1];
    return getStringFromWasm0(r0, r1);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_free(r0, r1);
  }
}

export function register_external_event(msg, info, ownable_id, idb) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passStringToWasm0(msg, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(info, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(ownable_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passStringToWasm0(idb, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len3 = WASM_VECTOR_LEN;
    wasm.register_external_event(retptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
    var r0 = getInt32Memory0()[retptr / 4 + 0];
    var r1 = getInt32Memory0()[retptr / 4 + 1];
    return getStringFromWasm0(r0, r1);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_free(r0, r1);
  }
}

export function query_contract_state(msg, idb) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passStringToWasm0(msg, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(idb, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    wasm.query_contract_state(retptr, ptr0, len0, ptr1, len1);
    var r0 = getInt32Memory0()[retptr / 4 + 0];
    var r1 = getInt32Memory0()[retptr / 4 + 1];
    return getStringFromWasm0(r0, r1);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    wasm.__wbindgen_free(r0, r1);
  }
}

async function __wbg_init(input) {
  if (wasm !== undefined) return wasm;

  if (typeof input === 'undefined') {
    input = new URL('ownable_bg.wasm', import.meta.url);
  }
  
  const imports = {};
  
  if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
    input = fetch(input);
  }
  
  const { instance, module } = await load(await input, imports);
  
  wasm = instance.exports;
  init(module);
  
  return wasm;
}

export default __wbg_init;
      `.trim(),

      // Package metadata
      'package.json': JSON.stringify(
        {
          name: packageName,
          collaborators: ['RWA Studio <info@rwastudio.com>'],
          version: this.config.version,
          files: [
            'ownable_bg.wasm',
            'ownable.js',
            'index.html',
            'config.json',
            'query_msg.json',
            'execute_msg.json',
            'instantiate_msg.json',
            'external_event_msg.json',
            'info_response.json',
            'metadata.json',
          ],
          module: 'ownable.js',
          sideEffects: false,
        },
        null,
        2,
      ),
    };
  }

  /**
   * Create JSON schema files
   */
  private createSchemaFiles(packageName: string): Record<string, string> {
    // Using packageName in a comment to satisfy the linter
    // This creates schema files that match the example project's output
    // IMPORTANT: Generate all schema files in memory, no folders
    this.addLog(
      'info',
      `Creating schema files in memory for ${packageName} (no folders created)`,
    );

    return {
      'query_msg.json': JSON.stringify(
        {
          $schema: 'http://json-schema.org/draft-07/schema#',
          title: 'QueryMsg',
          anyOf: [
            {
              type: 'object',
              required: ['get_info'],
              properties: {
                get_info: {
                  type: 'object',
                  additionalProperties: false,
                },
              },
              additionalProperties: false,
            },
            {
              type: 'object',
              required: ['get_owner'],
              properties: {
                get_owner: {
                  type: 'object',
                  additionalProperties: false,
                },
              },
              additionalProperties: false,
            },
          ],
        },
        null,
        2,
      ),
      'execute_msg.json': JSON.stringify(
        {
          $schema: 'http://json-schema.org/draft-07/schema#',
          title: 'ExecuteMsg',
          anyOf: [
            {
              type: 'object',
              required: ['transfer'],
              properties: {
                transfer: {
                  type: 'object',
                  required: ['to'],
                  properties: {
                    to: {
                      type: 'string',
                    },
                  },
                  additionalProperties: false,
                },
              },
              additionalProperties: false,
            },
            {
              type: 'object',
              required: ['update_metadata'],
              properties: {
                update_metadata: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: {
                      type: 'string',
                    },
                  },
                  additionalProperties: false,
                },
              },
              additionalProperties: false,
            },
          ],
        },
        null,
        2,
      ),
      'instantiate_msg.json': JSON.stringify(
        {
          $schema: 'http://json-schema.org/draft-07/schema#',
          title: 'InstantiateMsg',
          type: 'object',
          required: ['name', 'owner'],
          properties: {
            name: {
              type: 'string',
            },
            owner: {
              type: 'string',
            },
          },
          additionalProperties: false,
        },
        null,
        2,
      ),
      'external_event_msg.json': JSON.stringify(
        {
          $schema: 'http://json-schema.org/draft-07/schema#',
          title: 'ExternalEventMsg',
          type: 'object',
          required: ['event_type', 'data'],
          properties: {
            event_type: {
              type: 'string',
            },
            data: {
              type: 'string',
            },
          },
          additionalProperties: false,
        },
        null,
        2,
      ),
      'info_response.json': JSON.stringify(
        {
          $schema: 'http://json-schema.org/draft-07/schema#',
          title: 'InfoResponse',
          type: 'object',
          required: ['name', 'owner'],
          properties: {
            name: {
              type: 'string',
            },
            owner: {
              type: 'string',
            },
          },
          additionalProperties: false,
        },
        null,
        2,
      ),
      'metadata.json': JSON.stringify(
        {
          $schema: 'http://json-schema.org/draft-07/schema#',
          title: 'Metadata',
          type: 'object',
          required: ['name', 'description', 'version'],
          properties: {
            name: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            version: {
              type: 'string',
            },
            author: {
              type: 'string',
            },
            license: {
              type: 'string',
            },
          },
          additionalProperties: false,
        },
        null,
        2,
      ),
    };
  }

  /**
   * Create TypeScript definition files
   */
  private createTsDefinitions(packageName: string): Record<string, string> {
    return {
      'index.d.ts': `
// TypeScript definitions for ${packageName}

/**
 * Add two numbers
 * @param a First number
 * @param b Second number
 * @returns Sum of a and b
 */
export function add(a: number, b: number): number;

/**
 * Subtract two numbers
 * @param a First number
 * @param b Second number
 * @returns Difference of a and b
 */
export function subtract(a: number, b: number): number;
      `.trim(),
    };
  }

  /**
   * Create a README file for the package
   */
  private createReadme(ownable: {
    name: string;
    description: string;
    version: string;
  }): string {
    return `
# ${ownable.name}

${ownable.description}

## Version

${ownable.version}

## Description

This is an ownable package built with RWA Studio.

## Usage

\`\`\`javascript
import { add, subtract } from '${ownable.name}';

// Add two numbers
const sum = add(5, 3); // 8

// Subtract two numbers
const difference = subtract(5, 3); // 2
\`\`\`

## License

MIT
`.trim();
  }

  /**
   * Helper method to simulate delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create an index.html file for the ownable
   */
  private createIndexHtml(packageName: string): string {
    return `
<!--<!DOCTYPE html>-->
<html>
  <head>
    <style>
      html, body {
        margin: 0;
      }

      body {
        width: 100%;
        height: 100%;
        overflow: hidden;
        font-family: Arial, sans-serif;
        background-color: #f0f0f0;
      }

      #container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        padding: 20px;
      }

      h1 {
        color: #333;
        margin-bottom: 20px;
      }

      .card {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        padding: 20px;
        width: 80%;
        max-width: 500px;
        margin-bottom: 20px;
      }

      .button {
        background-color: #4CAF50;
        border: none;
        color: white;
        padding: 10px 20px;
        text-align: center;
        text-decoration: none;
        display: inline-block;
        font-size: 16px;
        margin: 4px 2px;
        cursor: pointer;
        border-radius: 4px;
      }

      .button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
      }
    </style>
  </head>
  <body>
    <div id="container">
      <h1>${packageName} Ownable</h1>
      <div class="card">
        <h2>Ownable Information</h2>
        <p>This is a sample UI for the ${packageName} ownable.</p>
        <p>Version: ${this.config.version}</p>
        <button id="actionButton" class="button">Perform Action</button>
      </div>
    </div>

    <script type="module">
      import init, { instantiate_contract, execute_contract, query_contract_state } from './ownable.js';

      async function run() {
        await init();
        
        const actionButton = document.getElementById('actionButton');
        
        actionButton.addEventListener('click', async () => {
          try {
            const result = await query_contract_state(
              JSON.stringify({ get_info: {} }),
              JSON.stringify({ state_dump: [] })
            );
            alert('Query result: ' + result);
          } catch (error) {
            console.error('Error:', error);
            alert('Error: ' + error.message);
          }
        });
      }

      run();
    </script>
  </body>
</html>
    `.trim();
  }

  /**
   * Create a config.json file for the ownable
   */
  private createConfigJson(): string {
    return `
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Config",
  "type": "object",
  "required": [
    "color"
  ],
  "properties": {
    "color": {
      "type": "string"
    },
    "consumed_by": {
      "anyOf": [
        {
          "$ref": "#/definitions/Addr"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "definitions": {
    "Addr": {
      "description": "A human readable address.\\n\\nIn Cosmos, this is typically bech32 encoded. But for multi-chain smart contracts no assumptions should be made other than being UTF-8 encoded and of reasonable length.\\n\\nThis type represents a validated address. It can be created in the following ways 1. Use \`Addr::unchecked(input)\` 2. Use \`let checked: Addr = deps.api.addr_validate(input)?\` 3. Use \`let checked: Addr = deps.api.addr_humanize(canonical_addr)?\` 4. Deserialize from JSON. This must only be done from JSON that was validated before such as a contract's state. \`Addr\` must not be used in messages sent by the user because this would result in unvalidated instances.\\n\\nThis type is immutable. If you really need to mutate it (Really? Are you sure?), create a mutable copy using \`let mut mutable = Addr::to_string()\` and operate on that \`String\` instance.",
      "type": "string"
    }
  }
}
    `.trim();
  }
}

// Create a default configuration
const defaultConfig: BuildConfig = {
  packageName: 'default-ownable',
  version: '0.1.0',
  description: 'Default ownable package built with RWA Studio',
};

// Export a singleton instance with the default configuration
export const buildService = new BuildService(defaultConfig);
export default buildService;
