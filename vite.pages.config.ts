import path from "node:path";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: path.resolve("pages-host"),
  base: "/cad/",
  publicDir: path.resolve("public"),
  plugins: [tailwindcss(), viteReact()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@": path.resolve("src"),
      "@tanstack/react-start": path.resolve("src/lib/pages-start-stub.ts"),
    },
  },
  build: {
    outDir: path.resolve("pages-dist"),
    emptyOutDir: true,
    assetsDir: "assets",
  },
});
