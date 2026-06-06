import { defineConfig } from "vite";
import { tanstackBuildConfig } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tanstackBuildConfig(),
    tsconfigPaths()
  ],
});
