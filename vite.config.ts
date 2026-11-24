import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  root:fileURLToPath(new URL("./apps/web",import.meta.url)),
  plugins:[tailwindcss()],
  oxc:{jsx:{runtime:"automatic",importSource:"react"}},
  resolve:{dedupe:["react","react-dom"]},
  build:{outDir:fileURLToPath(new URL("./dist/web",import.meta.url)),emptyOutDir:true},
  server:{proxy:{"/v1":"http://localhost:8787","/v2":"http://localhost:8787","/auth":"http://localhost:8787"}}
});
