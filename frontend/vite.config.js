// code written by Rupneet (ID: 261096653)

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3000'}} // added by sophia
})
