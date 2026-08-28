import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
export default defineConfig({ root: 'desktop', base: './', plugins: [react()], css: { postcss: { plugins: [tailwindcss()] } }, build: { outDir: '../desktop-dist', emptyOutDir: true } });
