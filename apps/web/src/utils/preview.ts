export const isPreview = /^(?:pr\d+|preview)\.jardim\.migos\.club$/.test(window.location.hostname) && import.meta.env.VITE_FULL_STACK_PREVIEW !== 'true';
