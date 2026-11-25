import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  root:fileURLToPath(new URL("./apps/web",import.meta.url)),
  plugins:[tailwindcss(),VitePWA({
    strategies:"injectManifest",srcDir:"src",filename:"sw.js",registerType:"prompt",injectRegister:false,
    injectManifest:{globPatterns:["**/*.{js,css,html,svg,png,woff2,webmanifest}"],globIgnores:["**/downloads/**","legacy.html"],maximumFileSizeToCacheInBytes:4*1024*1024},
    manifest:{name:"Jardim",short_name:"Jardim",description:"Suas memórias, sempre com você",lang:"pt-BR",start_url:"/",scope:"/",display:"standalone",background_color:"#101113",theme_color:"#101113",icons:[{src:"/icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any"}]}
  })],
  oxc:{jsx:{runtime:"automatic",importSource:"react"}},
  resolve:{dedupe:["react","react-dom"]},
  build:{outDir:fileURLToPath(new URL("./dist/web",import.meta.url)),emptyOutDir:true},
  server:{proxy:{"/v1":"http://localhost:8787","/v2":"http://localhost:8787","/auth":"http://localhost:8787","/faith":"http://localhost:8787"}}
});
