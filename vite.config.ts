/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Bibliotecas usadas exclusivamente por rotas pesadas (ex: gráficos no
// Histórico). Agrupadas aqui para que fiquem fora do chunk inicial e sejam
// baixadas apenas quando a rota correspondente for aberta.
const CHART_LIBS =
  /recharts|victory-vendor|d3-|react-redux|reselect|immer|decimal\.js-light|es-toolkit|use-sync-external-store|tiny-invariant|eventemitter3|clsx|@reduxjs\//

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
    plugins: [react(), tailwindcss()],
    esbuild: {
      legalComments: 'none',
      // Remove console.* e debugger apenas no build de produção. Durante o
      // dev e os testes (vitest) o log continua disponível.
      ...(isProduction ? { drop: ['console', 'debugger'] } : {}),
    },
    build: {
      minify: 'esbuild',
      cssMinify: 'esbuild',
      reportCompressedSize: true,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          // Code splitting: separa bibliotecas de terceiros em chunks
          // estáveis (com cache próprio) e deixa o código da aplicação ser
          // fatiado por rota via React.lazy().
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (CHART_LIBS.test(id)) return 'vendor-charts'
            if (id.includes('@supabase')) return 'vendor-supabase'
            if (id.includes('lucide-react')) return 'vendor-ui'
            if (id.includes('@capacitor')) return 'vendor-capacitor'
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react'
            return 'vendor'
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.ts',
      css: false,
    },
  }
})