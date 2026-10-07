/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // The tests check plain values (colours, the wordmark, camera limits),
    // so they run in Node: no browser or screen needed
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
