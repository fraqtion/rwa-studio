import AppLayout from './layout';
import { publicRoutes } from './routes/public';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './lib/redux/store';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: publicRoutes,
  },
]);

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <RouterProvider router={router} />
      </PersistGate>
    </Provider>
  );
}
