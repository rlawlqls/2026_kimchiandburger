// Vercel serverless function — Google Gemini proxy for vendor-question suggestions.
// The API key lives ONLY in the GEMINI_API_KEY environment variable; it never
// reaches the client bundle. Returns 503 (not an error) when unset, so the client
// can fall back to its static suggestion set.

const MODEL = "gemini-1.5-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    // Not configured yet — a normal state during development. Client uses fallback.
    res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    return;
  }

  const ctx = req.body?.context;
  if (!ctx || typeof ctx !== "object") {
    res.status(400).json({ error: "Body must be JSON: { context: {...} }" });
    return;
  }

  const prompt = buildPrompt(ctx);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
    const gRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
      }),
    });

    if (!gRes.ok) {
      const detail = await gRes.text();
      res.status(502).json({ error: `Gemini API ${gRes.status}`, detail });
      return;
    }

    const data = await gRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    const phrases = safeParsePhrases(text);
    res.status(200).json({ phrases });
  } catch (err) {
    res.status(502).json({ error: "Gemini request failed", detail: String(err) });
  }
}

function buildPrompt(ctx) {
  const dish = ctx.dish ?? {};
  const spice = typeof ctx.spiceTolerance === "number" ? ctx.spiceTolerance : 2;
  const allergies = Array.isArray(ctx.allergies) ? ctx.allergies : [];
  const qty = typeof ctx.qty === "number" ? ctx.qty : 1;

  return [
    "You are a Korean-language coach helping a foreign tourist talk to a vendor at a Korean traditional market (분식/street-food stall).",
    `The tourist is looking at this dish: ${dish.hangul ?? ""} (${dish.roman ?? ""}) — ${dish.meaning ?? ""}.`,
    `They want to order ${qty}. Their spice tolerance is ${spice}/4. They are avoiding these allergens: ${allergies.length ? allergies.join(", ") : "none"}.`,
    "Suggest 4-6 SHORT, practical questions or requests they would want to say to the vendor",
    "(e.g. asking price, spiciness, allergens, quantity, how to eat it, payment).",
    "Return ONLY a JSON array. Each element: { \"ko\": <Korean>, \"roman\": <romanization>, \"en\": <English>, \"intent\": <one-or-two-word tag> }.",
    "Keep Korean natural and polite (존댓말). No extra commentary.",
  ].join("\n");
}

function safeParsePhrases(text) {
  try {
    const parsed = JSON.parse(text);
    const arr = Array.isArray(parsed) ? parsed : parsed.phrases;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((p) => p && typeof p.ko === "string")
      .slice(0, 6)
      .map((p) => ({
        ko: String(p.ko),
        roman: String(p.roman ?? ""),
        en: String(p.en ?? ""),
        intent: String(p.intent ?? ""),
      }));
  } catch {
    return [];
  }
}
