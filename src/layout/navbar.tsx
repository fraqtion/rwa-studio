import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar = () => {
  const navigate = useNavigate();

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div
          className="flex items-center space-x-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <Rocket className="h-6 w-6" />
          <span className="font-bold text-xl">RWA Studio</span>
        </div>
        <nav className="flex space-x-4">
          <Button variant="ghost">Documentation</Button>
          <Button variant="ghost" onClick={() => navigate('/samples')}>
            Examples
          </Button>
          <Button variant="ghost">Support</Button>
        </nav>
      </div>
    </header>
  );
};
