import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import {
  runMoodAndSignalAgent,
  runReflectionAgent,
  runActionAgent,
  runInsightAgent,
  getModelLadderInfo,
  pingModelLadder,
} from "./server/geminiService.js";
import { runRulesVerification } from "./tests/firestore.rules.test.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : (process.env.NODE_ENV === "production" ? 8080 : 3000);

// Middleware for JSON body parsing with large payload capacity for multimodal photo attachments
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Root health check endpoint for Cloud Run and monitoring probes
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// In-memory rate limiting map: IP/User -> { count, resetTime }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimitMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const identifier = (req.headers["x-user-id"] as string) || req.ip || "anonymous";
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 40;

  const current = rateLimitMap.get(identifier);
  if (!current || now > current.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (current.count >= maxRequests) {
    return res.status(429).json({
      error: "Rate limit exceeded. Please wait a moment before submitting another reflection.",
    });
  }

  current.count += 1;
  return next();
}

// ----------------------------------------------------------------------------
// API Endpoints
// ----------------------------------------------------------------------------

app.get("/api/health", (_req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const isConfigured = Boolean(apiKey && apiKey !== "replace_with_secret_manager_in_production" && apiKey !== "MY_GEMINI_API_KEY");
  res.json({
    status: "ok",
    service: "Aurora Private Reflection API",
    geminiConfigured: isConfigured,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Failure-Resilient Reflection Pipeline:
 * Mood & Signal -> Reflection -> Action with graceful degradation and retry targeting
 */
app.post("/api/reflect", rateLimitMiddleware, async (req, res) => {
  try {
    const data = req.body && typeof req.body === "object" ? req.body : {};
    const {
      content,
      imageBase64,
      imageMime,
      correctionsContext,
      entryId,
      idempotencyKey,
      retryTarget,
      existingMoodResult,
    } = data;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ error: "Reflection content is required." });
    }

    const safeCorrections = Array.isArray(correctionsContext) ? correctionsContext : [];

    // Target: Retry Reflection only (preserves existing Mood metadata)
    if (retryTarget === "reflection" && existingMoodResult && typeof existingMoodResult === "object") {
      const reflectionResult = await runReflectionAgent(
        content,
        existingMoodResult,
        imageBase64,
        imageMime
      );

      if (!reflectionResult) {
        return res.json({
          entryId,
          idempotencyKey,
          moodResult: existingMoodResult,
          moodStatus: "available",
          reflectionResult: null,
          reflectionStatus: "unavailable",
          actionResult: null,
          actionStatus: "skipped",
          canRetryReflection: true,
        });
      }

      const actionResult = await runActionAgent(
        content,
        existingMoodResult,
        reflectionResult.reflection,
        safeCorrections
      );

      return res.json({
        entryId,
        idempotencyKey,
        moodResult: existingMoodResult,
        moodStatus: "available",
        reflectionResult,
        reflectionStatus: "available",
        actionResult,
        actionStatus: actionResult ? "available" : "unavailable",
      });
    }

    // Step 1: Run Mood & Signal Agent (structured JSON with validation & repair)
    const moodResult = await runMoodAndSignalAgent(
      content,
      imageBase64,
      imageMime,
      safeCorrections
    );

    // If Mood & Signal fails completely (both initial & repair failed)
    if (!moodResult) {
      return res.json({
        entryId,
        idempotencyKey,
        moodResult: null,
        moodStatus: "unavailable",
        reflectionResult: null,
        reflectionStatus: "unavailable",
        actionResult: null,
        actionStatus: "skipped",
        message: "Your entry was saved. Analysis is temporarily unavailable.",
      });
    }

    // Step 2: Run Reflection Agent (concise, empathetic, non-clinical)
    const reflectionResult = await runReflectionAgent(
      content,
      moodResult,
      imageBase64,
      imageMime
    );

    // If Reflection fails, preserve mood metadata and allow retry
    if (!reflectionResult) {
      return res.json({
        entryId,
        idempotencyKey,
        moodResult,
        moodStatus: "available",
        reflectionResult: null,
        reflectionStatus: "unavailable",
        actionResult: null,
        actionStatus: "skipped",
        canRetryReflection: true,
      });
    }

    // Step 3: Run Action Agent (one optional next step; null if acute concern or failure)
    const actionResult = await runActionAgent(
      content,
      moodResult,
      reflectionResult.reflection,
      safeCorrections
    );

    return res.json({
      entryId,
      idempotencyKey,
      moodResult,
      moodStatus: "available",
      reflectionResult,
      reflectionStatus: "available",
      actionResult,
      actionStatus: actionResult ? "available" : "unavailable",
    });
  } catch (error: any) {
    console.error("Reflection pipeline unavailable:", error instanceof Error ? error.message : "AI service error");
    return res.status(503).json({
      error: "AI service is temporarily unavailable. Please try again.",
    });
  }
});

/**
 * Weekly Insight Digest synthesis
 */
app.post("/api/insights", rateLimitMiddleware, async (req, res) => {
  try {
    const data = req.body && typeof req.body === "object" ? req.body : {};
    const { entriesSummary } = data;

    if (!Array.isArray(entriesSummary)) {
      return res.status(400).json({ error: "entriesSummary must be an array." });
    }

    const insightResult = await runInsightAgent(entriesSummary);
    return res.json({ insightResult });
  } catch (error: any) {
    console.error("Error synthesizing weekly insights:", error?.message || error);
    return res.status(500).json({
      error: "Unable to synthesize pattern digest at this time.",
    });
  }
});

/**
 * Security Rules Automated Verification Endpoint
 */
app.get("/api/rules-test", (_req, res) => {
  try {
    const testResults = runRulesVerification();
    res.json(testResults);
  } catch (error: any) {
    console.error("Error running rules verification:", error?.message || error);
    res.status(500).json({ error: "Failed to run rules verification." });
  }
});

/**
 * Privacy-Safe Reverse Geocoding Endpoint
 * Resolves coarse coordinates to human-readable city/country safely on the server
 * without exposing Google Maps API keys to the browser.
 */
app.post("/api/reverse-geocode", rateLimitMiddleware, async (req, res) => {
  try {
    const data = req.body && typeof req.body === "object" ? req.body : {};
    const rawLat = Number(data.latitude ?? data.lat);
    const rawLng = Number(data.longitude ?? data.lng);

    if (isNaN(rawLat) || isNaN(rawLng)) {
      return res.status(400).json({ error: "Valid latitude and longitude are required." });
    }

    // Coarse rounding (~1.1 km resolution) for privacy protection
    const coarseLat = Math.round(rawLat * 100) / 100;
    const coarseLng = Math.round(rawLng * 100) / 100;

    const mapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.MAPS_API_KEY;

    if (mapsKey && mapsKey !== "MY_MAPS_API_KEY") {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coarseLat},${coarseLng}&key=${mapsKey}&result_type=locality|sublocality|administrative_area_level_2|administrative_area_level_1|country`;
        const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (response.ok) {
          const geoData = await response.json();
          if (geoData.status === "OK" && Array.isArray(geoData.results) && geoData.results.length > 0) {
            let city = "";
            let country = "";

            const components = geoData.results[0].address_components || [];
            for (const comp of components) {
              const types = comp.types || [];
              if (types.includes("locality") || types.includes("sublocality") || types.includes("administrative_area_level_2")) {
                if (!city) city = comp.long_name || comp.short_name;
              }
              if (types.includes("country")) {
                country = comp.long_name || comp.short_name;
              }
            }

            if (!city && components.length > 0) {
              city = components[0].long_name || components[0].short_name;
            }

            const displayText = city && country ? `${city}, ${country}` : city || country || `${coarseLat}, ${coarseLng}`;

            return res.json({
              success: true,
              latitude: coarseLat,
              longitude: coarseLng,
              city: city || null,
              country: country || null,
              displayText,
              provider: "google_maps_geocoding",
            });
          }
        }
      } catch (geoErr) {
        console.warn("Google Maps Geocoding API notice:", geoErr);
      }
    }

    // Fallback: OpenStreetMap Nominatim reverse geocoding with coarse coordinates
    try {
      const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coarseLat}&lon=${coarseLng}&zoom=10`;
      const osmRes = await fetch(osmUrl, {
        headers: { "User-Agent": "Aurora-Journal/1.0 (Privacy-First Reflection App)" },
        signal: AbortSignal.timeout(3500),
      });

      if (osmRes.ok) {
        const osmData = await osmRes.json();
        const address = osmData.address || {};
        const city = address.city || address.town || address.village || address.county || address.state || null;
        const country = address.country || null;
        const displayText = city && country ? `${city}, ${country}` : city || country || `${coarseLat}°, ${coarseLng}°`;

        return res.json({
          success: true,
          latitude: coarseLat,
          longitude: coarseLng,
          city,
          country,
          displayText,
          provider: "nominatim_fallback",
        });
      }
    } catch {
      // ignore
    }

    // Minimal coarse coordinates fallback if external APIs are unreachable
    return res.json({
      success: true,
      latitude: coarseLat,
      longitude: coarseLng,
      city: null,
      country: null,
      displayText: `Location (${coarseLat}°, ${coarseLng}°)`,
      provider: "coarse_coordinates",
    });
  } catch (error: any) {
    console.error("Error in reverse-geocode:", error?.message || error);
    res.status(500).json({ error: "Failed to resolve reverse geocode." });
  }
});

