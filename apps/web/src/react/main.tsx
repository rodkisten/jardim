import { PwaStatus } from '../components/PwaStatus';
import { initializeTheme } from '../hooks/useTheme';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import '@rodkisten/girassol/react/theme.css';
import './shell.css';
initializeTheme();
const queryClient = new QueryClient();
const root = document.getElementById('root');
if (!root) throw new Error('Missing React root');
createRoot(root).render(
  <QueryClientProvider client={queryClient}>
    <PwaStatus />
    <RouterProvider router={router} />
  </QueryClientProvider>,
);
