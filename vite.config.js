import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa' // 1. Tambahkan import ini di atas

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), // 2. Ini tetap dipertahankan
    
    // 3. Tambahkan blok VitePWA ini di bawah react()
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Nama Webapp Anda',
        short_name: 'Kasir App',
        description: 'Deskripsi webapp Anda',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', // Ini yang membuatnya jadi native app
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})