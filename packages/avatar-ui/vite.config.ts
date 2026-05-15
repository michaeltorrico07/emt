import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [
    solid(),
    tailwindcss(),
  ],
  envDir: path.resolve(__dirname, '../../')
})