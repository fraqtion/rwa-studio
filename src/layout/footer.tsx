export const Footer = () => (
  <footer className="border-t">
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="font-bold mb-4">About</h3>
          <p className="text-sm text-gray-600">
            RWA Studio helps you create and manage real world assets with an
            intuitive interface.
          </p>
        </div>
        <div>
          <h3 className="font-bold mb-4">Resources</h3>
          <ul className="space-y-2 text-sm">
            <li>Documentation</li>
            <li>Tutorials</li>
            <li>API Reference</li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold mb-4">Community</h3>
          <ul className="space-y-2 text-sm">
            <li>GitHub</li>
            <li>Discord</li>
            <li>Twitter</li>
          </ul>
        </div>
      </div>
    </div>
  </footer>
);
