// Vercel serverless function — Google Cloud Vision proxy (§3-1).
// The API key lives ONLY in the GCP_VISION_KEY environment variable;
// it never reaches the client bundle.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const key = process.env.GCP_VISION_KEY;
  if (!key) {
    res.status(503).json({ error: "GCP_VISION_KEY is not configured" });
    return;
  }

  const image = req.body?.image;
  if (typeof image !== "string" || image.length === 0) {
    res.status(400).json({ error: "Body must be JSON: { image: <base64> }" });
    return;
  }

  try {
    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: image },
              features: [{ type: "TEXT_DETECTION" }],
              imageContext: { languageHints: ["ko"] },
            },
          ],
        }),
      },
    );

    if (!visionRes.ok) {
      const detail = await visionRes.text();
      res.status(502).json({ error: `Vision API ${visionRes.status}`, detail });
      return;
    }

    const data = await visionRes.json();
    const annotations = data.responses?.[0]?.textAnnotations ?? [];

    // annotations[0] is the full text blob — skip it; the rest are word-level.
    const tokens = annotations.slice(1).map((a) => {
      const v = a.boundingPoly?.vertices ?? [];
      const xs = v.map((p) => p.x ?? 0);
      const ys = v.map((p) => p.y ?? 0);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      return {
        text: a.description ?? "",
        bbox: [x, y, Math.max(...xs) - x, Math.max(...ys) - y],
      };
    });

    res.status(200).json({ tokens });
  } catch (err) {
    res.status(502).json({ error: "Vision request failed", detail: String(err) });
  }
}
