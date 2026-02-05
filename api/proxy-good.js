// api/proxy.js
export default async function handler(req, res) {
  const target = req.query.url;
  if (!target) {
    res.status(400).json({ error: "Missing url parameter" });
    return;
  }

  try {
    const response = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": "https://anime-good.com/"
      }
    });

    if (!response.ok) {
      res.status(response.status).json({ error: "Failed to fetch target" });
      return;
    }

    const text = await response.text();

    // อนุญาตให้ frontend เรียกได้
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
