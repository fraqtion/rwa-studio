export const FILE_TYPES = {
  // Rust files
  '.rs': 'rust',
  '.toml': 'toml',

  // Web assets
  '.html': 'html',
  '.css': 'css',
  '.js': 'javascript',
  '.ts': 'typescript',
  '.json': 'json',

  // Images
  '.jpg': 'image',
  '.jpeg': 'image',
  '.png': 'image',
  '.svg': 'image',
  '.gif': 'image',
  '.webp': 'image',

  // Audio
  '.mp3': 'audio',
  '.wav': 'audio',
  '.ogg': 'audio',
  '.flac': 'audio',

  // Video
  '.mp4': 'video',
  '.webm': 'video',
  '.mov': 'video',
  '.avi': 'video',

  // 3D Models
  '.gltf': '3d',
  '.glb': '3d',
  '.obj': '3d',
  '.fbx': '3d',
  '.usdz': '3d',

  // Documentation
  '.md': 'markdown',
  '.txt': 'text',
} as const;

export const PREVIEW_SUPPORTED_TYPES = [
  'image',
  '3d',
  'html',
  'audio',
  'video',
] as const;

// Maximum number of files to keep in recent files history
export const MAX_RECENT_FILES = 5;

export const DEFAULT_OWNABLE_STRUCTURE = {
  src: {
    'contract.rs': '',
    'lib.rs': '',
  },
  assets: {
    images: {},
    models: {},
    web: {
      'index.html': '',
      'style.css': '',
      'script.js': '',
    },
  },
  'Cargo.toml': '',
  'README.md': '',
} as const;
