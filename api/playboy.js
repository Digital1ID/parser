// ===== CONFIG ช่องทั้งหมด =====
const CHANNELS = {
  playboy: "https://adult-tv-channels.com/tv/playboy.php",
  // เพิ่มช่องอื่นตรงนี้
  // hbo: "https://example.com/hbo.php",
};

// ===== CACHE MEMORY =====
const cacheStore = {};

// ===== HANDLER =====
export default async function handler(req, res) {
  try {
    const { name } = req.query;

    if (!name || !CHANNELS[name]) {
      return res.status(400).json({
        status: false,
        error: "Invalid or missing channel name"
      });
    }

    const now = Date.now();

    // ===== ใช้ cache ถ้ายังไม่หมด =====
    if (
      cacheStore[name] &&
      cacheStore[name].url &&
      now < cacheStore[name].expire
    ) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(200).json({
        status: true,
        signedUrl: cacheStore[name].url,
        cached: true
      });
    }

    // ===== ดึงหน้าเว็บต้นทาง =====
    const response = await fetch(CHANNELS[name], {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://adult-tv-channels.com/"
      },
      redirect: "follow"
    });

    const html = await response.text();

    const match = html.match(/https?:\/\/[^"' ]+\.m3u8[^"' ]*/i);

    if (!match) {
      return res.status(200).json({
        status: false,
        error: "signedUrl not found"
      });
    }

    const signedUrl = match[0];

    // ===== คำนวณ expiry จาก e= =====
    const eMatch = signedUrl.match(/[?&]e=(\d+)/);

    let expireTime;

    if (eMatch) {
      const expiryMs = Number(eMatch[1]) * 1000;
      expireTime = expiryMs - 45000; // เผื่อ 45 วิ
    } else {
      expireTime = now + 30000; // fallback 30 วิ
    }

    // เก็บ cache
    cacheStore[name] = {
      url: signedUrl,
      expire: expireTime
    };

    res.setHeader("Access-Control-Allow-Origin", "*");

    return res.status(200).json({
      status: true,
      signedUrl,
      cached: false
    });

  } catch (err) {
    return res.status(500).json({
      status: false,
      error: err.message
    });
  }
