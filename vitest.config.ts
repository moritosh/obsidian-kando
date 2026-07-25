import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      obsidian: path.resolve(__dirname, 'src/__mocks__/obsidian.ts'),
      'obsidian-dataview': path.resolve(__dirname, 'src/__mocks__/obsidian-dataview.ts'),
      src: path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/__mocks__/vitest.setup.ts'],
    server: {
      deps: {
        // Force packages that import 'obsidian' themselves through Vite's pipeline
        // so the alias above applies to them too (otherwise Vitest externalizes
        // node_modules imports and resolves 'obsidian' natively, which fails since
        // the real `obsidian` package ships only type declarations).
        inline: [/obsidian-daily-notes-interface/, /obsidian-dataview/],
      },
    },
  },
});
