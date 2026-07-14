import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // Vite 8 oxc: include .js files for JSX parsing (default exclude filters out .js)
  oxc: {
    include: /\.(m?ts|[jt]sx|js)$/,
    exclude: /node_modules/,
  },
  server: {
    host: true,
    port: 3080,
    strictPort: true,
    allowedHosts: ['ninewood.local', 'localhost'],
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        // 转发 Cookie，配合 HttpOnly 会话
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            const cookies = proxyRes.headers['set-cookie']
            if (!cookies) return
            proxyRes.headers['set-cookie'] = cookies.map((c) =>
              c.replace(/;\s*Secure/gi, '').replace(/;\s*Domain=[^;]+/gi, ''),
            )
          })
        },
      },
      '/uploads': { target: 'http://localhost:3002', changeOrigin: true },
      '/socket.io': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
