import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// basicSsl removed for dev
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    server: {
        host: true,
        port: 5174,
        /** 避免端口被占用时静默换端口，导致 Electron 仍加载 5174 失败 */
        strictPort: true,
        proxy: {
            '/api': { target: 'http://localhost:3001', changeOrigin: true },
            '/uploads': { target: 'http://localhost:3001', changeOrigin: true },
            '/socket.io': { target: 'http://localhost:3001', changeOrigin: true, ws: true },
        },
    },
});
//# sourceMappingURL=vite.config.js.map