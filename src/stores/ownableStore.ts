import { create } from 'zustand';
import { File, Folder, Ownable } from '@/common/interfaces/files';
import { FILE_TYPES } from '@/common/interfaces/constants';
import storage from '@/common/services/storage';

// Helper function to get file type from extension
const getFileType = (filename: string): keyof typeof FILE_TYPES | undefined => {
  const extension = '.' + filename.split('.').pop();
  return Object.keys(FILE_TYPES).find(
    (type) => type === extension,
  ) as keyof typeof FILE_TYPES;
};

// Helper function to create a preview URL for supported file types
const createPreviewUrl = async (file: File): Promise<string | undefined> => {
  if (!file.content) return undefined;

  const fileType = FILE_TYPES[file.type];

  // For HTML files, we don't need to create a blob URL since we'll use the content directly
  if (fileType === 'html') {
    return undefined; // We'll use the content directly in the preview component
  }

  // For binary files like images, audio, video, and 3D models
  if (['image', '3d', 'audio', 'video'].includes(fileType)) {
    // For binary files, we need to handle them differently than text files
    try {
      // Check if content is already a data URL (starts with data:)
      if (file.content.startsWith('data:')) {
        return file.content; // Already a data URL, return as is
      }

      // Special handling for image files - create data URLs directly
      if (fileType === 'image') {
        let mimeType = 'image/png'; // Default
        if (file.type === '.svg') {
          mimeType = 'image/svg+xml';
        } else if (file.type === '.webp') {
          mimeType = 'image/webp';
        } else if (file.type === '.png') {
          mimeType = 'image/png';
        } else if (file.type === '.jpg' || file.type === '.jpeg') {
          mimeType = 'image/jpeg';
        } else if (file.type === '.gif') {
          mimeType = 'image/gif';
        } else {
          mimeType = `image/${file.type.substring(1)}`;
        }

        // Try to determine if content is base64
        if (file.content.match(/^[A-Za-z0-9+/=]+$/)) {
          return `data:${mimeType};base64,${file.content}`;
        }
      }

      // Determine the MIME type for other file types
      let mimeType = 'application/octet-stream';
      if (fileType === 'audio') {
        mimeType = `audio/${file.type.substring(1)}`;
      } else if (fileType === 'video') {
        mimeType = `video/${file.type.substring(1)}`;
      } else if (fileType === '3d') {
        if (file.type === '.gltf') {
          mimeType = 'model/gltf+json';
        } else if (file.type === '.glb') {
          mimeType = 'model/gltf-binary';
        } else if (file.type === '.fbx') {
          mimeType = 'application/octet-stream';
        } else if (file.type === '.obj') {
          mimeType = 'text/plain';
        } else {
          mimeType = `model/${file.type.substring(1)}`;
        }
      }

      // Special handling for FBX files - we'll use the content directly in the component
      if (file.type === '.fbx') {
        // For FBX files, we'll pass the content directly to the component
        // Just return a simple identifier URL that the component can recognize
        return 'fbx-direct-content';
      }

      // Convert string content to binary data for binary file types
      let binaryData;
      const isBinaryFile =
        file.type === '.glb' ||
        file.type === '.png' ||
        file.type === '.jpg' ||
        file.type === '.jpeg' ||
        file.type === '.gif' ||
        file.type === '.webp' ||
        fileType === 'audio' ||
        fileType === 'video';

      if (isBinaryFile) {
        try {
          // For binary files, the content is stored as a base64 string
          // Convert base64 to binary
          const binaryString = atob(file.content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          binaryData = bytes.buffer;
        } catch (error) {
          console.error('Error decoding base64 content:', error);

          // If decoding fails, try using the content directly
          // This is a fallback and might not work for all cases
          if (file.content.startsWith('data:')) {
            return file.content; // Return data URL directly
          }

          // Last resort: use content directly
          binaryData = file.content;
        }
      } else {
        // For text-based files like GLTF or OBJ
        binaryData = file.content;
      }

      // Create blob with appropriate MIME type
      const blob = new Blob([binaryData], { type: mimeType });

      // For images, try to create a data URL instead of a blob URL
      if (fileType === 'image') {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve(reader.result as string);
          };
          reader.onerror = () => {
            console.error('Error creating data URL from blob');
            resolve(URL.createObjectURL(blob)); // Fallback to blob URL
          };
          reader.readAsDataURL(blob);
        });
      }

      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error creating preview URL:', error);
      return undefined;
    }
  }

  return undefined;
};

