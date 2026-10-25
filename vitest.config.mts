import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

// 'server-only' throws outside a Server Component; stub it so server modules are testable.
const stubServerOnly = (): Plugin => ({
  name: 'stub-server-only',
  enforce: 'pre',
  resolveId: (id) => (id === 'server-only' ? '\0server-only' : null),
  load: (id) => (id === '\0server-only' ? 'export {};' : null),
});

export default defineConfig({
  plugins: [stubServerOnly(), react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['app/**/*.test.{ts,tsx}', '*.test.ts'],
    exclude: ['node_modules/**', '.next/**', 'e2e/**'],
    restoreMocks: true,
  },
});
