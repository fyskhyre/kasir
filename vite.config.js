import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Sesuaikan nama file dengan yang kamu miliki di folder public/
      includeAssets: ['kotabaru_logo.png'], 
      manifest: {
        name: 'Kotabaru Kasir POS', // Nama lengkap aplikasi
        short_name: 'KTB Kasir',    // Nama pendek (di bawah icon HP)
        description: 'Aplikasi Kasir Point of Sale Kotabaru',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', // Wajib 'standalone' agar tampil full screen seperti native app
        icons: [
          {
            src: 'kotabaru_logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'kotabaru_logo.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'kotabaru_logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