// Helper function to recursively process a directory
const processDirectory = async (
  dirHandle: FileSystemDirectoryHandle,
  path = '/',
): Promise<Folder> => {
  const folder: Folder = {
    name: dirHandle.name,
    path,
    files: {},
    folders: {},
  };

  for await (const entry of dirHandle.values()) {
    const entryPath = `${path}${entry.name}`;

    if (entry.kind === 'file') {
      const fileHandle = entry as FileSystemFileHandle;
      const file = await fileHandle.getFile();
      const type = getFileType(file.name);

      if (type) {
        const fileType = FILE_TYPES[type];
        let content: string;

        // Handle binary files differently
        if (['image', '3d', 'audio', 'video'].includes(fileType)) {
          // For images, use FileReader to get a data URL directly
          if (fileType === 'image') {
            content = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                resolve(e.target?.result as string);
              };
              reader.readAsDataURL(file);
            });
          }
          // For other binary files, convert to base64
          else {
            const arrayBuffer = await file.arrayBuffer();
            const binary = new Uint8Array(arrayBuffer);
            let binaryString = '';
            for (let i = 0; i < binary.byteLength; i++) {
              binaryString += String.fromCharCode(binary[i]);
            }
            content = btoa(binaryString);
          }
        } else {
          // For text files, read as text
          content = await file.text();
        }

        const fileEntry: File = {
          name: file.name,
          content,
          type,
          lastModified: new Date(file.lastModified),
          path: entryPath,
        };

        // Create preview URL for supported file types
        fileEntry.preview_url = await createPreviewUrl(fileEntry);

        folder.files[file.name] = fileEntry;
      }
    } else if (entry.kind === 'directory') {
      const subDirHandle = entry as FileSystemDirectoryHandle;
      folder.folders[entry.name] = await processDirectory(
        subDirHandle,
        `${entryPath}/`,
      );
    }
  }

  return folder;
};

interface OwnableStore {
  ownables: Record<string, Ownable>;
  activeOwnable: string | null;
  isLoading: boolean;

  // Ownable management
  createOwnable: (name: string) => Promise<void>;
  importOwnable: (folderHandle: FileSystemDirectoryHandle) => Promise<void>;
  deleteOwnable: (name: string) => Promise<void>;
  setActiveOwnable: (name: string | null) => void;
  loadOwnables: () => Promise<void>;

  // File management within ownable
  addFile: (
    ownableName: string,
    path: string,
    content: string,
    type: keyof typeof FILE_TYPES,
  ) => Promise<void>;
  updateFile: (
    ownableName: string,
    path: string,
    content: string,
  ) => Promise<void>;
  deleteFile: (ownableName: string, path: string) => Promise<void>;

  // Asset preview management
  setPreviewUrl: (ownableName: string, path: string, url: string) => void;
}

const createDefaultOwnable = (name: string): Ownable => ({
  name,
  folder: {
    name,
    path: '/',
    files: {},
    folders: {},
  },
  assets: {
    images: [],
    models: [],
    other: [],
  },
});

