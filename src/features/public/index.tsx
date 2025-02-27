import { Button } from '@/components/ui/button';
import { Code2, Image, Box } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Homepage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-24 text-center">
      <h1 className="text-5xl font-bold mb-6">Create Ownables with Ease</h1>
      <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
        Build, customize, and manage your real world assets in a powerful
        browser-based environment.
      </p>
      <div className="flex justify-center space-x-8 mb-16">
        <div className="text-center">
          <Code2 className="h-12 w-12 mb-4 mx-auto" />
          <h3 className="font-bold mb-2">Smart Contracts</h3>
          <p className="text-sm text-gray-600">
            Create and edit CosmWasm contracts
          </p>
        </div>
        <div className="text-center">
          <Image className="h-12 w-12 mb-4 mx-auto" />
          <h3 className="font-bold mb-2">Asset Management</h3>
          <p className="text-sm text-gray-600">Handle images and media files</p>
        </div>
        <div className="text-center">
          <Box className="h-12 w-12 mb-4 mx-auto" />
          <h3 className="font-bold mb-2">3D Support</h3>
          <p className="text-sm text-gray-600">
            Work with 3D models and scenes
          </p>
        </div>
      </div>
      <Button size="lg" onClick={() => navigate('/studio')}>
        Start Creating Ownables
      </Button>
    </div>
  );
}
