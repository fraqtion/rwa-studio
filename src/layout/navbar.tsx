import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';

export const Navbar = () => (
  <header className="border-b">
    <div className="container mx-auto px-4 py-4 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <Rocket className="h-6 w-6" />
        <span className="font-bold text-xl">RWA Studio</span>
      </div>
      <nav className="flex space-x-4">
        <Button variant="ghost">Documentation</Button>
        <Button variant="ghost">Examples</Button>
        <Button variant="ghost">Support</Button>
      </nav>
    </div>
  </header>
);