const useOwnableStore = create<OwnableStore>((set, get) => ({
  ownables: {},
  activeOwnable: null,
  isLoading: false,

  loadOwnables: async () => {
    set({ isLoading: true });
    try {
      const ownables = await storage.getAllOwnables();
      const ownablesMap = ownables.reduce(
        (acc, ownable) => {
          acc[ownable.name] = ownable;
          return acc;
        },
        {} as Record<string, Ownable>,
      );

      set({ ownables: ownablesMap });
    } catch (error) {
      console.error('Error loading ownables:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createOwnable: async (name) => {
    const ownable = createDefaultOwnable(name);
    await storage.saveOwnable(ownable);
    set((state) => ({
      ownables: {
        ...state.ownables,
        [name]: ownable,
      },
      activeOwnable: name,
    }));
  },

  importOwnable: async (folderHandle) => {
    set({ isLoading: true });
    try {
      const folder = await processDirectory(folderHandle);
      const ownable: Ownable = {
        name: folderHandle.name,
        folder,
        assets: {
          images: [],
          models: [],
          other: [],
        },
      };

      // Collect asset paths
      const collectAssets = (folder: Folder, basePath = '') => {
        Object.entries(folder.files).forEach(([name, file]) => {
          const path = `${basePath}${name}`;
          const fileType = FILE_TYPES[file.type];

          if (fileType === 'image') {
            ownable.assets.images.push(path);
          } else if (fileType === '3d') {
            ownable.assets.models.push(path);
          } else {
            ownable.assets.other.push(path);
          }

          // Set main contract if it's a Rust file
          if (file.type === '.rs' && !ownable.mainContract) {
            ownable.mainContract = path;
          }
        });

        Object.entries(folder.folders).forEach(([name, subFolder]) => {
          collectAssets(subFolder, `${basePath}${name}/`);
        });
      };

      collectAssets(folder);

      // Save to storage
      await storage.saveOwnable(ownable);

      set((state) => ({
        ownables: {
          ...state.ownables,
          [folderHandle.name]: ownable,
        },
        activeOwnable: folderHandle.name,
      }));
    } catch (error) {
      console.error('Error importing ownable:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteOwnable: async (name) => {
    const state = get();
    if (state.ownables[name]) {
      await storage.deleteOwnable(name);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [name]: _, ...remainingOwnables } = state.ownables;
      set({
        ownables: remainingOwnables,
        activeOwnable:
          state.activeOwnable === name ? null : state.activeOwnable,
      });
    }
  },

  setActiveOwnable: (name) => set({ activeOwnable: name }),

  addFile: async (ownableName, path, content, type) => {
    const state = get();
    const ownable = state.ownables[ownableName];
    if (!ownable) return;

    const pathParts = path.split('/').filter(Boolean);
    const fileName = pathParts.pop()!;
    let currentFolder = ownable.folder;

    // Create folders if they don't exist
    for (const part of pathParts) {
      if (!currentFolder.folders[part]) {
        currentFolder.folders[part] = {
          name: part,
          path: `${currentFolder.path}${part}/`,
          files: {},
          folders: {},
        };
      }
      currentFolder = currentFolder.folders[part];
    }

    // Add the file
    const newFile: File = {
      name: fileName,
      content,
      type,
      lastModified: new Date(),
      path,
    };

    currentFolder.files[fileName] = newFile;

    // Save to storage
    await storage.saveOwnable(ownable);

    set({
      ownables: {
        ...state.ownables,
        [ownableName]: ownable,
      },
    });
  },

  updateFile: async (ownableName, path, content) => {
    const state = get();
    const ownable = state.ownables[ownableName];
    if (!ownable) return;

    const pathParts = path.split('/').filter(Boolean);
    const fileName = pathParts.pop()!;
    let currentFolder = ownable.folder;

    // Navigate to the correct folder
    for (const part of pathParts) {
      if (!currentFolder.folders[part]) return;
      currentFolder = currentFolder.folders[part];
    }

    // Update the file if it exists
    if (currentFolder.files[fileName]) {
      currentFolder.files[fileName] = {
        ...currentFolder.files[fileName],
        content,
        lastModified: new Date(),
      };

      // Save to storage
      await storage.saveOwnable(ownable);

      set({
        ownables: {
          ...state.ownables,
          [ownableName]: ownable,
        },
      });
    }
  },

  deleteFile: async (ownableName, path) => {
    const state = get();
    const ownable = state.ownables[ownableName];
    if (!ownable) return;

    const pathParts = path.split('/').filter(Boolean);
    const fileName = pathParts.pop()!;
    let currentFolder = ownable.folder;

    // Navigate to the correct folder
    for (const part of pathParts) {
      if (!currentFolder.folders[part]) return;
      currentFolder = currentFolder.folders[part];
    }

    // Delete the file if it exists
    if (currentFolder.files[fileName]) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [fileName]: _, ...remainingFiles } = currentFolder.files;
      currentFolder.files = remainingFiles;

      // Save to storage
      await storage.saveOwnable(ownable);

      set({
        ownables: {
          ...state.ownables,
          [ownableName]: ownable,
        },
      });
    }
  },

  setPreviewUrl: (ownableName, path, url) =>
    set((state) => {
      const ownable = state.ownables[ownableName];
      if (!ownable) return state;

      const pathParts = path.split('/').filter(Boolean);
      const fileName = pathParts.pop()!;
      let currentFolder = ownable.folder;

      // Navigate to the correct folder
      for (const part of pathParts) {
        if (!currentFolder.folders[part]) return state;
        currentFolder = currentFolder.folders[part];
      }

      // Update preview URL if the file exists
      if (currentFolder.files[fileName]) {
        currentFolder.files[fileName] = {
          ...currentFolder.files[fileName],
          preview_url: url,
        };

        return {
          ownables: {
            ...state.ownables,
            [ownableName]: ownable,
          },
        };
      }

      return state;
    }),
}));

// Initialize storage and load ownables when the store is created
storage.initialize().then(() => {
  useOwnableStore.getState().loadOwnables();
});

export default useOwnableStore;
