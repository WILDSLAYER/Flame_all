import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Configuración recomendada por Tauri
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // No vigilar la parte de Rust: en Windows, los archivos que Cargo
      // compila en src-tauri/target quedan bloqueados y Vite se cae (EBUSY).
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: { target: "es2022", outDir: "dist" },
});
