import { Navigate } from 'react-router-dom';
import RwaStudioEditor from '@/components/studio';
import Homepage from '@/features/public';

export const publicRoutes = [
  {
    path: '/',
    element: <Homepage />,
  },
  {
    path: '/studio',
    element: <RwaStudioEditor />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
];
