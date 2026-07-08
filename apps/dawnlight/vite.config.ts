import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { createPerfLogServerPlugin } from './dev/perf-log-server'

export default defineConfig(({ mode }) => {
  const isAppMode = mode === 'app'

  return {
    plugins: [
      react(),
      tailwindcss(),
      createPerfLogServerPlugin(),
      ...(isAppMode
        ? []
        : [
            dts({
              insertTypesEntry: true,
              include: ['src/**/*.ts', 'src/**/*.tsx'],
            }),
            visualizer({
              filename: 'dist/stats.html',
              open: false,
              gzipSize: true,
              brotliSize: true,
            }),
          ]),
    ],
    build: {
      sourcemap: false,
      ...(isAppMode
        ? {
            outDir: 'dist-app',
            chunkSizeWarningLimit: 800,
            minify: 'esbuild' as const,
            rolldownOptions: {
              output: {
                codeSplitting: {
                  groups: [
                    {
                      name: 'react',
                      test: /node_modules[\\/](react|react-dom)[\\/]/,
                      priority: 4,
                    },
                    {
                      name: 'three',
                      test: /node_modules[\\/]three[\\/]/,
                      priority: 3,
                    },
                    {
                      name: 'icons',
                      test: /node_modules[\\/]react-icons[\\/]/,
                      priority: 2,
                    },
                    {
                      name: 'engine',
                      test: /src[\\/](engine|game|workers)[\\/]/,
                      priority: 1,
                    },
                  ],
                },
              },
            },
          }
        : {
            lib: {
              entry: resolve(__dirname, 'src/index.ts'),
              name: 'Dawnlight',
              formats: ['es', 'umd'],
              fileName: (format: string) => `dawnlight.${format === 'es' ? 'js' : 'umd.cjs'}`,
            },
            rolldownOptions: {
              external: ['react', 'react-dom'],
              output: {
                globals: {
                  react: 'React',
                  'react-dom': 'ReactDOM',
                },
              },
            },
          }),
    },
  }
})
