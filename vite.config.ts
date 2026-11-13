import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || "/",
  server: {
    watch: {
      ignored: ["**/.tmp/**", "**/test-results/**", "**/playwright-report/**"],
    },
  },
  optimizeDeps: {
    include: ["exceljs", "pdfmake/build/pdfmake", "pdfmake/build/vfs_fonts"],
  },
  test: { include: ["tests/**/*.test.ts"], testTimeout: 20000 },
} as Parameters<typeof defineConfig>[0]);
