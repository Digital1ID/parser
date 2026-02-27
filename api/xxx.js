export default async function handler(req, res) {
  try {
    const targetUrl = "https://full24th.com/dooball/?id=69a07c99c95d82cccf15f74c&id_league=6320c95ad3cc66f6af1b6d3b&ch=0";

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://full24th.com/"
      }
    });

    const html = await response.text();

    const posterMatch = html.match(/poster="([^"]+)"/);
    const m3u8Match = html.match(/source src="([^"]+\.m3u8[^"]*)"/);

    if (!m3u8Match) {
      return res.status(500).json({ status: false, error: "m3u8 not found" });
    }

    const streamUrl = m3u8Match[1];
    const poster = posterMatch ? posterMatch[1] : null;

    res.setHeader("Access-Control-Allow-Origin", "*");

    return res.status(200).json({
      status: true,
      poster,
      stream_url: streamUrl,
      proxy_stream: `${req.headers.origin}/api/proxy?url=${encodeURIComponent(streamUrl)}`
    });

  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
}