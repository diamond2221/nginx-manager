import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192x192.png', 'icon-512x512.png'],
      manifest: {
        name: 'Nginx Manager',
        short_name: 'Nginx',
        description: 'Nginx 配置管理工具 - 轻松管理 Nginx 服务器和配置文件',
        theme_color: '#0d0d0e',
        background_color: '#0d0d0e',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '.',
        categories: ['developer-tools', 'utilities', 'productivity'],
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          // 添加 favicon 图标
          {
            src: '/icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ],
        screenshots: [],
        shortcuts: [
          {
            name: '主配置',
            short_name: '配置',
            description: '快速访问主配置文件',
            url: '/?shortcut=main-config',
            icons: [{ src: '/icon.svg', sizes: '96x96', type: 'image/svg+xml' }]
          },
          {
            name: '服务器管理',
            short_name: '服务器',
            description: '管理 Nginx 服务器',
            url: '/?shortcut=servers',
            icons: [{ src: '/icon.svg', sizes: '96x96', type: 'image/svg+xml' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,woff,woff2}'],
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module',
        // 开发环境也禁用导航预加载，避免 PWA 安装问题
        navigateFallback: false
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 6235,
    proxy: {
      "/api": {
        target: "http://localhost:49856",
        changeOrigin: true,
      },
    },
  },
})
