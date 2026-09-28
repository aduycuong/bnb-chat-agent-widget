import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));

const shared = {
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
};

function emitEmbedPreview(): Plugin {
  return {
    name: 'bnb-embed-preview',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'index.html',
        source: fs.readFileSync(path.join(root, 'preview/index.html')),
      });
    },
  };
}

export default defineConfig(({ command }) => {
  if (command !== 'build') {
    return shared;
  }

  return {
    ...shared,
    publicDir: false,
    plugins: [emitEmbedPreview()],
    build: {
      target: 'es2020',
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
      minify: 'esbuild',
      cssCodeSplit: false,
      lib: {
        entry: path.join(root, 'src/embed.ts'),
        name: 'BnbChat',
        formats: ['iife'],
        fileName: () => 'bnb-chat.js',
      },
      rollupOptions: {
        output: {
          banner:
            '/* BNB Chat widget. Load this file, then call BnbChat.init({ ... }). */',
        },
      },
    },
  };
});
