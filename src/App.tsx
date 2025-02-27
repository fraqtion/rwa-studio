import AppLayout from './layout';
import { publicRoutes } from './routes/public';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: publicRoutes,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
