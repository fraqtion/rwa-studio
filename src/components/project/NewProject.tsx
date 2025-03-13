import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FolderOpen, Plus, Loader2, List } from 'lucide-react';
import useOwnableStore from '@/stores/ownableStore';
import { DEFAULT_OWNABLE_STRUCTURE } from '@/common/interfaces/constants';
import { useAppDispatch, setActiveProject } from '@/lib/redux/store';

interface NewProjectDialogProps {
  onClose?: () => void;
}

const NewProjectDialog = ({ onClose }: NewProjectDialogProps) => {
  const [projectName, setProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createOwnable = useOwnableStore((state) => state.createOwnable);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleCreate = async () => {
    if (!projectName) return;

    setIsCreating(true);
    setError(null);

    try {
      await createOwnable(projectName);
      setProjectName('');
      onClose?.();
      dispatch(setActiveProject(projectName));
      navigate(`/studio/${encodeURIComponent(projectName)}`);
    } catch (err) {
      setError('Failed to create project. Please try again.');
      console.error('Error creating project:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Create New Ownable Project</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="flex items-center gap-4">
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project name"
            className="flex-1"
            disabled={isCreating}
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="text-sm text-gray-500">
          <p>Your project will be created with the following structure:</p>
          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs">
            {JSON.stringify(DEFAULT_OWNABLE_STRUCTURE, null, 2)}
          </pre>
        </div>
        <Button onClick={handleCreate} disabled={!projectName || isCreating}>
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Project'
          )}
        </Button>
      </div>
    </DialogContent>
  );
};

export default function NewProject() {
  const [importError, setImportError] = useState<string | null>(null);
  const importOwnable = useOwnableStore((state) => state.importOwnable);
  const isLoading = useOwnableStore((state) => state.isLoading);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleFolderImport = async () => {
    setImportError(null);

    try {
      // Request permission to read a folder
      const dirHandle = await window.showDirectoryPicker({
        mode: 'read',
      });
      await importOwnable(dirHandle);
      dispatch(setActiveProject(dirHandle.name));
      navigate(`/studio/${encodeURIComponent(dirHandle.name)}`);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error importing folder:', error.message);
        setImportError('Failed to import folder. Please try again.');
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold mb-4">Welcome to RWA Studio</h1>
          <p className="text-xl text-gray-600">
            Create or import your Ownable project to get started
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className="w-full h-32 flex flex-col items-center justify-center space-y-2"
                disabled={isLoading}
              >
                <Plus className="h-8 w-8" />
                <span>Create New Project</span>
              </Button>
            </DialogTrigger>
            <NewProjectDialog />
          </Dialog>

          <Button
            variant="outline"
            size="lg"
            className="w-full h-32 flex flex-col items-center justify-center space-y-2"
            onClick={handleFolderImport}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <FolderOpen className="h-8 w-8" />
                <span>Import Existing Project</span>
              </>
            )}
          </Button>
        </div>

        {importError && (
          <p className="text-sm text-red-500 mt-4">{importError}</p>
        )}

        <div className="mt-12 flex flex-col items-center space-y-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/projects')}
            className="flex items-center"
          >
            <List className="mr-2 h-4 w-4" />
            View All Projects
          </Button>

          <p className="text-sm text-gray-500">
            Need help getting started?{' '}
            <a href="#" className="text-blue-500 hover:underline">
              Check out our documentation
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
