import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import './shadcn.css';
import { PwaStatus } from '../components/PwaStatus';
import { initializeTheme } from '../hooks/useTheme';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import '@rodkisten/girassol/react/theme.css';
import './shell.css';
import posthog from 'posthog-js';
import { PostHogProvider } from '@posthog/react';
initializeTheme();
const token = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN;
if (token) posthog.init(token, {
  api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: false,
  disable_session_recording: true,
  disable_surveys: true,
  advanced_disable_feature_flags: true,
  person_profiles: 'never',
  persistence: 'memory',
  before_send: event => {
    if (!event || !event.event.startsWith('jardim_spotify_')) return null;
    const stage = event.properties?.stage;
    event.properties = { distinct_id: event.properties?.distinct_id, stage };
    return event;
  },
});
const queryClient = new QueryClient();
const root = document.getElementById('root');
if (!root) throw new Error('Missing React root');
createRoot(root).render(
  <PostHogProvider client={posthog}>
  <QueryClientProvider client={queryClient}>
    <PwaStatus />
    <RouterProvider router={router} />
  </QueryClientProvider>
  </PostHogProvider>,
);
