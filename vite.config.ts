import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base is only applied to production builds so GitHub project pages
// (https://t2decay.github.io/mri-slice-sim/) resolve assets correctly;
// the dev server stays at plain http://localhost:5173/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/mri-slice-sim/' : '/',
}))
