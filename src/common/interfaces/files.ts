import { FILE_TYPES } from './constants';

export interface File {
  name: string;
  content: string;
  type: keyof typeof FILE_TYPES;
  lastModified: Date;
  path: string; // Full path within the ownable
  preview_url?: string; // For images and 3D models
}

export interface Folder {
  name: string;
  path: string;
  files: Record<string, File>;
  folders: Record<string, Folder>;
}

export interface Ownable {
  name: string;
  description?: string;
  mainContract?: string; // Path to main Rust contract
  assets: {
    images: string[]; // Paths to image files
    models: string[]; // Paths to 3D models
    other: string[]; // Other asset files
  };
  folder: Folder;
}
