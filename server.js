import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, "dist");

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cloud Run and monitoring health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Serve static assets from dist folder
app.use(express.static(distPath));

// SPA routing fallback: send index.html for any non-API request
app.get("*", (req, res, next) => {
  // If request begins with /api/, avoid returning index.html as a fallback
  if (req.path.startsWith("/api/")) {
    return next();
  }
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Aurora server listening on port ${PORT}`);
});

export default app;
