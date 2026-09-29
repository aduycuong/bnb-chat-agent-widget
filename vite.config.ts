import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));

const shared = {
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
};

function listPreviewFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listPreviewFiles(full));
    else files.push(full);
  }
  return files;
}

function emitEmbedPreview(): Plugin {
  return {
    name: 'bnb-embed-preview',
    generateBundle() {
      const dir = path.join(root, 'preview');
      for (const file of listPreviewFiles(dir)) {
        this.emitFile({
          type: 'asset',
          fileName: path.relative(dir, file).split(path.sep).join('/'),
          source: fs.readFileSync(file),
        });
      }
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
            '/* BNB Chat. BnbChat.init({ publicKey, baseUrl }) or data-public-key and data-base-url on this script. */',
        },
      },
    },
  };
});
