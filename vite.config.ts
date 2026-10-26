import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // public/은 Remotion 미디어용(대용량) — 웹 빌드에는 포함하지 않음
  publicDir: false,
})
