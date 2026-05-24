import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// eslint-disable-next-line import/no-extraneous-dependencies
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [tailwindcss(), react(), basicSsl()],
  base: '/universal-uploader/',
  server: {
    proxy: {
      '/upload': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
