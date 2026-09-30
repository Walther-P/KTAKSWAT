import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist/owner-admin',
    emptyOutDir: false,
    minify: true,
    lib: {
      entry: 'src/owner-admin-supabase.js',
      name: 'KTAKOwnerAdminSupabase',
      formats: ['iife'],
      fileName: () => 'supabase-client.js',
    },
  },
});

