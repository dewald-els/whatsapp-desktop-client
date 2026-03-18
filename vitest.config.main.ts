import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    name: 'main',
    globals: true,
    environment: 'node',
    include: ['src/main/**/*.test.ts', 'src/preload/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/main/**/*.ts', 'src/preload/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/node_modules/**',
        '**/dist/**'
      ]
    },
    setupFiles: ['./test/setup-main.ts']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/main')
    }
  }
})
