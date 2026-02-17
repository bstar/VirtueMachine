import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";

const ROOT_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname));

const RUNTIME_PREFIX = "/modern/assets/runtime/";
const PRISTINE_PREFIX = "/modern/assets/pristine/";

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html": return "text/html; charset=utf-8";
    case ".js":
    case ".mjs": return "application/javascript; charset=utf-8";
    case ".cjs": return "application/javascript; charset=utf-8";
    case ".ts":
    case ".tsx": return "application/javascript; charset=utf-8";
    case ".css": return "text/css; charset=utf-8";
    case ".json": return "application/json; charset=utf-8";
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".bmp": return "image/bmp";
    case ".svg": return "image/svg+xml";
    default: return "application/octet-stream";
  }
}

function resolveAssetPath(urlPath) {
  if (urlPath.startsWith(RUNTIME_PREFIX) || urlPath.startsWith(PRISTINE_PREFIX)) {
    return path.join(ROOT_DIR, urlPath.slice(1));
  }
  return "";
}

function assetBypassPlugin() {
  return {
    name: "vm-asset-bypass",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = String(req.url || "");
        const urlPath = decodeURIComponent(rawUrl.split("?", 1)[0] || "/");
        const assetPath = resolveAssetPath(urlPath);
        if (!assetPath) {
          next();
          return;
        }
        if (!fs.existsSync(assetPath) || !fs.statSync(assetPath).isFile()) {
          next();
          return;
        }
        try {
          const bytes = fs.readFileSync(assetPath);
          res.statusCode = 200;
          res.setHeader("Content-Type", contentTypeFor(assetPath));
          res.setHeader("Cache-Control", "no-store");
          res.end(bytes);
          return;
        } catch (_err) {
          next();
          return;
        }
      });
    }
  };
}

function rootRedirectPlugin() {
  return {
    name: "vm-root-redirect",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = String(req.url || "");
        const urlPath = decodeURIComponent(rawUrl.split("?", 1)[0] || "/");
        if (urlPath === "/" || urlPath === "/index.html") {
          res.statusCode = 302;
          res.setHeader("Location", "/modern/client-web/index.html");
          res.end();
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  appType: "spa",
  assetsInclude: [
    "**/modern/assets/pristine/savegame/**",
    "**/modern/assets/runtime/savegame/**"
  ],
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
    watch: {
      ignored: [
        "**/modern/assets/pristine/savegame/**",
        "**/modern/assets/runtime/savegame/**"
      ]
    },
    fs: {
      allow: [ROOT_DIR]
    }
  },
  plugins: [rootRedirectPlugin(), assetBypassPlugin()]
});
