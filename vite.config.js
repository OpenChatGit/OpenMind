import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensure relative paths for Electron
  optimizeDeps: {
    // Include xterm packages for pre-bundling
    include: ['xterm', 'xterm-addon-fit', 'xterm-addon-web-links']
  }
})
