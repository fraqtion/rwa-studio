import { EditorProps } from '@/common/interfaces/editor';
import { Button } from '@/components/ui/button';
import RwaStudioEditor from '@/components/studio';

export const Editor = ({ onClose }: EditorProps) => (
  <div className="fixed inset-0 bg-background">
    <div className="h-12 border-b flex items-center px-4 justify-between">
      <h2 className="font-semibold">RWA Studio Editor</h2>
      <Button variant="ghost" onClick={onClose}>
        Close Editor
      </Button>
    </div>
    <div className="h-[calc(100vh-48px)]">
      <RwaStudioEditor />
      <div className="p-4">
        <p className="text-gray-500">Editor interface will be rendered here</p>
      </div>
    </div>
  </div>
);
