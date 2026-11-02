import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// GitHub Pages(저장소 루트)로 바로 배포: 빌드 결과를 저장소 루트의 index.html + assets/ 로 낸다
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: '..', emptyOutDir: false, assetsDir: 'assets', chunkSizeWarningLimit: 1200 },
});
