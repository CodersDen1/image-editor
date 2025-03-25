import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interface   
    strictPort: true // Ensure the specified port is used
  },
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  
  preview: {
    host: '0.0.0.0', // For preview mode as well
    port: 4000
  }
});
