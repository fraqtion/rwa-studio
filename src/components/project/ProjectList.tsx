import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Folder, Trash2, ArrowLeft } from 'lucide-react';
import useOwnableStore from '@/stores/ownableStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Folder as FolderType, Ownable } from '@/common/interfaces/files';
import { useAppDispatch, setActiveProject } from '@/lib/redux/store';

export default function ProjectList() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { ownables, isLoading, loadOwnables, deleteOwnable, setActiveOwnable } =
    useOwnableStore();
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadOwnables();
  }, [loadOwnables]);

  const handleOpenProject = (name: string) => {
    setActiveOwnable(name);
    dispatch(setActiveProject(name));
    navigate(`/studio/${encodeURIComponent(name)}`);
  };

  const handleDeleteProject = async () => {
    if (!deleteConfirmation) return;

    setIsDeleting(true);
    try {
      await deleteOwnable(deleteConfirmation);
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Error deleting project:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const projectCount = Object.keys(ownables).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/new')}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Your Projects</h1>
        </div>
        <Button onClick={() => navigate('/new')}>Create New Project</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading projects...</span>
        </div>
      ) : projectCount === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <Folder className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
          <p className="text-gray-500 mb-6">
            Create a new project or import an existing one to get started
          </p>
          <Button onClick={() => navigate('/new')}>
            Create Your First Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(ownables).map(([name, ownable]) => (
            <Card key={name} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <Folder className="h-5 w-5 mr-2 text-blue-500" />
                  <h3 className="font-semibold text-lg truncate">{name}</h3>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmation(name);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Project</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <p>
                        Are you sure you want to delete{' '}
                        <strong>{deleteConfirmation}</strong>?
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        This action cannot be undone.
                      </p>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteProject}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          'Delete'
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="mb-4">
                <div className="text-sm text-gray-500">
                  <p>Files: {countFiles(ownable)}</p>
                  {ownable.assets.images.length > 0 && (
                    <p>Images: {ownable.assets.images.length}</p>
                  )}
                  {ownable.assets.models.length > 0 && (
                    <p>3D Models: {ownable.assets.models.length}</p>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleOpenProject(name)}
              >
                Open Project
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to count files in an ownable
function countFiles(ownable: Ownable): number {
  let count = 0;

  const countInFolder = (folder: FolderType) => {
    count += Object.keys(folder.files).length;
    Object.values(folder.folders).forEach((subfolder) => {
      countInFolder(subfolder);
    });
  };

  countInFolder(ownable.folder);
  return count;
}
