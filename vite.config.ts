import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// See https://vite.dev/config/
export default defineConfig({
  // يعمل محليًا وعلى GitHub Pages (تحت المسار /thekr/) وعلى نطاق مخصص
  base: './',
  plugins: [tailwindcss()],
})
