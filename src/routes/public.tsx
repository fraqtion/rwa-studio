import { Navigate } from 'react-router-dom';
import RwaStudioEditor from '@/components/studio';
import Homepage from '@/features/public';
import NewProject from '@/components/project/NewProject';
import ProjectList from '@/components/project/ProjectList';

export const publicRoutes = [
  {
    path: '/',
    element: <Homepage />,
  },
  {
    path: '/new',
    element: <NewProject />,
  },
  {
    path: '/projects',
    element: <ProjectList />,
  },
  {
    path: '/studio',
    element: <RwaStudioEditor />,
  },
  {
    path: '/studio/:projectName',
    element: <RwaStudioEditor />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
];
