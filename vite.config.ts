import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    // Use the test-specific tsconfig so Node built-ins (fs, path) are typed
    // in test files without polluting the browser build.
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
});
