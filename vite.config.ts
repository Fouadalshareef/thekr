import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// See https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss()],
})
