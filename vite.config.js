import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@apex/nexus-native": path.resolve(__dirname, "src/shims/nexusNative.js"),
    },
  },
});