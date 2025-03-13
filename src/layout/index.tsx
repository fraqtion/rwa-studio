import { Outlet, useLocation } from 'react-router-dom';
import { Footer } from './footer';
import { Navbar } from './navbar';

export default function AppLayout() {
  const location = useLocation();
  const isStudioRoute = location.pathname.startsWith('/studio');

  return (
    <div className={isStudioRoute ? 'h-screen flex flex-col' : ''}>
      {!isStudioRoute && <Navbar />}
      <main className={isStudioRoute ? 'flex-1 overflow-hidden' : ''}>
        <Outlet />
      </main>
      {!isStudioRoute && <Footer />}
    </div>
  );
}
