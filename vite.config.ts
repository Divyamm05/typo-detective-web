import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0", // <- this ensures Vite listens on all interfaces
    port: 8080,
    strictPort: true, // optional: ensures it won’t fallback to another port
    allowedHosts: ['domainphishing.darkdive.io'], // <-- your actual domain
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      crypto: "crypto-browserify",
    },
  },
}));
