import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));

  if (process.env.NODE_ENV === "development") await setupVite(app, server);
  else serveStatic(app);

  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, "0.0.0.0", () => console.log(`D2D Supabase pilot listening on port ${port}`));
}

startServer().catch((error) => { console.error("D2D server failed to start", error); process.exitCode = 1; });
