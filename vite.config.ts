import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: process.env.VERCEL ? '/' : './',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.ZHIPU_AI_KEY': JSON.stringify(process.env.ZHIPU_AI_KEY || env.ZHIPU_AI_KEY || ''),
      'process.env.QWEN_API_KEY': JSON.stringify(process.env.QWEN_API_KEY || env.QWEN_API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
