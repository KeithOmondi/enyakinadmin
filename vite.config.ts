/// <reference types="vitest/config" />
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Tests get their own cache so they never clash with a running dev server (they share node_modules/.vite otherwise).
  cacheDir: process.env.VITEST ? 'node_modules/.vite-test' : undefined,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    // Matches the backend's default CORS_ORIGINS (http://localhost:5173).
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'src/**/*.test.ts'],
    env: { VITE_API_URL: 'http://api.test/api' },
  },
});
