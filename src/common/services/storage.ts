import { Ownable } from '@/common/interfaces/files';
import { openDB, IDBPDatabase } from 'idb';
import { FILE_TYPES } from '@/common/interfaces/constants';

const DB_NAME = 'rwa-studio';
const DB_VERSION = 1;

interface StorageDB {
  ownables: {
    key: string;
    value: Ownable;
  };
  files: {
    key: string;
    value: {
      content: ArrayBuffer | string;
      type: string;
      isDataUrl?: boolean;
    };
  };
}

class StorageService {
  private db: IDBPDatabase<StorageDB> | null = null;

  async initialize() {
    if (this.db) return;

    this.db = await openDB<StorageDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store for ownable metadata and structure
        if (!db.objectStoreNames.contains('ownables')) {
          db.createObjectStore('ownables');
        }
        // Store for large file contents (binary data)
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files');
        }
      },
    });
  }

  // Ownable operations
  async saveOwnable(ownable: Ownable): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.put('ownables', ownable, ownable.name);

    // Store binary data separately for efficiency
    await this.saveBinaryFiles(ownable);
  }

  async getOwnable(name: string): Promise<Ownable | undefined> {
    if (!this.db) await this.initialize();
    const ownable = await this.db!.get('ownables', name);

    if (ownable) {
      // Restore binary data and preview URLs
      await this.restoreBinaryFiles(ownable);
    }

    return ownable;
  }

  async getAllOwnables(): Promise<Ownable[]> {
    if (!this.db) await this.initialize();
    const ownables = await this.db!.getAll('ownables');

    // Restore binary data and preview URLs for all ownables
    await Promise.all(
      ownables.map((ownable) => this.restoreBinaryFiles(ownable)),
    );

    return ownables;
  }

  async deleteOwnable(name: string): Promise<void> {
    if (!this.db) await this.initialize();

    // Get the ownable first to clean up its binary files
    const ownable = await this.getOwnable(name);
    if (ownable) {
      await this.deleteBinaryFiles(ownable);
    }

    await this.db!.delete('ownables', name);
  }

  // Binary file handling
  private async saveBinaryFiles(ownable: Ownable) {
    const saveFilePromises: Promise<unknown>[] = [];

    const processFolder = (folder: Ownable['folder']) => {
      Object.values(folder.files).forEach((file) => {
        const fileCategory = FILE_TYPES[file.type];
        if (['image', '3d', 'audio', 'video'].includes(fileCategory)) {
          const fileKey = `${ownable.name}:${file.path}`;

          // Check if content is a data URL
          if (file.content.startsWith('data:')) {
            // Store data URLs directly
            saveFilePromises.push(
              this.db!.put(
                'files',
                {
                  content: file.content,
                  type: fileCategory,
                  isDataUrl: true,
                },
                fileKey,
              ),
            );
          } else {
            // For base64 content, store as is
            saveFilePromises.push(
              this.db!.put(
                'files',
                {
                  content: file.content,
                  type: fileCategory,
                  isDataUrl: false,
                },
                fileKey,
              ),
            );
          }

          // Clear the content from the ownable structure
          file.content = '';
        }
      });

      Object.values(folder.folders).forEach(processFolder);
    };

    processFolder(ownable.folder);
    await Promise.all(saveFilePromises);
  }

  private async restoreBinaryFiles(ownable: Ownable) {
    const processFolder = async (folder: Ownable['folder']) => {
      for (const file of Object.values(folder.files)) {
        const fileCategory = FILE_TYPES[file.type];
        if (['image', '3d', 'audio', 'video'].includes(fileCategory)) {
          const fileKey = `${ownable.name}:${file.path}`;
          const binaryData = await this.db!.get('files', fileKey);

          console.log('Restoring binary file:', {
            path: file.path,
            type: file.type,
            category: fileCategory,
            hasData: !!binaryData,
            isDataUrl: binaryData?.isDataUrl,
            contentLength: binaryData?.content
              ? typeof binaryData.content === 'string'
                ? binaryData.content.length
                : 'ArrayBuffer'
              : 0,
          });

          if (binaryData) {
            // Restore content based on how it was stored
            if (binaryData.isDataUrl) {
              // If it's a data URL, use it directly
              file.content = binaryData.content as string;
              file.preview_url = binaryData.content as string;
              console.log('Using data URL directly for', file.path);
            } else {
              // For base64 content
              file.content = binaryData.content as string;

              // Create preview URL based on file type
              if (fileCategory === 'image') {
                // For images, create a data URL with the appropriate MIME type
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
                }

                file.preview_url = `data:${mimeType};base64,${file.content}`;
                console.log(
                  'Created data URL for image',
                  file.path,
                  'with MIME type',
                  mimeType,
                );
              } else {
                // For other binary files, create a blob URL
                try {
                  // Convert base64 to binary
                  const binaryString = atob(file.content);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }

                  // Determine MIME type
                  let mimeType = 'application/octet-stream';
                  if (fileCategory === 'audio') {
                    mimeType = `audio/${file.type.substring(1)}`;
                  } else if (fileCategory === 'video') {
                    mimeType = `video/${file.type.substring(1)}`;
                  } else if (fileCategory === '3d') {
                    if (file.type === '.gltf') {
                      mimeType = 'model/gltf+json';
                    } else if (file.type === '.glb') {
                      mimeType = 'model/gltf-binary';
                    } else if (file.type === '.fbx') {
                      mimeType = 'application/octet-stream';
                    } else if (file.type === '.obj') {
                      mimeType = 'text/plain';
                    }
                  }

                  // Create blob URL
                  const blob = new Blob([bytes.buffer], { type: mimeType });
                  file.preview_url = URL.createObjectURL(blob);
                } catch (error) {
                  console.error('Error creating blob URL:', error);
                }
              }
            }
          }
        }
      }

      await Promise.all(Object.values(folder.folders).map(processFolder));
    };

    await processFolder(ownable.folder);
  }

  private async deleteBinaryFiles(ownable: Ownable) {
    const deleteFilePromises: Promise<unknown>[] = [];

    const processFolder = (folder: Ownable['folder']) => {
      Object.values(folder.files).forEach((file) => {
        const fileCategory = FILE_TYPES[file.type];
        if (['image', '3d', 'audio', 'video'].includes(fileCategory)) {
          const fileKey = `${ownable.name}:${file.path}`;
          deleteFilePromises.push(this.db!.delete('files', fileKey));
        }
      });

      Object.values(folder.folders).forEach(processFolder);
    };

    processFolder(ownable.folder);
    await Promise.all(deleteFilePromises);
  }

  // Clean up preview URLs
  cleanupPreviewUrls(ownable: Ownable) {
    const processFolder = (folder: Ownable['folder']) => {
      Object.values(folder.files).forEach((file) => {
        if (file.preview_url && !file.preview_url.startsWith('data:')) {
          URL.revokeObjectURL(file.preview_url);
        }
      });

      Object.values(folder.folders).forEach(processFolder);
    };

    processFolder(ownable.folder);
  }
}

export const storage = new StorageService();
export default storage;
