import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
        host: '0.0.0.0',
        port: 5173,
        proxy: {
            '/api': { target: 'http://localhost:3001', changeOrigin: true },
            '/uploads': { target: 'http://localhost:3001', changeOrigin: true },
            '/socket.io': { target: 'http://localhost:3001', ws: true },
        },
    },
    base: './',
});
//# sourceMappingURL=vite.config.js.map