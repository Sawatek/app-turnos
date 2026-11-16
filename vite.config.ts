import { fileURLToPath, URL } from 'node:url'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // se registra en src/main.tsx
      // El manifest NO es uno solo: cada negocio tiene el suyo (nombre, ícono, inicio).
      // public/manifest.webmanifest es el de SawaTek; el de cada negocio lo arma src/instalacion/marca.ts.
      manifest: false,
      includeAssets: ['icono.svg', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest'],
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/m\//],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // Manifest e íconos de cada negocio: los guarda la página en la caché "marcas" y el service worker
            // los sirve desde una URL real (Chrome no instala con manifests blob:/data:).
            // Cuando haya función en Netlify para /m/*, cambiar a NetworkFirst.
            urlPattern: ({ url }) => url.pathname.startsWith('/m/'),
            handler: 'CacheOnly',
            options: { cacheName: 'marcas' },
          },
        ],
      },
      devOptions: { enabled: true, navigateFallback: 'index.html', suppressWarnings: true },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5180, host: true },
})
