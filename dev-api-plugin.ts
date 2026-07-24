import path from "node:path";
import { pathToFileURL } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import { loadEnv, type Plugin } from "vite";

// Routes we serve locally — must match the files in ./api
const ROUTES = new Set(["gemini", "ocr", "vision"]);

/**
 * Runs the Vercel serverless handlers in api/*.js during `vite dev`, so the same
 * /api/gemini and /api/ocr endpoints work locally without `vercel dev`. Loads keys
 * from .env into process.env so the handlers can read GEMINI_API_KEY / GCP_VISION_KEY.
 * Only active for `serve` (dev) — production still uses Vercel's own runtime.
 */
export function devApiPlugin(): Plugin {
  return {
    name: "dev-api",
    apply: "serve",
    configResolved() {
      const env = loadEnv("development", process.cwd(), "");
      for (const [k, v] of Object.entries(env)) {
        if (process.env[k] === undefined) process.env[k] = v;
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/api/")) return next();
        const name = url.split("?")[0].replace(/\/$/, "").slice("/api/".length);
        if (!ROUTES.has(name)) return next();

        try {
          (req as IncomingMessage & { body?: unknown }).body = await readJson(req);
          const vres = adaptResponse(res);
          const modUrl = pathToFileURL(path.resolve(process.cwd(), `api/${name}.js`)).href;
          // Cache-bust so edits to api/*.js take effect without a dev-server restart.
          const mod = await import(`${modUrl}?t=${Date.now()}`);
          await mod.default(req, vres);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "dev api failed", detail: String(err) }));
        }
      });
    },
  };
}

// Give the Node ServerResponse the Express-like helpers the handlers expect.
function adaptResponse(res: ServerResponse) {
  const vres = res as ServerResponse & {
    status: (code: number) => typeof vres;
    json: (body: unknown) => typeof vres;
  };
  vres.status = (code: number) => {
    res.statusCode = code;
    return vres;
  };
  vres.json = (body: unknown) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
    return vres;
  };
  return vres;
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}
