import { useState } from 'react';
import ControlledEditor from '@monaco-editor/react';
import { create } from 'zustand';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Upload, Save, Trash2, FileText, FolderOpen } from 'lucide-react';
import { FILE_TYPES } from '@/common/interfaces/constants';
import { File } from '@/common/interfaces/files';

interface FileStore {
  files: Record<string, File>;
  activeFile: string | null;
  addFile: (name: string, type: keyof typeof FILE_TYPES) => void;
  updateFile: (name: string, content: string) => void;
  deleteFile: (name: string) => void;
  setActiveFile: (name: string | null) => void;
}

const useFileStore = create<FileStore>((set) => ({
  files: {},
  activeFile: null,
  addFile: (name, type) =>
    set((state) => ({
      files: {
        ...state.files,
        [name]: {
          name,
          content: '',
          type,
          lastModified: new Date(),
        },
      },
      activeFile: name,
    })),
  updateFile: (name, content) =>
    set((state) => ({
      files: {
        ...state.files,
        [name]: {
          ...state.files[name],
          content,
          lastModified: new Date(),
        },
      },
    })),
  deleteFile: (name) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [name]: _, ...remainingFiles } = state.files;

      return {
        files: remainingFiles,
        activeFile: state.activeFile === name ? null : state.activeFile,
      };
    }),
  setActiveFile: (name) => set({ activeFile: name }),
}));

const NewFileDialog = () => {
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<keyof typeof FILE_TYPES>('.txt');
  const addFile = useFileStore((state) => state.addFile);

  const handleCreate = () => {
    if (fileName) {
      addFile(fileName + fileType, fileType);
      setFileName('');
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New File
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New File</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4">
            <Input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="File name"
              className="flex-1"
            />
            <select
              value={fileType}
              onChange={(e) =>
                setFileType(e.target.value as keyof typeof FILE_TYPES)
              }
              className="bg-background text-foreground border rounded p-2"
            >
              {Object.keys(FILE_TYPES).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={handleCreate} disabled={!fileName}>
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function RwaStudioEditor() {
  const { files, activeFile, updateFile, deleteFile, setActiveFile } =
    useFileStore();

  const handleFileImport = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = Object.keys(FILE_TYPES).join(',');

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const content = await file.text();
          const fileType = Object.keys(FILE_TYPES).find((type) =>
            file.name.endsWith(type),
          ) as keyof typeof FILE_TYPES;

          useFileStore.getState().addFile(file.name, fileType);
          useFileStore.getState().updateFile(file.name, content);
        }
      };

      input.click();
    } catch (error) {
      console.error('Error importing file:', error);
    }
  };

  const activeFileData = activeFile ? files[activeFile] : null;

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Left Panel: File Explorer */}
      <div className="w-64 p-4 border-r border-gray-700">
        <h2 className="text-lg font-bold mb-4">Files</h2>
        <div className="space-y-2 mb-4">
          {Object.values(files).map((file) => (
            <Card
              key={file.name}
              className={`p-2 cursor-pointer hover:bg-gray-800 ${
                activeFile === file.name ? 'bg-gray-800' : ''
              }`}
              onClick={() => setActiveFile(file.name)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>{file.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFile(file.name);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* File Actions */}
        <div className="space-y-2">
          <NewFileDialog />
          <Button
            variant="outline"
            onClick={handleFileImport}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" /> Import File
          </Button>
        </div>
      </div>

      {/* Main Editor Panel */}
      <div className="flex-1 p-4">
        {activeFileData ? (
          <div className="h-full flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="mr-2" />
                <span>{activeFileData.name}</span>
                <span className="ml-4 text-gray-400 text-sm">
                  Last modified: {activeFileData.lastModified.toLocaleString()}
                </span>
              </div>
              <Button variant="ghost">
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
            </div>
            <ControlledEditor
              height="calc(100vh - 8rem)"
              language={FILE_TYPES[activeFileData.type]}
              value={activeFileData.content}
              onChange={(value) => updateFile(activeFileData.name, value || '')}
              options={{
                theme: 'vs-dark',
                minimap: { enabled: true },
                fontSize: 14,
                wordWrap: 'on',
                automaticLayout: true,
              }}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            <div className="text-center">
              <FolderOpen className="h-16 w-16 mx-auto mb-4" />
              <p>Select a file or create a new one to start editing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
