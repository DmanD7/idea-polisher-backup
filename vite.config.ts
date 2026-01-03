
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This allows your code to use process.env.API_KEY in the browser
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});