/**
 * Live System Status & Model Fallback Ladder Inspection Endpoint
 */
app.get("/api/system-status", (_req, res) => {
  try {
    const ladderInfo = getModelLadderInfo();
    const systemInfo = {
      status: "operational",
      timestamp: new Date().toISOString(),
      serviceName: "aurora-private-reflection",
      cloudRunChallengeLabel: "dev-tutorial=cloud-run-ai-challenge",
      isolationModel: "owner-bound (/users/{userId}/...)",
      ...ladderInfo,
    };
    res.json(systemInfo);
  } catch (error: any) {
    console.error("Error retrieving system status:", error?.message || error);
    res.status(500).json({ error: "Failed to retrieve system status." });
  }
});

/**
 * Live Model Ladder Ping Test Endpoint
 */
app.get("/api/ping-ladder", async (_req, res) => {
  try {
    const result = await pingModelLadder();
    res.json(result);
  } catch (error: any) {
    console.error("Error pinging model ladder:", error?.message ? "AI Service Error" : "Unknown error");
    res.status(503).json({
      success: false,
      modelTested: "gemini-3.7-flash",
      latencyMs: 0,
      status: "AI service is temporarily unavailable. Please try again.",
    });
  }
});

// ----------------------------------------------------------------------------
// Vite & Static Asset Handling
// ----------------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Aurora server listening on port ${PORT}`);
  });
}

startServer();
