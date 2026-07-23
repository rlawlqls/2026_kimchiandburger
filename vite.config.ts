import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { devApiPlugin } from "./dev-api-plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), devApiPlugin()],
});
